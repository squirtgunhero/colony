// ============================================================================
// Agent Tool Definitions: External Search & Research
// Maps to: searchMLSListings, getPropertyValuation, webSearchMarketData
// ============================================================================

export const searchTools = [
  {
    type: "custom" as const,
    name: "search_mls_listings",
    description:
      "Search MLS listings via the Spark API. Returns active listings matching the criteria — address, price range, bedrooms, bathrooms, square footage, and listing details. Use this when the user asks about available properties, listings in an area, or wants to find homes for a buyer.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Free-text search (address, neighborhood, city)",
        },
        minPrice: { type: "number", description: "Minimum list price" },
        maxPrice: { type: "number", description: "Maximum list price" },
        minBeds: { type: "integer", description: "Minimum bedrooms" },
        maxBeds: { type: "integer", description: "Maximum bedrooms" },
        minBaths: { type: "integer", description: "Minimum bathrooms" },
        minSqft: { type: "integer", description: "Minimum square footage" },
        propertyType: {
          type: "string",
          enum: ["single_family", "condo", "townhouse", "multi_family", "land"],
          description: "Property type filter",
        },
        limit: {
          type: "integer",
          description: "Max results (default 10, max 25)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    type: "custom" as const,
    name: "get_property_valuation",
    description:
      "Get an automated valuation model (AVM) estimate for a property. Returns estimated value, confidence range, recent comparable sales, and valuation methodology. Use this when the user asks 'what's this property worth?', needs a CMA, or wants price guidance.",
    input_schema: {
      type: "object" as const,
      properties: {
        address: {
          type: "string",
          description: "Full property address (street, city, state, zip)",
        },
        propertyId: {
          type: "string",
          description: "Colony property ID if available (more accurate than address lookup)",
        },
      },
      required: ["address"],
    },
  },
  {
    type: "custom" as const,
    name: "web_search_market_data",
    description:
      "Search the web for real estate market data, trends, and neighborhood information. Use this when MLS data isn't sufficient — for market trends, school ratings, neighborhood insights, zoning info, or any external data the user needs. Returns relevant web results with summaries.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'Austin TX housing market trends 2024')",
        },
      },
      required: ["query"],
    },
  },
];
