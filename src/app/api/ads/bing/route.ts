import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    {
      status: "coming_soon",
      message:
        "Microsoft Ads integration is coming soon. Your campaign has been saved and will activate when the integration is live.",
    },
    { headers: CORS_HEADERS }
  );
}
