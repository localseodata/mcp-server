import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callApiGet, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

export function registerAccountTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "get_balance",
    "Check the user's current credit balance. Returns credits remaining, daily spending cap, and plan info. Always call this FIRST before starting any multi-step analysis to understand the budget available. Costs 0 credits (free).",
    {},
    READ_ONLY,
    withErrorHandling(async () => {
      const result = await callApiGet("/v1/account/balance", getAuth());
      return { content: [{ type: "text" as const, text: formatResult(result.data, result) }] };
    })
  );
}
