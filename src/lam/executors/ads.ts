// Ads Domain Executors — Meta/Facebook Ads, Honeycomb Campaigns
import { prisma } from "@/lib/prisma";
import { createMetaClient } from "@/lib/meta/client";
import { syncMetaAdAccount } from "@/lib/meta/sync";
import type { CreateAdSetParams } from "@/lib/meta/types";
import { getDefaultProvider } from "../llm";
import type { Action } from "../actionSchema";
import type { ActionExecutor } from "../types";
import { recordChange } from "../helpers";

export const adsExecutors: Record<string, ActionExecutor> = {
  "ads.check_performance": async (action, ctx) => {
    if (action.type !== "ads.check_performance") throw new Error("Invalid action type");

    const payload = action.payload as { campaign_name?: string };

    const metaData: { campaigns: unknown[]; weekly_totals: unknown; last_synced: unknown; account_name: unknown } | null = await (async () => {
      const adAccount = await prisma.metaAdAccount.findFirst({
        where: { userId: ctx.user_id, status: "active" },
      });
      if (!adAccount) return null;

      const whereClause: Record<string, unknown> = { adAccountId: adAccount.id };
      if (payload.campaign_name) {
        whereClause.name = { contains: payload.campaign_name, mode: "insensitive" };
      }

      const campaigns = await prisma.metaCampaign.findMany({
        where: whereClause,
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, name: true, objective: true, status: true, effectiveStatus: true, dailyBudget: true, impressions: true, clicks: true, spend: true, reach: true, conversions: true, updatedAt: true },
      });

      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const recentInsights = await prisma.metaInsight.findMany({
        where: { adAccountId: adAccount.id, date: { gte: last7Days } },
        orderBy: { date: "desc" },
        take: 30,
      });

      const weeklyTotals = recentInsights.reduce(
        (acc, i) => ({ impressions: acc.impressions + i.impressions, clicks: acc.clicks + i.clicks, spend: acc.spend + i.spend, conversions: acc.conversions + i.conversions }),
        { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
      );

      return { campaigns, weekly_totals: weeklyTotals, last_synced: adAccount.lastSyncedAt, account_name: adAccount.adAccountName };
    })();

    const honeycombWhere: Record<string, unknown> = { userId: ctx.user_id };
    if (payload.campaign_name) {
      honeycombWhere.name = { contains: payload.campaign_name, mode: "insensitive" };
    }

    const honeycombCampaigns = await prisma.honeycombCampaign.findMany({
      where: honeycombWhere,
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, name: true, channel: true, status: true, objective: true, dailyBudget: true, impressions: true, clicks: true, conversions: true, spend: true, updatedAt: true },
    });

    const campaignIds = honeycombCampaigns.map((c) => c.id);
    const nativeEvents = campaignIds.length > 0
      ? await prisma.adEvent.groupBy({
          by: ["campaignId", "eventType"],
          where: { campaignId: { in: campaignIds } },
          _count: true,
        })
      : [];

    const eventMap: Record<string, { impressions: number; clicks: number }> = {};
    for (const ev of nativeEvents) {
      if (!eventMap[ev.campaignId]) eventMap[ev.campaignId] = { impressions: 0, clicks: 0 };
      if (ev.eventType === "impression") eventMap[ev.campaignId].impressions += ev._count;
      else if (ev.eventType === "click") eventMap[ev.campaignId].clicks += ev._count;
    }

    const llmListings = await prisma.llmListing.findMany({
      where: { userId: ctx.user_id },
      select: { campaignId: true, businessName: true, impressions: true, clicks: true, serviceArea: true },
    });

    const llmMap = new Map(llmListings.map((l) => [l.campaignId, l]));

    const nativeAndLocalCampaigns = honeycombCampaigns
      .filter((c) => ["native", "local", "llm", "google", "bing"].includes(c.channel))
      .map((c) => {
        const events = eventMap[c.id];
        const listing = llmMap.get(c.id);
        return {
          id: c.id,
          name: c.name,
          channel: c.channel,
          status: c.status,
          objective: c.objective,
          dailyBudget: c.dailyBudget,
          impressions: (events?.impressions || 0) + (listing?.impressions || 0) + c.impressions,
          clicks: (events?.clicks || 0) + (listing?.clicks || 0) + c.clicks,
          conversions: c.conversions,
          updatedAt: c.updatedAt,
        };
      });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success" as const,
      data: {
        meta: metaData,
        honeycomb_campaigns: nativeAndLocalCampaigns,
        llm_listings: llmListings.map((l) => ({
          business_name: l.businessName,
          impressions: l.impressions,
          clicks: l.clicks,
          service_area: l.serviceArea,
        })),
      },
    };
  },

  "ads.create_campaign": async (action, ctx) => {
    if (action.type !== "ads.create_campaign") throw new Error("Invalid action type");

    const payload = action.payload as {
      channel?: string;
      objective?: string;
      daily_budget?: number;
      name?: string;
      business_name?: string;
      category?: string;
      description?: string;
      service_area?: string;
      phone?: string;
      website?: string;
      keywords?: string[];
      special_ad_category?: string;
      target_city?: string;
      target_radius?: number;
      lead_type?: string;
      listing_focus?: boolean;
      target_price_max?: number;
      target_price_min?: number;
      target_bedrooms_min?: number;
      // User-provided ad content (skips auto-generation when set)
      ad_headline?: string;
      ad_body?: string;
      ad_description?: string;
      image_prompt?: string;
    };

    const channel = payload.channel || "native";
    const dailyBudget = payload.daily_budget || 10;
    const campaignName = payload.name || `Tara Campaign - ${new Date().toLocaleDateString()}`;

    switch (channel) {
      case "meta": {
        const adAccount = await prisma.metaAdAccount.findFirst({
          where: { userId: ctx.user_id, status: "active" },
        });

        if (!adAccount) {
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "To run Facebook/Instagram ads, you'll need to connect your Meta account first. Go to Settings > Integrations > Connect Facebook. Once connected, I can create and manage your campaigns right from here.",
          };
        }

        if (adAccount.tokenExpiresAt && adAccount.tokenExpiresAt < new Date()) {
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "Your Facebook connection has expired. Go to Settings > Integrations and tap Reconnect, then come back and I'll set up your campaign.",
          };
        }

        const client = createMetaClient(adAccount.accessToken);

        const objectiveMap: Record<string, string> = {
          "LEADS": "OUTCOME_LEADS",
          "TRAFFIC": "OUTCOME_TRAFFIC",
          "AWARENESS": "OUTCOME_AWARENESS",
          "ENGAGEMENT": "OUTCOME_ENGAGEMENT",
          "SALES": "OUTCOME_SALES",
        };

        const objective = objectiveMap[payload.objective?.toUpperCase() || "LEADS"] || "OUTCOME_LEADS";
        const userObjective = payload.objective?.toUpperCase() || "LEADS";

        const profile = await prisma.profile.findUnique({
          where: { id: ctx.user_id },
          select: {
            businessType: true,
            fullName: true,
            avatarUrl: true,
            serviceAreaCity: true,
            serviceAreaRadius: true,
          },
        });

        // Use explicit special_ad_category from chat if provided, otherwise auto-detect from profile
        const explicitCategory = payload.special_ad_category?.toUpperCase();
        const isHousing = explicitCategory === "HOUSING" ||
          (!explicitCategory && (
            profile?.businessType?.toLowerCase().includes("real estate") ||
            profile?.businessType?.toLowerCase().includes("property") ||
            profile?.businessType?.toLowerCase().includes("mortgage")
          ));
        const isCredit = explicitCategory === "CREDIT";
        const isEmployment = explicitCategory === "EMPLOYMENT";
        const specialAdCategories = isHousing ? ["HOUSING"] :
          isCredit ? ["CREDIT"] :
          isEmployment ? ["EMPLOYMENT"] : [];

        try {
          // ---- Step 1: Create Campaign ----
          const campaignResult = await client.createCampaign(adAccount.adAccountId, {
            name: campaignName,
            objective,
            status: "PAUSED",
            special_ad_categories: specialAdCategories,
          });

          // Sync and find the local campaign record
          await syncMetaAdAccount(adAccount.id);
          const newCampaign = await prisma.metaCampaign.findFirst({
            where: { adAccountId: adAccount.id, metaCampaignId: campaignResult.id },
          });

          // ---- Step 2: Generate ad copy via LLM ----
          // Get user's location from their properties or profile metadata
          let userCity = "your city";
          let userState = "";

          // Query matching listings if this is a listing-focused ad
          interface MatchedListing {
            address: string;
            city: string;
            state: string | null;
            price: number;
            bedrooms: number | null;
            bathrooms: number | null;
            sqft: number | null;
            imageUrl: string | null;
          }
          let matchedListings: MatchedListing[] = [];

          if (payload.listing_focus) {
            // Build property filter based on city/price criteria
            const propertyWhere: Record<string, unknown> = { userId: ctx.user_id };

            const listingCity = payload.target_city || profile?.serviceAreaCity;
            if (listingCity) {
              propertyWhere.city = { contains: listingCity, mode: "insensitive" };
            }

            if (payload.target_price_max) {
              propertyWhere.price = { ...(propertyWhere.price as object || {}), lte: payload.target_price_max };
            }
            if (payload.target_price_min) {
              propertyWhere.price = { ...(propertyWhere.price as object || {}), gte: payload.target_price_min };
            }
            if (payload.target_bedrooms_min) {
              propertyWhere.bedrooms = { gte: payload.target_bedrooms_min };
            }

            // Only show active listings (listed or pre_listing)
            propertyWhere.status = { in: ["listed", "pre_listing"] };

            matchedListings = await prisma.property.findMany({
              where: propertyWhere,
              select: {
                address: true,
                city: true,
                state: true,
                price: true,
                bedrooms: true,
                bathrooms: true,
                sqft: true,
                imageUrl: true,
              },
              orderBy: { price: "asc" },
              take: 10,
            }) as MatchedListing[];
          }

          const userProperty = await prisma.property.findFirst({
            where: { userId: ctx.user_id },
            select: { city: true, state: true, imageUrl: true },
            orderBy: { updatedAt: "desc" },
          });

          if (payload.target_city) {
            userCity = payload.target_city;
          } else if (profile?.serviceAreaCity) {
            userCity = profile.serviceAreaCity;
          } else if (userProperty?.city) {
            userCity = userProperty.city;
            userState = userProperty.state || "";
          }

          const businessType = profile?.businessType || "business";

          let adCopy = { headline: campaignName, primary_text: `Discover ${businessType} services in ${userCity}`, description: "Learn more today" };

          // If user provided ALL ad copy fields, skip LLM generation entirely
          const hasUserCopy = !!(payload.ad_headline || payload.ad_body || payload.ad_description);
          if (hasUserCopy) {
            adCopy = {
              headline: (payload.ad_headline || adCopy.headline).slice(0, 40),
              primary_text: (payload.ad_body || adCopy.primary_text).slice(0, 125),
              description: (payload.ad_description || adCopy.description).slice(0, 30),
            };
            console.log("[ADS] Using user-provided ad copy:", adCopy.headline);
          }

          if (!hasUserCopy) try {
            const llm = getDefaultProvider();

            // Build a listing-aware prompt if we have matched listings
            let copyPrompt: string;
            if (payload.listing_focus && matchedListings.length > 0) {
              const listingSummary = matchedListings.slice(0, 5).map(l => {
                const parts = [`$${l.price.toLocaleString()}`];
                if (l.bedrooms) parts.push(`${l.bedrooms}bd`);
                if (l.bathrooms) parts.push(`${l.bathrooms}ba`);
                if (l.sqft) parts.push(`${l.sqft.toLocaleString()} sqft`);
                parts.push(l.address);
                return parts.join(" · ");
              }).join("\n");

              const priceLabel = payload.target_price_max
                ? `under $${payload.target_price_max.toLocaleString()}`
                : "";

              copyPrompt = `Write a Facebook ad promoting real estate listings in ${userCity}${userState ? `, ${userState}` : ""} ${priceLabel}. I have ${matchedListings.length} matching listings:\n${listingSummary}\n\nReturn JSON only with fields: headline (max 40 chars — mention the city and price range), primary_text (max 125 chars — highlight the # of listings available and the value), description (max 30 chars). Make it compelling for home buyers searching in this area and price range.`;
            } else if (payload.listing_focus) {
              // Listing focus but no matching properties found
              const priceLabel = payload.target_price_max
                ? ` under $${payload.target_price_max.toLocaleString()}`
                : "";
              copyPrompt = `Write a Facebook ad for a real estate agent promoting homes${priceLabel} in ${userCity}${userState ? `, ${userState}` : ""}. Return JSON only with fields: headline (max 40 chars — mention the city and price range), primary_text (max 125 chars — focus on helping buyers find homes in this price range), description (max 30 chars). Be specific and compelling.`;
            } else {
              copyPrompt = `Write a Facebook ad for a ${businessType} in ${userCity}${userState ? `, ${userState}` : ""}. Return JSON only with fields: headline (max 40 chars), primary_text (max 125 chars), description (max 30 chars). Be specific to the area and business type. No generic copy.`;
            }

            const copyResponse = await llm.complete([
              { role: "system", content: "You generate Facebook ad copy. Return JSON only, no markdown." },
              { role: "user", content: copyPrompt },
            ], { temperature: 0.7 });

            let jsonStr = copyResponse.content.trim();
            if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
            if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
            if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
            jsonStr = jsonStr.trim();
            const parsed = JSON.parse(jsonStr);
            adCopy = {
              headline: String(parsed.headline || adCopy.headline).slice(0, 40),
              primary_text: String(parsed.primary_text || adCopy.primary_text).slice(0, 125),
              description: String(parsed.description || adCopy.description).slice(0, 30),
            };
          } catch {
            // Fallback to defaults if LLM fails
            if (payload.listing_focus) {
              const priceLabel = payload.target_price_max ? ` Under $${(payload.target_price_max / 1000).toFixed(0)}K` : "";
              adCopy = {
                headline: `${userCity} Homes${priceLabel}`.slice(0, 40),
                primary_text: `Browse ${matchedListings.length || ""} available listings in ${userCity}${priceLabel}. Find your dream home today!`.slice(0, 125),
                description: "View listings now".slice(0, 30),
              };
            }
          }

          // ---- Step 3: Find image and upload ----
          let imageHash: string | null = null;
          // Use the first matched listing's image if available, otherwise fall back to any property
          const propertyImageUrl = (matchedListings.length > 0
            ? matchedListings.find(l => l.imageUrl)?.imageUrl
            : userProperty?.imageUrl) || null;

          // Priority: property photo > AI-generated image
          let imageSource = propertyImageUrl || null;
          console.log("[ADS] Property image URL:", imageSource || "none");

          // If no property image, generate one with DALL-E
          if (!imageSource && process.env.OPENAI_API_KEY) {
            try {
              console.log("[ADS] Generating image with DALL-E...");
              const { generateImage, buildAdImagePrompt } = await import("@/lib/image-gen");

              // Use user-provided image prompt if available, otherwise auto-generate
              let prompt: string;
              if (payload.image_prompt) {
                // User described what they want — use their prompt directly with some guardrails
                prompt = `Professional Facebook ad image: ${payload.image_prompt}. Photorealistic, high quality, no text overlays.`;
                console.log("[ADS] Using user-provided image prompt");
              } else {
                const imgType = payload.listing_focus ? "new_listing" : (payload.lead_type || "lead_generation");
                prompt = buildAdImagePrompt({
                  type: imgType,
                  city: userCity,
                  state: userState,
                  businessType,
                  propertyDetails: matchedListings.length > 0 ? {
                    bedrooms: matchedListings[0].bedrooms || undefined,
                    sqft: matchedListings[0].sqft || undefined,
                    price: matchedListings[0].price || undefined,
                  } : undefined,
                });
              }

              console.log("[ADS] DALL-E prompt:", prompt.slice(0, 100));
              const generated = await generateImage({ prompt, size: "1024x1024" });
              imageSource = generated.url;
              console.log("[ADS] DALL-E image generated:", imageSource?.slice(0, 80));
            } catch (imgGenErr) {
              console.error("[META ADS] DALL-E image generation failed:", imgGenErr instanceof Error ? imgGenErr.message : imgGenErr);
              // Continue without image
            }
          } else if (!process.env.OPENAI_API_KEY) {
            console.warn("[ADS] No OPENAI_API_KEY — skipping image generation");
          }

          if (imageSource) {
            try {
              console.log("[ADS] Uploading image to Meta...");
              const uploadResult = await client.uploadImage(adAccount.adAccountId, imageSource);
              imageHash = uploadResult.hash;
              console.log("[ADS] Image uploaded, hash:", imageHash);
            } catch (uploadErr) {
              console.error("[ADS] Image upload to Meta failed:", uploadErr instanceof Error ? uploadErr.message : uploadErr);
              // Continue without image — will create a link ad
            }
          }

          console.log("[ADS] Final imageHash:", imageHash || "none — ad will be created without image");

          // ---- Step 4: Create Ad Set with Advantage+ targeting ----
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);

          const optimizationGoal = userObjective === "LEADS" ? "LEAD_GENERATION" : "LINK_CLICKS";

          // Build targeting — use payload city > service area city > property city
          // Note: Advantage+ audience is NOT allowed for housing/credit/employment special ad categories
          const targeting: Record<string, unknown> = {};
          if (specialAdCategories.length === 0) {
            targeting.targeting_automation = { advantage_audience: 1 };
          }
          const targetCityName = payload.target_city || profile?.serviceAreaCity || userProperty?.city;
          const targetRadius = payload.target_radius || profile?.serviceAreaRadius || 25;
          if (targetCityName) {
            // Look up the Meta geo targeting key for the city (integer, not string)
            const cityResult = await client.searchCity(targetCityName);
            if (cityResult) {
              targeting.geo_locations = {
                cities: [{ key: cityResult.key, radius: targetRadius, distance_unit: "mile" }],
              };
            }

            // Save as the user's service area if they don't have one yet
            if (!profile?.serviceAreaCity) {
              await prisma.profile.update({
                where: { id: ctx.user_id },
                data: { serviceAreaCity: targetCityName, serviceAreaRadius: targetRadius },
              }).catch(() => {}); // non-critical
            }
          }

          // ---- Resolve Facebook Page ID + Page Access Token (needed for ad set + creative) ----
          let effectivePageId = (adAccount.metadata as Record<string, unknown>)?.pageId as string || "";
          let pageAccessToken = (adAccount.metadata as Record<string, unknown>)?.pageAccessToken as string || "";

          if (!effectivePageId || !pageAccessToken) {
            // Try to get pages from Meta API (includes page access tokens)
            try {
              const pagesRes = await client.getPages();
              if (pagesRes.length > 0) {
                effectivePageId = pagesRes[0].id;
                pageAccessToken = pagesRes[0].access_token || "";
                // Save for future use
                await prisma.metaAdAccount.update({
                  where: { id: adAccount.id },
                  data: {
                    metadata: {
                      ...(adAccount.metadata as Record<string, unknown> || {}),
                      pageId: effectivePageId,
                      pageAccessToken: pageAccessToken,
                    },
                  },
                }).catch(() => {});
              }
            } catch {
              // Can't get pages
            }
          }

          if (!effectivePageId) {
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: "A Facebook Page is required to create ads. Make sure you have a Facebook Page connected to your ad account, then try again.",
            };
          }

          console.log("[ADS] Using Facebook Page ID:", effectivePageId);

          const adSetResult = await client.createAdSet(adAccount.adAccountId, {
            name: `${campaignName} - Ad Set`,
            campaign_id: campaignResult.id,
            billing_event: "IMPRESSIONS",
            optimization_goal: optimizationGoal as "LEAD_GENERATION" | "LINK_CLICKS",
            daily_budget: dailyBudget * 100, // Convert dollars to cents
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            targeting: targeting as CreateAdSetParams["targeting"],
            start_time: tomorrow.toISOString(),
            status: "PAUSED",
            special_ad_categories: specialAdCategories,
            promoted_object: { page_id: effectivePageId },
          });

          // ---- Step 5: Create Ad Creative ----
          // Determine landing page URL — check for recently generated landing page first
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mycolonyhq.com";
          const isSellerAd = payload.lead_type?.toLowerCase().includes("seller") || false;

          let landingUrl = payload.website || "";
          if (!landingUrl) {
            // Check if a landing page was recently generated for this user (within last 5 min)
            const recentLandingPage = await prisma.landingPage.findFirst({
              where: {
                userId: ctx.user_id,
                status: "published",
                publishedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
              },
              orderBy: { publishedAt: "desc" },
              select: { slug: true },
            });

            if (recentLandingPage) {
              landingUrl = `${baseUrl}/s/${recentLandingPage.slug}`;
              console.log("[ADS] Using recently generated landing page:", landingUrl);
            } else {
              landingUrl = isSellerAd ? `${baseUrl}/valuation/${ctx.user_id}` : baseUrl;
            }
          }

          let creativeResult: { id: string };
          try {
            if (effectivePageId) {
              // Use a page-token-authenticated client for object_story_spec if available
              // This avoids permission errors when the user token lacks pages_manage_ads
              const creativeClient = pageAccessToken
                ? createMetaClient(pageAccessToken)
                : client;

              console.log("[ADS] Creating creative with", pageAccessToken ? "page token" : "user token");

              // Page-based creative (required for housing, preferred for all)
              try {
                creativeResult = await creativeClient.createAdCreative(adAccount.adAccountId, {
                  name: `${campaignName} - Creative`,
                  object_story_spec: {
                    page_id: effectivePageId,
                    link_data: {
                      ...(imageHash ? { image_hash: imageHash } : {}),
                      message: adCopy.primary_text,
                      link: landingUrl,
                      name: adCopy.headline,
                      description: adCopy.description,
                      call_to_action: { type: "LEARN_MORE" },
                    },
                  },
                });
              } catch (pageCreativeError) {
                const errMsg = pageCreativeError instanceof Error ? pageCreativeError.message : "";
                console.error("[ADS] Creative with object_story_spec failed:", errMsg);

                // Fall back to asset_feed_spec for non-housing ads
                if (specialAdCategories.length === 0) {
                  console.warn("[ADS] Falling back to asset_feed_spec");
                  creativeResult = await client.createAdCreative(adAccount.adAccountId, {
                    name: `${campaignName} - Creative`,
                    asset_feed_spec: {
                      bodies: [{ text: adCopy.primary_text }],
                      titles: [{ text: adCopy.headline }],
                      descriptions: [{ text: adCopy.description }],
                      ad_formats: ["SINGLE_IMAGE"],
                      call_to_action_types: ["LEARN_MORE"],
                      link_urls: [{ website_url: landingUrl }],
                    },
                    degrees_of_freedom_spec: {
                      creative_features_spec: {
                        standard_enhancements: { enroll_status: "OPT_IN" },
                      },
                    },
                  });
                } else {
                  // Housing ads require page creative — surface the actual Meta error
                  throw new Error(
                    `Ad creative failed: ${errMsg}. ` +
                    `Try reconnecting Facebook in Settings to refresh your Page permissions.`
                  );
                }
              }
            } else {
              // No page — use asset_feed_spec (non-housing only)
              creativeResult = await client.createAdCreative(adAccount.adAccountId, {
                name: `${campaignName} - Creative`,
                asset_feed_spec: {
                  bodies: [{ text: adCopy.primary_text }],
                  titles: [{ text: adCopy.headline }],
                  descriptions: [{ text: adCopy.description }],
                  ad_formats: ["SINGLE_IMAGE"],
                  call_to_action_types: ["LEARN_MORE"],
                  link_urls: [{ website_url: landingUrl }],
                },
                degrees_of_freedom_spec: {
                  creative_features_spec: {
                    standard_enhancements: { enroll_status: "OPT_IN" },
                  },
                },
              });
            }
          } catch (creativeError) {
            const msg = creativeError instanceof Error ? creativeError.message : "Unknown creative error";
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: `Campaign and ad set created, but ad creative failed: ${msg}`,
            };
          }

          // ---- Step 6: Create Ad ----
          let adResult: { id: string };
          try {
            adResult = await client.createAd(adAccount.adAccountId, {
              name: `${campaignName} - Ad`,
              adset_id: adSetResult.id,
              creative: { creative_id: creativeResult.id },
              status: "PAUSED",
            });
          } catch (adError) {
            const msg = adError instanceof Error ? adError.message : "Unknown ad error";
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: `Campaign, ad set, and creative created, but ad creation failed: ${msg}`,
            };
          }

          // ---- Step 7: Update local records ----
          // Also create a HoneycombCampaign record for unified tracking
          const honeycombCampaign = await prisma.honeycombCampaign.create({
            data: {
              userId: ctx.user_id,
              name: campaignName,
              channel: "meta",
              objective: userObjective.toLowerCase(),
              dailyBudget,
              status: "paused",
              metadata: {
                metaCampaignId: campaignResult.id,
                metaAdSetId: adSetResult.id,
                metaCreativeId: creativeResult.id,
                metaAdId: adResult.id,
                adCopy,
                imageHash,
                targetingCity: userCity,
              },
            },
          });

          await recordChange(ctx.run_id, action.action_id, "MetaCampaign", newCampaign?.id || campaignResult.id, "create", null, {
            metaCampaignId: campaignResult.id,
            metaAdSetId: adSetResult.id,
            metaCreativeId: creativeResult.id,
            metaAdId: adResult.id,
            honeycombCampaignId: honeycombCampaign.id,
            name: campaignName,
            objective,
            dailyBudget,
          });

          const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccount.adAccountId.replace("act_", "")}`;

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              channel: "meta",
              campaign_id: campaignResult.id,
              adset_id: adSetResult.id,
              creative_id: creativeResult.id,
              ad_id: adResult.id,
              honeycomb_campaign_id: honeycombCampaign.id,
              name: campaignName,
              objective: userObjective,
              daily_budget: dailyBudget,
              status: "PAUSED",
              ad_copy: adCopy,
              targeting_city: userCity,
              has_image: !!imageHash,
              image_url: imageSource || null,
              ads_manager_url: adsManagerUrl,
              listings_count: matchedListings.length,
              listings_matched: matchedListings.slice(0, 5).map(l => ({
                address: l.address,
                city: l.city,
                price: l.price,
                bedrooms: l.bedrooms,
              })),
              note: payload.listing_focus && matchedListings.length > 0
                ? `Your campaign is ready! Promoting ${matchedListings.length} listing${matchedListings.length !== 1 ? "s" : ""} in ${userCity}${payload.target_price_max ? ` under $${payload.target_price_max.toLocaleString()}` : ""}. Budget: $${dailyBudget}/day. Headline: "${adCopy.headline}". It's paused until you approve. Want me to take it live?`
                : `Your campaign is ready! Budget: $${dailyBudget}/day targeting the ${userCity} area. Headline: "${adCopy.headline}". It's paused until you approve. Want me to take it live?`,
              // Action card for chat UI rendering
              __action_card: {
                type: "campaign_created",
                data: {
                  name: campaignName,
                  budget: dailyBudget,
                  area: userCity,
                  objective: userObjective,
                  status: "PAUSED",
                  headline: adCopy.headline,
                  description: adCopy.primary_text,
                  targeting_summary: `${userCity}${payload.target_radius ? `, ${payload.target_radius} mi` : ""}`,
                  platform: "Facebook & Instagram",
                  business_name: profile?.fullName || payload.business_name || "Your Business",
                  business_initial: (profile?.fullName || payload.business_name || "C").charAt(0).toUpperCase(),
                  image_url: imageSource || null,
                },
              },
            },
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: `Failed to create campaign on Facebook: ${message}`,
          };
        }
      }

      case "native": {
        // "native" channel means the user asked generically (e.g. "I need leads").
        // We need an actual ad platform connected to run real ads.
        // Check for Meta account first — if connected, create on Meta instead.
        const nativeMetaAccount = await prisma.metaAdAccount.findFirst({
          where: { userId: ctx.user_id, status: "active" },
        });

        if (!nativeMetaAccount) {
          // No ad platform connected — tell the user to connect one
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "To run Facebook/Instagram ads, you'll need to connect your Meta account first. Go to Settings > Integrations > Connect Facebook. Once connected, I can create and manage your campaigns right from here.",
          };
        }

        if (nativeMetaAccount.tokenExpiresAt && nativeMetaAccount.tokenExpiresAt < new Date()) {
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: "Your Facebook connection has expired. Go to Settings > Integrations to reconnect, then I'll set up your campaign.",
          };
        }

        // Meta account is connected — redirect to the "meta" channel logic
        // by re-invoking with channel set to "meta"
        const metaAction = {
          ...action,
          payload: { ...(action.payload as Record<string, unknown>), channel: "meta" },
        } as Action;
        return adsExecutors["ads.create_campaign"](metaAction, ctx);
      }

      case "llm": {
        const campaign = await prisma.honeycombCampaign.create({
          data: {
            userId: ctx.user_id,
            name: campaignName,
            channel: "llm",
            objective: payload.objective?.toLowerCase() || "leads",
            dailyBudget,
            status: "active",
          },
        });

        const profile = await prisma.profile.findUnique({
          where: { id: ctx.user_id },
          select: { fullName: true, businessType: true },
        });

        const listing = await prisma.llmListing.create({
          data: {
            campaignId: campaign.id,
            userId: ctx.user_id,
            businessName: payload.business_name || profile?.fullName || "Business",
            category: payload.category || profile?.businessType || "other",
            description: payload.description || "",
            serviceArea: payload.service_area || "",
            phone: payload.phone,
            website: payload.website,
          },
        });

        await recordChange(ctx.run_id, action.action_id, "HoneycombCampaign", campaign.id, "create", null, { campaign, listing });

        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            channel: "llm",
            campaign_id: campaign.id,
            listing_id: listing.id,
            name: campaignName,
            business_name: listing.businessName,
            category: listing.category,
            service_area: listing.serviceArea,
            note: "LLM listing created. Your business will now appear in AI-powered recommendations and chatbot responses for your service area.",
          },
        };
      }

      case "google":
      case "bing": {
        const campaign = await prisma.honeycombCampaign.create({
          data: {
            userId: ctx.user_id,
            name: campaignName,
            channel,
            objective: payload.objective?.toLowerCase() || "leads",
            dailyBudget,
            status: "draft",
            metadata: payload.keywords ? { keywords: payload.keywords } : {},
          },
        });

        await recordChange(ctx.run_id, action.action_id, "HoneycombCampaign", campaign.id, "create", null, campaign);

        const platformName = channel === "google" ? "Google Ads" : "Microsoft Ads";
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            channel,
            campaign_id: campaign.id,
            name: campaignName,
            daily_budget: dailyBudget,
            status: "draft",
            note: `${platformName} integration is coming soon. Your campaign has been saved and will activate when the integration is live.`,
          },
        };
      }

      case "local": {
        const profile = await prisma.profile.findUnique({
          where: { id: ctx.user_id },
          select: { businessType: true },
        });

        const campaign = await prisma.honeycombCampaign.create({
          data: {
            userId: ctx.user_id,
            name: campaignName,
            channel: "local",
            objective: payload.objective?.toLowerCase() || "leads",
            dailyBudget,
            status: "active",
            metadata: {
              serviceArea: payload.service_area || "",
              category: payload.category || profile?.businessType || "other",
            },
          },
        });

        const myCategory = (payload.category || profile?.businessType || "other").toLowerCase().replace(/\s+/g, "_");
        const otherLocalCampaigns = await prisma.honeycombCampaign.findMany({
          where: { channel: "local", status: "active", userId: { not: ctx.user_id } },
          select: { userId: true, metadata: true },
          distinct: ["userId"],
        });

        let matchCount = 0;
        for (const other of otherLocalCampaigns) {
          const otherProfile = await prisma.profile.findUnique({
            where: { id: other.userId },
            select: { businessType: true },
          });
          const otherCategory = (otherProfile?.businessType || "other").toLowerCase().replace(/\s+/g, "_");
          if (otherCategory === myCategory) continue;

          const existing = await prisma.localExchangePair.findFirst({
            where: {
              OR: [
                { userAId: ctx.user_id, userBId: other.userId },
                { userAId: other.userId, userBId: ctx.user_id },
              ],
            },
          });
          if (existing) continue;

          await prisma.localExchangePair.create({
            data: {
              userAId: ctx.user_id,
              userBId: other.userId,
              userACategory: myCategory,
              userBCategory: otherCategory,
              status: "proposed",
            },
          });
          matchCount++;
        }

        await recordChange(ctx.run_id, action.action_id, "HoneycombCampaign", campaign.id, "create", null, campaign);

        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            channel: "local",
            campaign_id: campaign.id,
            name: campaignName,
            matches_found: matchCount,
            note: matchCount > 0
              ? `Local exchange campaign created! Found ${matchCount} potential business partner(s) for cross-promotion. They'll be notified to accept the exchange.`
              : "Local exchange campaign created. We'll match you with non-competing local businesses as they join the network.",
          },
        };
      }

      default:
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: `Unknown channel: ${channel}. Use: meta, native, llm, google, bing, or local.`,
        };
    }
  },

  "ads.pause_campaign": async (action, ctx) => {
    if (action.type !== "ads.pause_campaign") throw new Error("Invalid action type");

    const payload = action.payload as { campaign_name?: string };

    if (!payload.campaign_name) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Which campaign should I pause?",
      };
    }

    const adAccount = await prisma.metaAdAccount.findFirst({
      where: { userId: ctx.user_id, status: "active" },
    });

    if (!adAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No Facebook ad account connected.",
      };
    }

    const campaign = await prisma.metaCampaign.findFirst({
      where: {
        adAccountId: adAccount.id,
        name: { contains: payload.campaign_name, mode: "insensitive" },
        status: { not: "PAUSED" },
      },
    });

    if (!campaign) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Couldn't find an active campaign matching "${payload.campaign_name}".`,
      };
    }

    try {
      const client = createMetaClient(adAccount.accessToken);
      await client.updateCampaignStatus(campaign.metaCampaignId, "PAUSED");

      const before = { ...campaign };
      await prisma.metaCampaign.update({
        where: { id: campaign.id },
        data: { status: "PAUSED" },
      });

      await recordChange(
        ctx.run_id,
        action.action_id,
        "MetaCampaign",
        campaign.id,
        "update",
        before,
        { ...campaign, status: "PAUSED" }
      );

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          previous_status: campaign.status,
          new_status: "PAUSED",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to pause campaign: ${message}`,
      };
    }
  },

  "ads.resume_campaign": async (action, ctx) => {
    if (action.type !== "ads.resume_campaign") throw new Error("Invalid action type");

    const payload = action.payload as { campaign_name?: string };

    if (!payload.campaign_name) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Which campaign should I resume?",
      };
    }

    const adAccount = await prisma.metaAdAccount.findFirst({
      where: { userId: ctx.user_id, status: "active" },
    });

    if (!adAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No Facebook ad account connected.",
      };
    }

    const campaign = await prisma.metaCampaign.findFirst({
      where: {
        adAccountId: adAccount.id,
        name: { contains: payload.campaign_name, mode: "insensitive" },
        status: "PAUSED",
      },
    });

    if (!campaign) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Couldn't find a paused campaign matching "${payload.campaign_name}".`,
      };
    }

    try {
      const client = createMetaClient(adAccount.accessToken);
      await client.updateCampaignStatus(campaign.metaCampaignId, "ACTIVE");

      const before = { ...campaign };
      await prisma.metaCampaign.update({
        where: { id: campaign.id },
        data: { status: "ACTIVE" },
      });

      await recordChange(
        ctx.run_id,
        action.action_id,
        "MetaCampaign",
        campaign.id,
        "update",
        before,
        { ...campaign, status: "ACTIVE" }
      );

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          previous_status: "PAUSED",
          new_status: "ACTIVE",
          daily_budget: campaign.dailyBudget,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to resume campaign: ${message}`,
      };
    }
  },

  "ads.launch_campaign": async (action, ctx) => {
    if (action.type !== "ads.launch_campaign") throw new Error("Invalid action type");

    const payload = action.payload as { campaign_name: string };

    if (!payload.campaign_name) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Which campaign should I launch?",
      };
    }

    const adAccount = await prisma.metaAdAccount.findFirst({
      where: { userId: ctx.user_id, status: "active" },
    });

    if (!adAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No Facebook ad account connected.",
      };
    }

    // Find the campaign by name
    const campaign = await prisma.metaCampaign.findFirst({
      where: {
        adAccountId: adAccount.id,
        name: { contains: payload.campaign_name, mode: "insensitive" },
        status: "PAUSED",
      },
      include: {
        adSets: {
          include: {
            ads: true,
          },
        },
      },
    });

    if (!campaign) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Couldn't find a paused campaign matching "${payload.campaign_name}".`,
      };
    }

    // Verify it has an ad set and ad/creative attached
    const hasAdSet = campaign.adSets.length > 0;
    const hasAd = campaign.adSets.some((adSet) => adSet.ads.length > 0);

    if (!hasAdSet || !hasAd) {
      // Check HoneycombCampaign metadata for meta IDs (may not be synced yet)
      const honeycombCampaign = await prisma.honeycombCampaign.findFirst({
        where: {
          userId: ctx.user_id,
          channel: "meta",
          name: { contains: payload.campaign_name, mode: "insensitive" },
        },
      });
      const metadata = honeycombCampaign?.metadata as Record<string, unknown> | null;
      if (!metadata?.metaAdSetId || !metadata?.metaAdId) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "This campaign doesn't have a complete ad set and creative. Please create a full campaign first.",
        };
      }
    }

    try {
      const client = createMetaClient(adAccount.accessToken);
      await client.updateCampaignStatus(campaign.metaCampaignId, "ACTIVE");

      const before = { ...campaign, adSets: undefined };
      await prisma.metaCampaign.update({
        where: { id: campaign.id },
        data: { status: "ACTIVE" },
      });

      // Also update the HoneycombCampaign status
      await prisma.honeycombCampaign.updateMany({
        where: {
          userId: ctx.user_id,
          channel: "meta",
          name: { contains: payload.campaign_name, mode: "insensitive" },
          status: "paused",
        },
        data: { status: "active" },
      });

      await recordChange(
        ctx.run_id,
        action.action_id,
        "MetaCampaign",
        campaign.id,
        "update",
        before,
        { ...before, status: "ACTIVE" }
      );

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          previous_status: "PAUSED",
          new_status: "ACTIVE",
          daily_budget: campaign.dailyBudget,
          note: `Campaign "${campaign.name}" is now LIVE! It will start delivering ads and spending your budget. You can pause it anytime by saying "pause my campaign".`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to launch campaign: ${message}`,
      };
    }
  },

  "ads.analyze_performance": async (action, ctx) => {
    if (action.type !== "ads.analyze_performance") throw new Error("Invalid action type");

    const payload = action.payload as { date_range?: "7d" | "14d" | "30d" };
    const dateRange = payload.date_range || "7d";

    // Check for both Meta and Google accounts
    const [metaAccount, googleAccount] = await Promise.all([
      prisma.metaAdAccount.findFirst({
        where: { userId: ctx.user_id, status: "active" },
      }),
      prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      }),
    ]);

    if (!metaAccount && !googleAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No ad accounts connected. Go to Settings to connect a Facebook or Google Ads account.",
      };
    }

    interface CampaignAnalysis {
      campaign_id: string;
      campaign_name: string;
      platform: "meta" | "google";
      status: string;
      spend: number;
      impressions: number;
      clicks: number;
      ctr: number;
      leads: number;
      cost_per_lead: number | null;
      efficiency_score: number | null;
      flags: string[];
    }

    const analyses: CampaignAnalysis[] = [];
    let totalSpend = 0;
    let totalLeads = 0;
    const platformTotals: Record<string, { spend: number; leads: number; impressions: number; clicks: number }> = {};

    const datePresetMap: Record<string, string> = {
      "7d": "last_7d",
      "14d": "last_14d",
      "30d": "last_30d",
    };

    try {
      // ---- META DATA ----
      if (metaAccount) {
        const client = createMetaClient(metaAccount.accessToken);
        const [campaignsRes, insightsRes] = await Promise.all([
          client.getCampaigns(metaAccount.adAccountId),
          client.getInsightsByCampaign(metaAccount.adAccountId, {
            date_preset: datePresetMap[dateRange] as "last_7d" | "last_14d" | "last_30d",
          }),
        ]);

        const campaignMap = new Map(
          campaignsRes.data.map((c) => [c.id, { name: c.name, status: c.status, effective_status: c.effective_status }])
        );

        let metaSpend = 0, metaLeads = 0, metaImpressions = 0, metaClicks = 0;

        for (const insight of insightsRes.data) {
          const campaignId = insight.campaign_id || "";
          const campaign = campaignMap.get(campaignId);
          const spend = parseFloat(insight.spend || "0");
          const impressions = parseInt(insight.impressions || "0", 10);
          const clicks = parseInt(insight.clicks || "0", 10);
          const ctr = parseFloat(insight.ctr || "0");

          let leads = 0;
          if (insight.actions) {
            for (const a of insight.actions) {
              if (
                a.action_type === "lead" ||
                a.action_type === "offsite_conversion.fb_pixel_lead" ||
                a.action_type === "onsite_conversion.lead_grouped"
              ) {
                leads += parseInt(a.value, 10);
              }
            }
          }

          metaSpend += spend;
          metaLeads += leads;
          metaImpressions += impressions;
          metaClicks += clicks;
          totalSpend += spend;
          totalLeads += leads;

          analyses.push({
            campaign_id: campaignId,
            campaign_name: campaign?.name || insight.campaign_name || "Unknown",
            platform: "meta",
            status: campaign?.status || "UNKNOWN",
            spend,
            impressions,
            clicks,
            ctr,
            leads,
            cost_per_lead: leads > 0 ? spend / leads : null,
            efficiency_score: null,
            flags: [],
          });
        }

        platformTotals.meta = { spend: metaSpend, leads: metaLeads, impressions: metaImpressions, clicks: metaClicks };
      }

      // ---- GOOGLE DATA ----
      if (googleAccount) {
        const { GoogleAdsClient } = await import("@/lib/google-ads/client");
        const gClient = new GoogleAdsClient(googleAccount.refreshToken);
        const perfData = await gClient.getCampaignPerformance(googleAccount.customerId, dateRange);

        // Aggregate by campaign (rows are per-day)
        const googleCampaigns = new Map<string, {
          name: string; status: string; spend: number; impressions: number; clicks: number; conversions: number;
        }>();

        for (const row of perfData) {
          const existing = googleCampaigns.get(row.campaignId);
          if (existing) {
            existing.spend += row.costMicros / 1_000_000;
            existing.impressions += row.impressions;
            existing.clicks += row.clicks;
            existing.conversions += row.conversions;
          } else {
            googleCampaigns.set(row.campaignId, {
              name: row.campaignName,
              status: row.status,
              spend: row.costMicros / 1_000_000,
              impressions: row.impressions,
              clicks: row.clicks,
              conversions: row.conversions,
            });
          }
        }

        let googleSpend = 0, googleLeads = 0, googleImpressions = 0, googleClicks = 0;

        for (const [campaignId, data] of googleCampaigns) {
          googleSpend += data.spend;
          googleLeads += data.conversions;
          googleImpressions += data.impressions;
          googleClicks += data.clicks;
          totalSpend += data.spend;
          totalLeads += data.conversions;

          analyses.push({
            campaign_id: campaignId,
            campaign_name: data.name,
            platform: "google",
            status: data.status,
            spend: data.spend,
            impressions: data.impressions,
            clicks: data.clicks,
            ctr: data.impressions > 0 ? data.clicks / data.impressions : 0,
            leads: data.conversions,
            cost_per_lead: data.conversions > 0 ? data.spend / data.conversions : null,
            efficiency_score: null,
            flags: [],
          });
        }

        platformTotals.google = { spend: googleSpend, leads: googleLeads, impressions: googleImpressions, clicks: googleClicks };
      }

      // Calculate account average CPL
      const averageCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;

      // Score and flag each campaign
      let wasteTotal = 0;
      let topPerformer: { name: string; cpl: number; platform: string } | null = null;

      for (const a of analyses) {
        if (a.leads > 0 && a.cost_per_lead !== null && averageCPL > 0) {
          a.efficiency_score = Math.max(0, Math.min(100, Math.round(100 - (a.cost_per_lead / averageCPL * 100) + 100)));
        }

        if (a.spend > 50 && a.leads === 0) {
          a.flags.push("waste");
          wasteTotal += a.spend;
        }

        if (a.cost_per_lead !== null && averageCPL > 0 && a.cost_per_lead > averageCPL * 2) {
          a.flags.push("underperforming");
        }

        if (a.cost_per_lead !== null && (topPerformer === null || a.cost_per_lead < topPerformer.cpl)) {
          topPerformer = { name: a.campaign_name, cpl: a.cost_per_lead, platform: a.platform };
        }
      }

      analyses.sort((a, b) => {
        if (a.efficiency_score === null && b.efficiency_score === null) return 0;
        if (a.efficiency_score === null) return 1;
        if (b.efficiency_score === null) return -1;
        return b.efficiency_score - a.efficiency_score;
      });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          date_range: dateRange,
          platforms_connected: [
            ...(metaAccount ? ["meta"] : []),
            ...(googleAccount ? ["google"] : []),
          ],
          total_spend: Math.round(totalSpend * 100) / 100,
          total_leads: totalLeads,
          average_cpl: averageCPL > 0 ? Math.round(averageCPL * 100) / 100 : null,
          waste_total: Math.round(wasteTotal * 100) / 100,
          top_performer: topPerformer ? { name: topPerformer.name, cpl: Math.round(topPerformer.cpl * 100) / 100, platform: topPerformer.platform } : null,
          platform_breakdown: platformTotals,
          campaigns: analyses,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to analyze performance: ${message}`,
      };
    }
  },

  "ads.suggest_optimizations": async (action, ctx) => {
    if (action.type !== "ads.suggest_optimizations") throw new Error("Invalid action type");

    const payload = action.payload as { date_range?: "7d" | "14d" | "30d" };
    const dateRange = payload.date_range || "7d";

    // Check for both Meta and Google accounts
    const [metaAccount, googleAccount] = await Promise.all([
      prisma.metaAdAccount.findFirst({
        where: { userId: ctx.user_id, status: "active" },
      }),
      prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      }),
    ]);

    if (!metaAccount && !googleAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No ad accounts connected. Go to Settings to connect a Facebook or Google Ads account.",
      };
    }

    const datePresetMap: Record<string, string> = {
      "7d": "last_7d",
      "14d": "last_14d",
      "30d": "last_30d",
    };

    try {
      let totalSpend = 0;
      let totalLeads = 0;

      const campaignData: Array<{
        name: string;
        platform: "meta" | "google";
        status: string;
        daily_budget: string | null;
        spend: number;
        impressions: number;
        clicks: number;
        leads: number;
        cost_per_lead: number | null;
      }> = [];

      // ---- META DATA ----
      if (metaAccount) {
        const client = createMetaClient(metaAccount.accessToken);
        const [campaignsRes, insightsRes] = await Promise.all([
          client.getCampaigns(metaAccount.adAccountId),
          client.getInsightsByCampaign(metaAccount.adAccountId, {
            date_preset: datePresetMap[dateRange] as "last_7d" | "last_14d" | "last_30d",
          }),
        ]);

        const campaignMap = new Map(
          campaignsRes.data.map((c) => [c.id, { name: c.name, status: c.status, daily_budget: c.daily_budget }])
        );

        for (const insight of insightsRes.data) {
          const campaignId = insight.campaign_id || "";
          const campaign = campaignMap.get(campaignId);
          const spend = parseFloat(insight.spend || "0");
          const impressions = parseInt(insight.impressions || "0", 10);
          const clicks = parseInt(insight.clicks || "0", 10);

          let leads = 0;
          if (insight.actions) {
            for (const a of insight.actions) {
              if (
                a.action_type === "lead" ||
                a.action_type === "offsite_conversion.fb_pixel_lead" ||
                a.action_type === "onsite_conversion.lead_grouped"
              ) {
                leads += parseInt(a.value, 10);
              }
            }
          }

          totalSpend += spend;
          totalLeads += leads;

          campaignData.push({
            name: campaign?.name || insight.campaign_name || "Unknown",
            platform: "meta",
            status: campaign?.status || "UNKNOWN",
            daily_budget: campaign?.daily_budget || null,
            spend,
            impressions,
            clicks,
            leads,
            cost_per_lead: leads > 0 ? Math.round((spend / leads) * 100) / 100 : null,
          });
        }
      }

      // ---- GOOGLE DATA ----
      if (googleAccount) {
        const { GoogleAdsClient } = await import("@/lib/google-ads/client");
        const gClient = new GoogleAdsClient(googleAccount.refreshToken);
        const perfData = await gClient.getCampaignPerformance(googleAccount.customerId, dateRange);

        // Also get campaign list for budget info
        const gCampaigns = await gClient.getCampaigns(googleAccount.customerId);
        const budgetMap = new Map(
          gCampaigns.map((c) => [c.id, c.budgetAmountMicros])
        );

        // Aggregate by campaign (rows are per-day)
        const googleCampaigns = new Map<string, {
          name: string; status: string; spend: number; impressions: number; clicks: number; conversions: number;
        }>();

        for (const row of perfData) {
          const existing = googleCampaigns.get(row.campaignId);
          if (existing) {
            existing.spend += row.costMicros / 1_000_000;
            existing.impressions += row.impressions;
            existing.clicks += row.clicks;
            existing.conversions += row.conversions;
          } else {
            googleCampaigns.set(row.campaignId, {
              name: row.campaignName,
              status: row.status,
              spend: row.costMicros / 1_000_000,
              impressions: row.impressions,
              clicks: row.clicks,
              conversions: row.conversions,
            });
          }
        }

        for (const [campaignId, data] of googleCampaigns) {
          totalSpend += data.spend;
          totalLeads += data.conversions;

          const budgetMicros = budgetMap.get(campaignId);
          const dailyBudget = budgetMicros ? String(parseInt(budgetMicros) / 1_000_000) : null;

          campaignData.push({
            name: data.name,
            platform: "google",
            status: data.status,
            daily_budget: dailyBudget,
            spend: data.spend,
            impressions: data.impressions,
            clicks: data.clicks,
            leads: data.conversions,
            cost_per_lead: data.conversions > 0 ? Math.round((data.spend / data.conversions) * 100) / 100 : null,
          });
        }
      }

      const averageCPL = totalLeads > 0 ? Math.round((totalSpend / totalLeads) * 100) / 100 : 0;

      // Ask Claude for suggestions
      const llm = getDefaultProvider();
      const platformNote = metaAccount && googleAccount
        ? "This business runs ads on BOTH Meta (Facebook/Instagram) and Google Ads. Consider cross-platform budget allocation in your suggestions."
        : "";

      const analysisPrompt = `Campaign performance data (${dateRange} window):
Account average CPL: ${averageCPL > 0 ? `$${averageCPL}` : "N/A (no leads yet)"}
Total spend: $${Math.round(totalSpend * 100) / 100}
Total leads: ${totalLeads}
${platformNote}

Campaigns:
${JSON.stringify(campaignData, null, 2)}`;

      const suggestionsResponse = await llm.complete([
        {
          role: "system",
          content: `You are a senior paid media strategist reviewing ad campaign performance for a small business. Analyze this data and return exactly 3-5 specific, actionable suggestions. Each suggestion should be a JSON object with:
- action: one of 'pause', 'increase_budget', 'decrease_budget', 'keep', 'add_negatives'
- campaign_name: which campaign
- platform: 'meta' or 'google'
- reason: 1 sentence explaining why
- expected_impact: 1 sentence on what this will achieve
- priority: 'high', 'medium', or 'low'

Rules:
- If a campaign has zero leads and spend > $50, ALWAYS suggest pausing it (high priority)
- If a campaign's CPL is 3x+ the average, suggest decreasing budget or pausing
- If a campaign's CPL is below average and has headroom, suggest increasing budget
- If both Meta and Google are present, compare cross-platform CPL and suggest shifting budget from the worse-performing platform to the better one
- Be specific with numbers. Say 'increase budget from $15/day to $25/day', not 'increase budget'
- Return ONLY a JSON array, no other text.`,
        },
        { role: "user", content: analysisPrompt },
      ], { temperature: 0.3 });

      // Parse LLM suggestions
      let suggestions: Array<{
        action: string;
        campaign_name: string;
        platform?: string;
        reason: string;
        expected_impact: string;
        priority: string;
      }> = [];

      try {
        let jsonStr = suggestionsResponse.content.trim();
        if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
        if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
        if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
        jsonStr = jsonStr.trim();
        suggestions = JSON.parse(jsonStr);
      } catch {
        // Fallback: generate basic suggestions programmatically
        for (const c of campaignData) {
          if (c.spend > 50 && c.leads === 0) {
            suggestions.push({
              action: "pause",
              campaign_name: c.name,
              platform: c.platform,
              reason: `Spent $${c.spend} with zero leads in the last ${dateRange}.`,
              expected_impact: `Save $${c.daily_budget ? parseFloat(c.daily_budget) : Math.round(c.spend / 7)}/day in wasted spend.`,
              priority: "high",
            });
          }
        }
      }

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          date_range: dateRange,
          platforms_connected: [
            ...(metaAccount ? ["meta"] : []),
            ...(googleAccount ? ["google"] : []),
          ],
          total_spend: Math.round(totalSpend * 100) / 100,
          total_leads: totalLeads,
          average_cpl: averageCPL > 0 ? averageCPL : null,
          suggestions,
          campaign_count: campaignData.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to generate optimization suggestions: ${message}`,
      };
    }
  },

  "ads.apply_optimization": async (action, ctx) => {
    if (action.type !== "ads.apply_optimization") throw new Error("Invalid action type");

    const payload = action.payload as {
      campaign_name: string;
      action: "pause" | "resume" | "increase_budget" | "decrease_budget";
      new_budget?: number;
    };

    if (!payload.campaign_name) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Campaign name is required.",
      };
    }

    const adAccount = await prisma.metaAdAccount.findFirst({
      where: { userId: ctx.user_id, status: "active" },
    });

    if (!adAccount) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "No Facebook ad account connected.",
      };
    }

    const campaign = await prisma.metaCampaign.findFirst({
      where: {
        adAccountId: adAccount.id,
        name: { contains: payload.campaign_name, mode: "insensitive" },
      },
    });

    if (!campaign) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Couldn't find a campaign matching "${payload.campaign_name}".`,
      };
    }

    const metaClient = createMetaClient(adAccount.accessToken);

    try {
      const before = { ...campaign };

      switch (payload.action) {
        case "pause": {
          await metaClient.updateCampaignStatus(campaign.metaCampaignId, "PAUSED");
          await prisma.metaCampaign.update({
            where: { id: campaign.id },
            data: { status: "PAUSED" },
          });

          await recordChange(ctx.run_id, action.action_id, "MetaCampaign", campaign.id, "update", before, { ...before, status: "PAUSED" });

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              campaign_name: campaign.name,
              optimization: "pause",
              previous_status: campaign.status,
              new_status: "PAUSED",
              note: `Paused "${campaign.name}" to stop wasted spend.`,
            },
          };
        }

        case "resume": {
          await metaClient.updateCampaignStatus(campaign.metaCampaignId, "ACTIVE");
          await prisma.metaCampaign.update({
            where: { id: campaign.id },
            data: { status: "ACTIVE" },
          });

          await recordChange(ctx.run_id, action.action_id, "MetaCampaign", campaign.id, "update", before, { ...before, status: "ACTIVE" });

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              campaign_name: campaign.name,
              optimization: "resume",
              previous_status: campaign.status,
              new_status: "ACTIVE",
              note: `Resumed "${campaign.name}".`,
            },
          };
        }

        case "increase_budget":
        case "decrease_budget": {
          if (!payload.new_budget) {
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: "new_budget is required for budget changes.",
            };
          }

          // Find the campaign's ad sets
          const adSets = await metaClient.getCampaignAdSets(campaign.metaCampaignId);
          if (adSets.data.length === 0) {
            return {
              action_id: action.action_id,
              action_type: action.type,
              status: "failed" as const,
              error: "Campaign has no ad sets to adjust budget on.",
            };
          }

          const newBudgetCents = Math.round(payload.new_budget * 100);
          const previousBudget = campaign.dailyBudget;

          // Update all ad sets for this campaign
          for (const adSet of adSets.data) {
            await metaClient.updateAdSet(adSet.id, { daily_budget: newBudgetCents });
          }

          // Update local record
          await prisma.metaCampaign.update({
            where: { id: campaign.id },
            data: { dailyBudget: payload.new_budget },
          });

          await recordChange(ctx.run_id, action.action_id, "MetaCampaign", campaign.id, "update", before, { ...before, dailyBudget: payload.new_budget });

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              campaign_name: campaign.name,
              optimization: payload.action,
              previous_budget: previousBudget,
              new_budget: payload.new_budget,
              ad_sets_updated: adSets.data.length,
              note: `Updated "${campaign.name}" budget from $${previousBudget || "?"}/day to $${payload.new_budget}/day.`,
            },
          };
        }

        default:
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed" as const,
            error: `Unknown optimization action: ${payload.action}`,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to apply optimization: ${message}`,
      };
    }
  },

  // ============================================================================
  // Competitor Research via Ad Library
  // ============================================================================

  "ads.research_competitors": async (action, ctx) => {
    if (action.type !== "ads.research_competitors") throw new Error("Invalid action type");

    try {
      const { createAdLibraryClient } = await import("@/lib/meta/adLibrary");
      const adLibrary = createAdLibraryClient();
      const payload = action.payload;

      const ads = await adLibrary.searchByKeyword(payload.search_term, {
        ad_reached_countries: [payload.country || "US"],
        ad_active_status: payload.active_only ? "ACTIVE" : "ALL",
        limit: payload.limit || 25,
      });

      if (ads.length === 0) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            search_term: payload.search_term,
            ads_found: 0,
            analysis: `No ads found for "${payload.search_term}" in the Meta Ad Library. This could mean competitors aren't running Meta ads, or try different search terms.`,
          },
        };
      }

      // Aggregate competitor data
      const competitorMap: Record<string, {
        page_name: string;
        page_id: string;
        ad_count: number;
        platforms: Set<string>;
        sample_headlines: string[];
        sample_bodies: string[];
        estimated_spend_low: number;
        estimated_spend_high: number;
      }> = {};

      for (const ad of ads) {
        const pageId = ad.page_id || "unknown";
        const pageName = ad.page_name || "Unknown Advertiser";

        if (!competitorMap[pageId]) {
          competitorMap[pageId] = {
            page_name: pageName,
            page_id: pageId,
            ad_count: 0,
            platforms: new Set(),
            sample_headlines: [],
            sample_bodies: [],
            estimated_spend_low: 0,
            estimated_spend_high: 0,
          };
        }

        const competitor = competitorMap[pageId];
        competitor.ad_count++;

        if (ad.publisher_platforms) {
          for (const p of ad.publisher_platforms) competitor.platforms.add(p);
        }
        if (ad.ad_creative_link_titles && competitor.sample_headlines.length < 3) {
          competitor.sample_headlines.push(...ad.ad_creative_link_titles.slice(0, 1));
        }
        if (ad.ad_creative_bodies && competitor.sample_bodies.length < 3) {
          competitor.sample_bodies.push(...ad.ad_creative_bodies.slice(0, 1));
        }
        if (ad.spend) {
          competitor.estimated_spend_low += ad.spend.lower_bound || 0;
          competitor.estimated_spend_high += ad.spend.upper_bound || 0;
        }
      }

      // Build competitor summaries
      const competitors = Object.values(competitorMap)
        .sort((a, b) => b.ad_count - a.ad_count)
        .slice(0, 10)
        .map((c) => ({
          page_name: c.page_name,
          page_id: c.page_id,
          active_ads: c.ad_count,
          platforms: Array.from(c.platforms),
          sample_headlines: c.sample_headlines.slice(0, 3),
          sample_bodies: c.sample_bodies.slice(0, 2),
          estimated_spend: c.estimated_spend_high > 0
            ? `$${c.estimated_spend_low} - $${c.estimated_spend_high}`
            : "Unknown",
        }));

      // Use LLM for competitive analysis
      const llm = getDefaultProvider();
      const analysisPrompt = `You are a competitive intelligence analyst for digital advertising. Analyze these competitor ads found in the Meta Ad Library for the search term "${payload.search_term}".

Competitor Data:
${JSON.stringify(competitors, null, 2)}

Provide a concise competitive analysis covering:
1. Key competitors and their ad volume
2. Common messaging themes and angles
3. Platforms being used (Facebook, Instagram, etc.)
4. Spend patterns (if data available)
5. Gaps or opportunities — what angles are competitors NOT using that could work?
6. Actionable recommendations for how to differentiate

Keep it practical and actionable. Format as plain text, not markdown.`;

      const analysisResponse = await llm.complete([
        { role: "system", content: "You are a competitive intelligence analyst for digital advertising. Provide concise, actionable analysis." },
        { role: "user", content: analysisPrompt },
      ]);

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          search_term: payload.search_term,
          country: payload.country || "US",
          ads_found: ads.length,
          unique_advertisers: Object.keys(competitorMap).length,
          top_competitors: competitors,
          analysis: analysisResponse.content,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Competitor research failed: ${message}`,
      };
    }
  },

  "ads.watch_competitor": async (action, ctx) => {
    if (action.type !== "ads.watch_competitor") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      // Check if already watching this page
      const existing = await prisma.competitorWatch.findUnique({
        where: {
          userId_pageId: {
            userId: ctx.user_id,
            pageId: payload.page_id,
          },
        },
      });

      if (existing) {
        // Reactivate if inactive
        if (!existing.active) {
          await prisma.competitorWatch.update({
            where: { id: existing.id },
            data: { active: true, notes: payload.notes || existing.notes },
          });

          await recordChange(ctx.run_id, action.action_id, "CompetitorWatch", existing.id, "update", { active: false }, { active: true });

          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "success" as const,
            data: {
              watch_id: existing.id,
              page_name: payload.page_name,
              page_id: payload.page_id,
              reactivated: true,
              note: `Reactivated competitor watch for "${payload.page_name}".`,
            },
          };
        }

        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            watch_id: existing.id,
            page_name: payload.page_name,
            page_id: payload.page_id,
            already_watching: true,
            note: `Already watching "${payload.page_name}".`,
          },
        };
      }

      // Do initial search to get current ad count
      let initialAdCount = 0;
      try {
        const { createAdLibraryClient } = await import("@/lib/meta/adLibrary");
        const adLibrary = createAdLibraryClient();
        const ads = await adLibrary.searchByPage(payload.page_id, { ad_active_status: "ACTIVE" });
        initialAdCount = ads.length;
      } catch {
        // Ad library search is optional, don't fail the watch
      }

      // Create the watch record
      const watch = await prisma.competitorWatch.create({
        data: {
          userId: ctx.user_id,
          pageId: payload.page_id,
          pageName: payload.page_name,
          notes: payload.notes,
          lastCheckedAt: new Date(),
          lastAdCount: initialAdCount,
        },
      });

      await recordChange(ctx.run_id, action.action_id, "CompetitorWatch", watch.id, "create", null, watch);

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          watch_id: watch.id,
          page_name: payload.page_name,
          page_id: payload.page_id,
          current_active_ads: initialAdCount,
          note: `Now watching "${payload.page_name}" (${initialAdCount} active ads). You'll be able to track changes in their ad strategy.`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to set up competitor watch: ${message}`,
      };
    }
  },
};
