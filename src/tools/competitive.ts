import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import { competitorAdsDataSchema, brandMentionsDataSchema } from "../schemas/competitive.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerCompetitiveTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "competitor_ads",
    {
      description: "Use when seeing what Google Ads a competitor domain is running. Returns advertiser, total_ads (after limit), total_available, and per creative: advertiser_name, creative_id, format, first/last shown, and preview_image_url / transparency_url links. Google's Ads Transparency Center does not carry ad headline or body text, landing URLs, or platforms. Costs 2 credits.",
      inputSchema: {
        domain: z.string().min(1).describe('Competitor domain (e.g. "competitor.com")'),
        location: z.string().optional().describe("Geographic location filter"),
        format: z.enum(["text", "image", "video"]).optional().describe("Ad format filter"),
        limit: z.number().int().min(1).max(100).optional().describe("Max ads. Default: 20, max: 100"),
      },
      outputSchema: competitorAdsDataSchema,
      annotations: { ...READ_ONLY, title: "Competitor Google Ads" },
    },
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
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "brand_mentions",
    {
      description: "Use when monitoring where a brand is mentioned online with sentiment analysis. Returns total_mentions, sentiment_breakdown (positive/neutral/negative), and mention details with domain_authority and sentiment. Costs 23 credits.",
      inputSchema: {
        business_name: z.string().min(1).describe("Business or brand name to search for"),
        limit: z.number().int().min(1).max(100).optional().describe("Max mentions. Default: 20, max: 100"),
      },
      outputSchema: brandMentionsDataSchema,
      annotations: { ...READ_ONLY, title: "Brand Mentions Monitor" },
    },
    withErrorHandling(async ({ business_name, limit }) => {
      const result = await callApi(
        "/v1/brand/mentions",
        { business_name, ...(limit && { limit }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
