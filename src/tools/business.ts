import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerBusinessTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "business_profile",
    "Get a complete Google Business Profile including name, rating, reviews, address, phone, website, hours, categories, attributes, photos count, description, and verification status. Costs 2 credits.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
      place_id: z.string().optional().describe("Google Place ID for exact match"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location, place_id }) => {
      const result = await callApi(
        "/v1/business/profile",
        { business_name, location, ...(place_id && { place_id }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "profile_health",
    "Audit a Google Business Profile's completeness. Returns a completeness score, missing/incomplete fields, and actionable recommendations. Costs 2 credits.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
      place_id: z.string().optional().describe("Google Place ID for exact match"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location, place_id }) => {
      const result = await callApi(
        "/v1/profile/health",
        { business_name, location, ...(place_id && { place_id }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "qa",
    "Get Questions & Answers from a Google Business Profile. Returns questions with their answers, authors, dates, and upvotes. Costs 1 credit.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
      place_id: z.string().optional().describe("Google Place ID for exact match"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location, place_id }) => {
      const result = await callApi(
        "/v1/business/qa",
        { business_name, location, ...(place_id && { place_id }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "business_listings",
    "Search for businesses by category and location. Returns a list of businesses with name, rating, reviews, address, phone, place_id, and categories. Costs 10 credits per 50 results.",
    {
      category: z.string().describe('Business category (e.g. "plumber", "dentist")'),
      location: z.string().describe("City and state"),
      limit: z.number().int().min(1).max(200).optional().describe("Number of results (1-200). Default: 50"),
    },
    READ_ONLY,
    withErrorHandling(async ({ category, location, limit }) => {
      const result = await callApi(
        "/v1/business/listings",
        { category, location, ...(limit && { limit }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
