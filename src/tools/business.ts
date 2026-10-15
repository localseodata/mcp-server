import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import {
  profileDataSchema,
  profileHealthDataSchema,
  qaDataSchema,
  listingsDataSchema,
} from "../schemas/business.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerBusinessTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "business_profile",
    {
      description: "Use when pulling one business's complete GBP data. Returns name, address, phone, website, hours, categories, photos_count, rating, reviews_count, description, attributes, cid, place_id, and verified status. If no exact match is found, returns matched=false with up to 5 suggestions from Google Maps including place_id for exact retry. Costs 5 credits.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
        place_id: z.string().optional().describe("Google Place ID for exact match"),
      },
      outputSchema: profileDataSchema,
      annotations: { ...READ_ONLY, title: "Google Business Profile" },
    },
    withErrorHandling(async ({ business_name, location, place_id }) => {
      // Name+location matching goes through Google Maps and can be slow. Cap it
      // below the ~60s tool-call ceiling most MCP clients enforce so the caller
      // gets an actionable message instead of a dead connection. The place_id
      // path is an instant exact match and is unaffected by this ceiling.
      let result;
      try {
        result = await callApi(
          "/v1/business/profile",
          { business_name, location, ...(place_id && { place_id }) },
          getAuth(),
          place_id ? 150_000 : 50_000
        );
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (!place_id && (name === "TimeoutError" || name === "AbortError")) {
          throw new Error(
            `Looking up "${business_name}" in ${location} by name took too long — Google Maps name matching can be slow. Retry with the place_id for an instant exact match (get it from a maps or business_listings call, or from this tool's matched=false suggestions).`
          );
        }
        throw err;
      }
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "profile_health",
    {
      description: "Audits what's missing or weak on a Google Business Profile. Returns completeness_score (0-100), missing_fields, incomplete_fields, and specific recommendations. For the raw profile fields without scoring, business_profile returns them directly. Costs 5 credits.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
        place_id: z.string().optional().describe("Google Place ID for exact match"),
      },
      outputSchema: profileHealthDataSchema,
      annotations: { ...READ_ONLY, title: "Business Profile Health Check" },
    },
    withErrorHandling(async ({ business_name, location, place_id }) => {
      const result = await callApi(
        "/v1/profile/health",
        { business_name, location, ...(place_id && { place_id }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "qa",
    {
      description: "Use when checking what questions people ask on a GBP and whether they have answers. Returns questions with text, author, date, and answers with upvotes. Costs 5 credits.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
        place_id: z.string().optional().describe("Google Place ID for exact match"),
      },
      outputSchema: qaDataSchema,
      annotations: { ...READ_ONLY, title: "Google Business Q&A" },
    },
    withErrorHandling(async ({ business_name, location, place_id }) => {
      const result = await callApi(
        "/v1/business/qa",
        { business_name, location, ...(place_id && { place_id }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "business_listings",
    {
      description: "Use when discovering all businesses in a category and location (bulk discovery, not single business lookup). Returns name, rating, reviews_count, address, city, phone, website, place_id, lat/lng, and categories for each, searched within search_radius_km of the location (location_used echoes where). Costs 10 credits per 50 results.",
      inputSchema: {
        category: z.string().describe('Business category (e.g. "plumber", "dentist")'),
        location: z.string().describe("City and state"),
        limit: z.number().int().min(1).max(200).optional().describe("Number of results (1-200). Default: 50"),
      },
      outputSchema: listingsDataSchema,
      annotations: { ...READ_ONLY, title: "Business Listings Discovery" },
    },
    withErrorHandling(async ({ category, location, limit }) => {
      const result = await callApi(
        "/v1/business/listings",
        { category, location, ...(limit && { limit }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
