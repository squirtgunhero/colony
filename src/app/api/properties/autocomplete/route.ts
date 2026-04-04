import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = "AIzaSyDUz1ye3oS-oExVT7oc9Ta1u9PcWBpg2ko";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input");

  if (!input) {
    return NextResponse.json(
      { predictions: [], error: "Missing input parameter" },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      input,
      types: "address",
      components: "country:us",
      key: GOOGLE_API_KEY,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { predictions: [], error: "Google Places API request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const predictions = (data.predictions ?? []).map(
      (p: { description: string; place_id: string }) => ({
        description: p.description,
        place_id: p.place_id,
      })
    );

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Google Places Autocomplete error:", error);
    return NextResponse.json(
      { predictions: [], error: "Internal server error" },
      { status: 500 }
    );
  }
}
