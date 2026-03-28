import { prisma } from "@/lib/prisma";

// GET /s/[slug] — serve published site as raw HTML
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const site = await prisma.landingPage.findFirst({
    where: { slug, status: "published" },
    select: { id: true, htmlContent: true, name: true },
  });

  if (!site || !site.htmlContent) {
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not Found</title></head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;color:#666;background:#f5f5f7"><p>This site doesn't exist or hasn't been published yet.</p></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Increment views (fire and forget)
  prisma.landingPage
    .update({ where: { id: site.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  return new Response(site.htmlContent, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}
