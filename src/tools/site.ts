import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function registerSiteTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "page_audit",
    "Run an on-page SEO audit for a URL. Checks 50+ factors including title, meta, headings, images, Core Web Vitals, schema markup, and mobile-friendliness. Costs 4 credits.",
    {
      url: z.string().url().describe('Full URL to audit (e.g. "https://example.com/page")'),
    },
    READ_ONLY,
    withErrorHandling(async ({ url }) => {
      const result = await callApi("/v1/site/page-audit", { url }, getAuth());
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
