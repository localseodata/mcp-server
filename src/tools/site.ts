import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";
import { pageAuditDataSchema } from "../schemas/site.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerSiteTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "page_audit",
    {
      description: "Use when auditing a single page's on-page SEO. Returns seo_score, title, meta_description, h1, word_count, load_time_ms, body_text_unreadable, core_web_vitals (lab lcp in ms and cls; inp is null — it needs field data), issues with severity (seo_score is 100 minus 15 per critical, 5 per warning, 1 per info), schema_markup, and mobile_friendly. Costs 1 credit.",
      inputSchema: {
        url: z.string().url().describe('Full URL to audit (e.g. "https://example.com/page")'),
      },
      outputSchema: pageAuditDataSchema,
      annotations: { ...READ_ONLY, title: "On-Page SEO Audit" },
    },
    withErrorHandling(async ({ url }) => {
      const result = await callApi("/v1/site/page-audit", { url }, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
