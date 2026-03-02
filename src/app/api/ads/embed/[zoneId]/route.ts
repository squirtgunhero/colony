import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "public, max-age=300",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  const { zoneId } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const script = `
(function() {
  var container = document.getElementById("colony-ad-${zoneId}");
  if (!container) return;

  var serveUrl = "${baseUrl}/api/ads/serve?zone=${zoneId}";

  fetch(serveUrl)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data.ok || !data.ad) {
        container.style.display = "none";
        return;
      }

      var ad = data.ad;

      container.style.cssText = "background:#1a1a1a;border-radius:8px;padding:12px;max-width:320px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box;";

      var html = '<a href="' + ad.click_url + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;display:block;">';

      if (ad.image_url) {
        html += '<img src="' + ad.image_url + '" style="width:100%;border-radius:6px;margin-bottom:8px;display:block;" alt="' + (ad.headline || 'Sponsored') + '" />';
      }

      if (ad.headline) {
        html += '<div style="color:#fff;font-size:14px;font-weight:600;margin-bottom:4px;">' + ad.headline + '</div>';
      }

      if (ad.body) {
        html += '<div style="color:#999;font-size:12px;margin-bottom:8px;line-height:1.4;">' + ad.body + '</div>';
      }

      if (ad.cta_text) {
        html += '<div style="background:#f59e0b;color:#000;font-size:12px;font-weight:600;padding:6px 12px;border-radius:4px;text-align:center;display:inline-block;">' + ad.cta_text + '</div>';
      }

      html += '</a>';
      html += '<div style="color:#555;font-size:9px;margin-top:6px;text-align:right;">Ad by Colony</div>';

      container.innerHTML = html;

      if (ad.impression_url) {
        var pixel = new Image();
        pixel.src = ad.impression_url;
        pixel.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
        container.appendChild(pixel);
      }
    })
    .catch(function() {
      container.style.display = "none";
    });
})();
`.trim();

  return new NextResponse(script, { headers: CORS_HEADERS });
}
