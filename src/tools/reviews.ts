import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import {
  googleReviewsDataSchema,
  velocityDataSchema,
  multiPlatformDataSchema,
} from "../schemas/reviews.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerReviewTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "google_reviews",
    {
      description: "Use when reading actual review text and owner replies for sentiment analysis or reply auditing. Returns text, rating, date, author_name, owner_reply for each review plus total_reviews and average_rating. For multi-location brands pass place_id (from business_profile) — name+location lookups can silently return empty. Costs 1 credit per 10 reviews. May take 10-30 seconds.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
        place_id: z.string().optional().describe("Google Place ID for exact match (recommended for multi-location brands)"),
        limit: z.number().int().min(1).max(100).optional().describe("Number of reviews (1-100). Default: 10"),
        sort: z.enum(["newest", "highest", "lowest", "most_relevant"]).optional().describe("Sort order. Default: newest"),
        language: z.string().optional().describe('Review language as ISO 639-1 code or name (e.g. "fr", "French"). Default "en" machine-translates non-English reviews — pass the market\'s language to get original review text.'),
      },
      outputSchema: googleReviewsDataSchema,
      annotations: { ...READ_ONLY, title: "Google Reviews" },
    },
    withErrorHandling(async ({ business_name, location, place_id, limit, sort, language }) => {
      const result = await callApi(
        "/v1/reviews/google",
        { business_name, location, ...(place_id && { place_id }), ...(limit && { limit }), ...(sort && { sort }), ...(language && { language }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "review_velocity",
    {
      description: "Analyzes review growth rate, rating changes, reply rate, and sentiment themes over time. Returns reviews_per_month, rating_trend, reply_rate, sentiment_themes, and monthly breakdown. For raw review text without trend analysis, see google_reviews. For multi-location brands pass place_id (from business_profile) — name+location lookups can silently return empty. Costs 6 credits. May take 10-30 seconds.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
        place_id: z.string().optional().describe("Google Place ID for exact match (recommended for multi-location brands)"),
        period: z.string().optional().describe('Time period: "30d", "90d", "6m", or "1y". Default: "90d"'),
      },
      outputSchema: velocityDataSchema,
      annotations: { ...READ_ONLY, title: "Review Velocity & Trends" },
    },
    withErrorHandling(async ({ business_name, location, place_id, period }) => {
      const result = await callApi(
        "/v1/reviews/velocity",
        { business_name, location, ...(place_id && { place_id }), ...(period && { period }) },
        getAuth(),
        120_000
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "multi_platform_reviews",
    {
      description: "Compares ratings across Google + Trustpilot in one call. Returns per-platform rating, count, and trend, plus combined_rating and total_reviews. Covers both platforms; google_reviews covers Google alone. Costs 6 credits. May take 10-30 seconds.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
        place_id: z.string().optional().describe("Google Place ID for exact match (recommended for multi-location brands)"),
        platforms: z.array(z.enum(["google", "trustpilot"])).optional().describe('Platforms to check. Default: ["google", "trustpilot"]'),
      },
      outputSchema: multiPlatformDataSchema,
      annotations: { ...READ_ONLY, title: "Multi-Platform Reviews" },
    },
    withErrorHandling(async ({ business_name, location, place_id, platforms }) => {
      const result = await callApi(
        "/v1/reviews/multi-platform",
        { business_name, location, ...(place_id && { place_id }), ...(platforms && { platforms }) },
        getAuth(),
        120_000
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
