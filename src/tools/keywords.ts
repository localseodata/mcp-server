import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerKeywordTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "search_volume",
    "Get search volume and keyword metrics for up to 1000 keywords. Returns monthly search volume, CPC, competition, and trend data. Costs 1 credit per 50 keywords.",
    {
      keywords: z.array(z.string().min(1)).min(1).max(1000).describe("Array of keywords to analyze"),
      location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
      language: z.string().optional().describe('Language code. Default: "en"'),
    },
    READ_ONLY,
    withErrorHandling(async ({ keywords, location, language }) => {
      const result = await callApi(
        "/v1/keywords/search-volume",
        { keywords, location, ...(language && { language }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "keyword_suggestions",
    "Get keyword suggestions for a seed keyword. Returns related keywords with search volume and metrics. Costs 2 credits.",
    {
      keyword: z.string().min(1).describe('Seed keyword (e.g. "plumber")'),
      location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
      limit: z.number().int().min(1).max(1000).optional().describe("Max suggestions. Default: 50, max: 1000"),
      include_seed_keyword: z.boolean().optional().describe("Include seed keyword in results. Default: true"),
    },
    READ_ONLY,
    withErrorHandling(async ({ keyword, location, limit, include_seed_keyword }) => {
      const result = await callApi(
        "/v1/keywords/suggestions",
        {
          keyword,
          location,
          ...(limit && { limit }),
          ...(include_seed_keyword !== undefined && { include_seed_keyword }),
        },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "related_keywords",
    "Find related keywords for up to 20 seed keywords. Returns semantically related keywords with metrics. Costs 2 credits.",
    {
      keywords: z.array(z.string().min(1)).min(1).max(20).describe("Array of seed keywords"),
      location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
      limit: z.number().int().min(1).max(1000).optional().describe("Max results. Default: 50, max: 1000"),
    },
    READ_ONLY,
    withErrorHandling(async ({ keywords, location, limit }) => {
      const result = await callApi(
        "/v1/keywords/related",
        { keywords, location, ...(limit && { limit }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "keywords_for_site",
    "Get keywords a domain currently ranks for. Returns keywords with rank positions and search volume. Costs 3 credits.",
    {
      domain: z.string().min(1).describe('Domain to analyze (e.g. "example.com")'),
      location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
      limit: z.number().int().min(1).max(1000).optional().describe("Max results. Default: 50, max: 1000"),
    },
    READ_ONLY,
    withErrorHandling(async ({ domain, location, limit }) => {
      const result = await callApi(
        "/v1/keywords/for-site",
        { domain, location, ...(limit && { limit }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "keyword_trends",
    "Get search trend data for up to 5 keywords over time. Periods: 3m, 6m, 12m (default), 5y. Costs 1 credit.",
    {
      keywords: z.array(z.string().min(1)).min(1).max(5).describe("Keywords to get trends for"),
      location: z.string().min(1).describe('Geographic location (e.g. "Orchard Park, NY")'),
      period: z.enum(["3m", "6m", "12m", "5y"]).optional().describe('Time period. Default: "12m"'),
    },
    READ_ONLY,
    withErrorHandling(async ({ keywords, location, period }) => {
      const result = await callApi(
        "/v1/keywords/trends",
        { keywords, location, ...(period && { period }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
