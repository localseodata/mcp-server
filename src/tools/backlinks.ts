import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import { summaryDataSchema, gapDataSchema } from "../schemas/backlinks.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerBacklinkTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "backlink_summary",
    {
      description: "Use when getting a domain's backlink profile overview. Returns rank, backlinks_total, referring_domains, broken_backlinks, spam_score, and backlinks_by_type. Costs 23 credits.",
      inputSchema: {
        domain: z.string().min(1).describe('Domain to analyze (e.g. "example.com")'),
      },
      outputSchema: summaryDataSchema,
      annotations: { ...READ_ONLY, title: "Backlink Profile Summary" },
    },
    withErrorHandling(async ({ domain }) => {
      const result = await callApi("/v1/backlinks/summary", { domain }, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "backlink_gap",
    {
      description: "Use when finding link building opportunities -- sites that link to competitors but not to you. Returns referring domains with domain_authority and which competitors they link to. Costs 23 credits.",
      inputSchema: {
        your_domain: z.string().min(1).describe('Your domain (e.g. "example.com")'),
        competitor_domains: z.array(z.string().min(1)).min(1).max(5).describe("Competitor domains to compare against"),
        limit: z.number().int().min(1).max(100).optional().describe("Max opportunities. Default: 50, max: 100"),
      },
      outputSchema: gapDataSchema,
      annotations: { ...READ_ONLY, title: "Backlink Gap Analysis" },
    },
    withErrorHandling(async ({ your_domain, competitor_domains, limit }) => {
      const result = await callApi(
        "/v1/backlinks/gap",
        { your_domain, competitor_domains, ...(limit && { limit }) },
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
