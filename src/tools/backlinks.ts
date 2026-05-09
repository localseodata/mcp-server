import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerBacklinkTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "backlink_summary",
    "Get backlink profile summary for a domain. Returns total backlinks, referring domains, spam score, and backlink type breakdown. Costs 5 credits.",
    {
      domain: z.string().min(1).describe('Domain to analyze (e.g. "example.com")'),
    },
    READ_ONLY,
    withErrorHandling(async ({ domain }) => {
      const result = await callApi("/v1/backlinks/summary", { domain }, getAuth());
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );

  server.tool(
    "backlink_gap",
    "Find backlink opportunities by comparing your domain against up to 5 competitors. Returns referring domains that link to competitors but not to you. Costs 10 credits.",
    {
      your_domain: z.string().min(1).describe('Your domain (e.g. "example.com")'),
      competitor_domains: z.array(z.string().min(1)).min(1).max(5).describe("Competitor domains to compare against"),
      limit: z.number().int().min(1).max(100).optional().describe("Max opportunities. Default: 50, max: 100"),
    },
    READ_ONLY,
    withErrorHandling(async ({ your_domain, competitor_domains, limit }) => {
      const result = await callApi(
        "/v1/backlinks/gap",
        { your_domain, competitor_domains, ...(limit && { limit }) },
        getAuth()
      );
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
