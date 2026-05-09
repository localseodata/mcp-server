import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerReviewTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "google_reviews",
    "Get Google reviews for a business. Returns review text, rating, date, author, and owner replies. Costs 1 credit per 10 reviews. Note: this tool may take 10-30 seconds to return — this is normal, not an error.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
      limit: z.number().int().min(1).max(100).optional().describe("Number of reviews (1-100). Default: 10"),
      sort: z.enum(["newest", "highest", "lowest", "most_relevant"]).optional().describe("Sort order. Default: newest"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location, limit, sort }) => {
      const result = await callApi(
        "/v1/reviews/google",
        { business_name, location, ...(limit && { limit }), ...(sort && { sort }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "review_velocity",
    "Analyze review velocity trends over time. Returns reviews per month, rating trend, reply rate, sentiment themes, and monthly breakdown. Costs 6 credits. Note: this tool may take 10-30 seconds to return — this is normal, not an error.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
      period: z.string().optional().describe('Time period: "30d", "90d", "6m", or "1y". Default: "90d"'),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location, period }) => {
      const result = await callApi(
        "/v1/reviews/velocity",
        { business_name, location, ...(period && { period }) },
        getAuth(),
        120_000
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "multi_platform_reviews",
    "Get review data across multiple platforms (Google, Trustpilot). Returns per-platform ratings and counts with a combined score. Costs 6 credits. Note: this tool queries multiple review sources and may take 10-30 seconds to return — this is normal, not an error.",
    {
      business_name: z.string().describe("Business name"),
      location: z.string().describe("City and state"),
      platforms: z.array(z.enum(["google", "trustpilot"])).optional().describe('Platforms to check. Default: ["google", "trustpilot"]'),
    },
    READ_ONLY,
    withErrorHandling(async ({ business_name, location, platforms }) => {
      const result = await callApi(
        "/v1/reviews/multi-platform",
        { business_name, location, ...(platforms && { platforms }) },
        getAuth(),
        120_000
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
