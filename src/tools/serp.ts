import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerSerpTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "local_pack",
    "Get businesses in Google's local 3-pack for any keyword and city. Returns names, ratings, review counts, phone numbers, websites, hours, and GPS coordinates. Costs 1 credit.",
    {
      keyword: z.string().describe('Search keyword (e.g. "plumber")'),
      location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
      device: z.enum(["desktop", "mobile"]).optional().describe("Device type. Default: desktop"),
      depth: z.number().int().min(1).max(60).optional().describe("Number of results. Default: 20, max: 60"),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location, device, depth }) => {
      const result = await callApi(
        "/v1/serp/local-pack",
        { keyword, location, ...(device && { device }), ...(depth && { depth }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "organic_serp",
    "Get full Google SERP results including organic listings, local pack, ads, People Also Ask, AI overview, LSA ads, and knowledge panel. Costs 1 credit.",
    {
      keyword: z.string().describe('Search keyword (e.g. "best plumber near me")'),
      location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location }) => {
      const result = await callApi("/v1/serp/organic", { keyword, location }, getAuth());
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "local_services_ads",
    "Get Google Local Services Ads (LSA) for a keyword and location. Returns business names, ratings, reviews, badges, years in business, phone numbers, and services offered. Costs 1 credit.",
    {
      keyword: z.string().describe('Search keyword (e.g. "plumber")'),
      location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location }) => {
      const result = await callApi("/v1/serp/lsa", { keyword, location }, getAuth());
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "maps",
    "Get Google Maps results for a keyword and location. Returns names, place IDs, ratings, reviews, addresses, phone numbers, websites, hours, GPS coordinates, and categories. Costs 1 credit.",
    {
      keyword: z.string().describe('Search keyword (e.g. "dentist")'),
      location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
      limit: z.number().int().min(1).max(100).optional().describe("Number of results. Default: 20, max: 100"),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location, limit }) => {
      const result = await callApi(
        "/v1/serp/maps",
        { keyword, location, ...(limit && { limit }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "local_finder",
    "Get Google Local Finder results for a keyword and location with optional minimum rating filter. Returns names, ratings, reviews, addresses, phone numbers, hours, websites, and CIDs. Costs 1 credit.",
    {
      keyword: z.string().describe('Search keyword (e.g. "plumber")'),
      location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
      limit: z.number().int().min(1).max(100).optional().describe("Number of results. Default: 20, max: 100"),
      min_rating: z.number().min(0).max(5).optional().describe("Minimum star rating filter (0-5)"),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location, limit, min_rating }) => {
      const result = await callApi(
        "/v1/serp/local-finder",
        { keyword, location, ...(limit && { limit }), ...(min_rating !== undefined && { min_rating }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "ai_overview",
    "Check whether Google shows an AI Overview for a keyword and extract the summary text and cited sources. Costs 1 credit.",
    {
      keyword: z.string().describe('Search keyword (e.g. "best plumber near me")'),
      location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location }) => {
      const result = await callApi("/v1/serp/ai-overview", { keyword, location }, getAuth());
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "ai_mode",
    "Get Google AI Mode response for a keyword and location. Returns the AI-generated response text, reference links, and shopping items. Costs 2 credits.",
    {
      keyword: z.string().describe('Search keyword (e.g. "best plumber near me")'),
      location: z.string().describe('City and state (e.g. "Orchard Park, NY")'),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location }) => {
      const result = await callApi("/v1/serp/ai-mode", { keyword, location }, getAuth());
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
