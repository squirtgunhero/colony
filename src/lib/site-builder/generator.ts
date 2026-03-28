import { AnthropicProvider, type LLMMessage } from "@/lam/llm";
import { prisma } from "@/lib/prisma";
import { loadSiteContext } from "./crm-data";
import { buildSystemPrompt, buildIterationContext } from "./prompts";

interface GenerateOptions {
  siteId: string;
  userId: string;
  prompt: string;
}

interface GenerateResult {
  html: string;
  revisionId: string;
  version: number;
  tokensUsed: number;
}

export async function generateSite(
  options: GenerateOptions
): Promise<GenerateResult> {
  const { siteId, userId, prompt } = options;

  // Load CRM context and existing site data in parallel
  const [context, site, previousRevisions] = await Promise.all([
    loadSiteContext(userId),
    prisma.landingPage.findUnique({
      where: { id: siteId },
      select: { htmlContent: true, prompt: true },
    }),
    prisma.siteRevision.findMany({
      where: { landingPageId: siteId },
      orderBy: { version: "desc" },
      take: 6,
      select: { prompt: true, htmlContent: true, version: true },
    }),
  ]);

  if (!site) {
    throw new Error("Site not found");
  }

  // Build message history for iteration
  const systemPrompt = buildSystemPrompt(context);
  const messages: LLMMessage[] = [{ role: "system", content: systemPrompt }];

  if (previousRevisions.length > 0) {
    // Build conversation from revision history (oldest first)
    const history = previousRevisions.reverse().map((rev) => [
      { role: "user" as const, content: rev.prompt },
      { role: "assistant" as const, content: rev.htmlContent },
    ]);
    const iterationMessages = buildIterationContext(
      site.htmlContent ?? "",
      history.flat()
    );
    for (const msg of iterationMessages) {
      messages.push(msg);
    }
  }

  // Add current prompt
  messages.push({ role: "user", content: prompt });

  // Call Claude
  const provider = new AnthropicProvider();
  const result = await provider.complete(messages, {
    maxTokens: 16384,
    temperature: 0.3,
  });

  // Extract HTML — strip markdown fences if present
  let html = result.content.trim();
  if (html.startsWith("```html")) html = html.slice(7);
  if (html.startsWith("```")) html = html.slice(3);
  if (html.endsWith("```")) html = html.slice(0, -3);
  html = html.trim();

  // Determine next version number
  const latestVersion = previousRevisions.length > 0
    ? Math.max(...previousRevisions.map((r) => r.version))
    : 0;
  const nextVersion = latestVersion + 1;

  // Save revision and update site in a transaction
  const revision = await prisma.$transaction(async (tx) => {
    const rev = await tx.siteRevision.create({
      data: {
        landingPageId: siteId,
        version: nextVersion,
        prompt,
        htmlContent: html,
        contentJson: {},
        tokensUsed: result.usage.totalTokens,
      },
    });

    await tx.landingPage.update({
      where: { id: siteId },
      data: {
        htmlContent: html,
        prompt,
        updatedAt: new Date(),
      },
    });

    return rev;
  });

  return {
    html,
    revisionId: revision.id,
    version: nextVersion,
    tokensUsed: result.usage.totalTokens,
  };
}
