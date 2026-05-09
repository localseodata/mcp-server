import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerCompetitiveTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "competitor_ads",
    "Find Google Ads campaigns from a competitor domain. Returns ad copy, keywords, and landing pages. Costs 2 credits.",
    {
      domain: z.string().min(1).describe('Competitor domain (e.g. "competitor.com")'),
      location: z.string().optional().describe("Geographic location filter"),
      format: z.enum(["text", "image", "video"]).optional().describe("Ad format filter"),
      limit: z.number().int().min(1).max(100).optional().describe("Max ads. Default: 20, max: 100"),
    },
    READ_ONLY,
    withErrorHandling(async ({ domain, location, format, limit }) => {
      const result = await callApi(
        "/v1/ads/competitor",
        {
          domain,
          ...(location && { location }),
          ...(format && { format }),
          ...(limit && { limit }),
        },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "brand_mentions",
    "Find online mentions of a brand across the web. Returns mention sources, sentiment, and context. Costs 3 credits.",
    {
      business_name: z.string().min(1).describe("Business or brand name to search for"),
      limit: z.number().int().min(1).max(100).optional().describe("Max mentions. Default: 20, max: 100"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, limit }) => {
      const result = await callApi(
        "/v1/brand/mentions",
        { business_name, ...(limit && { limit }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
