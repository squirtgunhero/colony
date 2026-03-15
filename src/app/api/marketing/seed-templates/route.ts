// ============================================================================
// POST /api/marketing/seed-templates — Seed system marketing templates
// One-time setup — creates default real estate templates
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

const SYSTEM_TEMPLATES = [
  // Social Posts
  {
    name: "New Listing Announcement",
    category: "social_post",
    subcategory: "new_listing",
    platform: "facebook",
    headline: "Just Listed! 🏡",
    body: "Exciting new listing alert! This beautiful [bedrooms]-bedroom, [bathrooms]-bathroom home in [neighborhood] just hit the market.\n\n✨ [Key Feature 1]\n✨ [Key Feature 2]\n✨ [Key Feature 3]\n\nPriced at $[price] — this one won't last long!\n\nDM me for a private showing or click the link in bio for more details.",
    ctaText: "Schedule a Showing →",
  },
  {
    name: "Open House Invitation",
    category: "social_post",
    subcategory: "open_house",
    platform: "facebook",
    headline: "You're Invited! 🏠 Open House This Weekend",
    body: "Come see this stunning home in person!\n\n📍 [Address]\n📅 [Date]\n⏰ [Time]\n\nThis [bedrooms]-bed, [bathrooms]-bath home features [key feature] and is located in the highly sought-after [neighborhood] area.\n\nNo appointment needed — just stop by! Refreshments will be served. 🍪☕\n\nBring your friends and family!",
    ctaText: "Add to Calendar",
  },
  {
    name: "Just Sold Celebration",
    category: "social_post",
    subcategory: "just_sold",
    platform: "facebook",
    headline: "SOLD! 🎉",
    body: "Another happy homeowner! So thrilled to have helped my clients find their dream home in [neighborhood].\n\nThis gorgeous property received [X] offers and sold in just [X] days!\n\nThinking of buying or selling? I'd love to help you achieve your real estate goals. Let's chat! 💬",
    ctaText: "Contact Me Today",
  },
  {
    name: "Market Update Post",
    category: "social_post",
    subcategory: "market_update",
    platform: "linkedin",
    headline: "Local Market Update — [Month] [Year]",
    body: "Here's what's happening in the [area] real estate market:\n\n📊 Median home price: $[price] ([up/down] [X]% from last month)\n📈 Homes sold: [X] ([up/down] [X]% YoY)\n⏱️ Average days on market: [X] days\n📉 Inventory: [X] months of supply\n\nWhat this means for you:\n• Buyers: [insight]\n• Sellers: [insight]\n\nHave questions about your home's value or the right time to make a move? I'm always happy to chat.",
    ctaText: "Get a Free Home Valuation",
  },
  {
    name: "Instagram Listing Post",
    category: "social_post",
    subcategory: "new_listing",
    platform: "instagram",
    headline: "Just Listed ✨",
    body: "Welcome to [address]! This stunning [bedrooms]-bed, [bathrooms]-bath home is everything you've been looking for.\n\nHighlights:\n🏡 [sqft] sq ft of living space\n🌳 Beautiful [feature — backyard/pool/deck]\n🍳 Gourmet kitchen with [feature]\n📍 Steps from [nearby attraction]\n\nListed at $[price]\n\nDM me for details or to schedule a private tour! Link in bio 👆",
    ctaText: null,
  },
  {
    name: "Client Testimonial Post",
    category: "social_post",
    subcategory: "testimonial",
    platform: "instagram",
    headline: null,
    body: "\"[Client quote about their experience working with you and how you helped them buy/sell their home.]\"\n\n— [Client First Name], [City]\n\nHelping my clients achieve their real estate dreams is what I love most about this job. Whether you're buying your first home or selling your forever home, I'm here to make the process smooth and stress-free.\n\nReady to start your journey? Let's talk! 💬\n\n#realestate #happyclient #testimonial #homebuyer #homeseller #realtor #[city]realestate",
    ctaText: null,
  },

  // Ad Copy
  {
    name: "Seller Lead Ad",
    category: "ad_copy",
    subcategory: "ad_copy",
    platform: "facebook",
    headline: "What's Your Home Really Worth?",
    body: "The market is moving fast in [city]. Homes in your neighborhood are selling for record prices — but only if they're priced right.\n\nGet a free, no-obligation home valuation from a local expert. Find out what buyers are willing to pay for your home today.",
    ctaText: "Get My Free Home Valuation",
  },
  {
    name: "Buyer Lead Ad",
    category: "ad_copy",
    subcategory: "ad_copy",
    platform: "facebook",
    headline: "Find Your Dream Home in [City]",
    body: "Looking for your perfect home? I have exclusive access to the latest listings in [city] — many before they hit the market.\n\nWhether you want a cozy starter home or a luxury estate, I'll help you find exactly what you're looking for at the right price.",
    ctaText: "Browse Homes Now",
  },

  // Email Templates
  {
    name: "New Listing Email",
    category: "email",
    subcategory: "new_listing",
    platform: "email",
    headline: "A New Home Just Hit the Market — You'll Love It!",
    body: "Hi [First Name],\n\nI wanted to give you a heads up about a gorgeous property that just became available in [neighborhood]. Based on what you've told me you're looking for, I think this could be a great fit.\n\nHere are the highlights:\n• [Bedrooms] bedrooms, [bathrooms] bathrooms\n• [sqft] square feet\n• [Key Feature 1]\n• [Key Feature 2]\n• Listed at $[price]\n\nWould you like to schedule a private showing? I can get you in as early as this week.\n\nLet me know what works for you!\n\nBest,\n[Your Name]",
    ctaText: "Schedule a Showing",
  },
  {
    name: "Market Update Newsletter",
    category: "email",
    subcategory: "market_update",
    platform: "email",
    headline: "Your [Month] Real Estate Market Report",
    body: "Hi [First Name],\n\nHere's your monthly snapshot of the [area] real estate market:\n\n📊 Key Stats:\n• Median Price: $[price] ([change]%)\n• Homes Sold: [count]\n• Avg Days on Market: [days]\n• New Listings: [count]\n\n🔍 What I'm Seeing:\n[2-3 sentences about current market conditions and trends]\n\n💡 My Take:\n[1-2 sentences with actionable advice]\n\nWhether you're thinking about buying, selling, or just curious about your home's value — I'm always here to help.\n\nBest,\n[Your Name]",
    ctaText: "Get Your Home's Value",
  },
];

export async function POST() {
  try {
    const userId = await requireUserId();

    // Check if templates already seeded
    const existing = await prisma.marketingTemplate.count({
      where: { userId, isSystem: true },
    });

    if (existing > 0) {
      return NextResponse.json({
        message: "Templates already seeded",
        count: existing,
      });
    }

    const created = await prisma.marketingTemplate.createMany({
      data: SYSTEM_TEMPLATES.map((t) => ({
        userId,
        name: t.name,
        category: t.category,
        subcategory: t.subcategory,
        platform: t.platform,
        headline: t.headline,
        body: t.body,
        ctaText: t.ctaText,
        isSystem: true,
      })),
    });

    return NextResponse.json({
      message: "Templates seeded successfully",
      count: created.count,
    });
  } catch (error) {
    console.error("Seed templates error:", error);
    return NextResponse.json({ error: "Failed to seed templates" }, { status: 500 });
  }
}
