import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApiGet, formatResult, withErrorHandling } from "../api-client.js";
import {
  balanceDataSchema,
  historyListDataSchema,
  historyEntryDataSchema,
} from "../schemas/account.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

export function registerAccountTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "get_balance",
    {
      description: "Returns available credits (split into the monthly plan allowance, spent first, and the never-expiring wallet), daily spending cap, plan, and environment. Useful before running multi-step or expensive analyses to confirm the account has enough credits. Free (0 credits).",
      outputSchema: balanceDataSchema,
      annotations: { ...READ_ONLY, title: "Check Credit Balance" },
    },
    withErrorHandling(async () => {
      const result = await callApiGet("/v1/account/balance", getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "history_search",
    {
      description: "Finds calls this account has already made, with what was asked and what it cost. Free (0 credits).\n\nUSE THIS BEFORE BUYING DATA AGAIN. Every response this API has returned is kept, so \"has this changed since last month?\", \"what did we see last time?\" and \"did we already check this?\" are answerable from what has been paid for once. Running the original endpoint again to answer them charges full price for a second copy.\n\nFilter by endpoint, by date range, and by what was asked: keyword, location, business_name and domain match the parameters of the original call, so \"every AI Mode call for this keyword\" is one search. Note that a sandbox key sees only sandbox calls, and if the account turned response logging off then params were not stored either and these filters find nothing. Values match exactly, not as substrings — \"best plumber\" and \"best plumber near me\" are different questions and are not merged.\n\nReturns entries with request_id, endpoint, params, credits_used, status_code and created_at, newest first, but NOT the response bodies — they are large and a search is for finding the call. Pass a request_id to history_get for the answer itself.\n\nBuilding a trend: search for the calls, then history_get each one. A month of daily AI Mode calls is 30 cheap reads instead of 30 paid ones.",
      inputSchema: {
        endpoint: z.string().optional().describe('Endpoint path, matched as a substring (e.g. "/v1/serp/ai-mode" or just "ai-").'),
        keyword: z.string().optional().describe("Exact keyword the original call was made with."),
        location: z.string().optional().describe("Exact location the original call was made with."),
        business_name: z.string().optional().describe("Exact business_name the original call was made with."),
        domain: z.string().optional().describe("Exact domain the original call was made with."),
        from: z.string().optional().describe('Earliest date, ISO (e.g. "2026-08-01").'),
        to: z.string().optional().describe('Latest date, ISO.'),
        status: z.enum(["success", "error"]).optional().describe("Only successful calls, or only failed ones."),
        limit: z.number().int().min(1).max(100).optional().describe("Entries per page, max 100. Default 25."),
        page: z.number().int().min(1).optional().describe("Page number, from 1."),
        sort: z.enum(["created_at", "credits_used", "response_time_ms", "endpoint", "status_code"]).optional().describe("Default created_at."),
        order: z.enum(["asc", "desc"]).optional().describe("Default desc, newest first."),
      },
      outputSchema: historyListDataSchema,
      annotations: { ...READ_ONLY, title: "Search Request History" },
    },
    withErrorHandling(async (args) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
      }
      const query = qs.toString();
      const result = await callApiGet(`/v1/history${query ? `?${query}` : ""}`, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "history_get",
    {
      description: "Returns one past call in full, including the response body exactly as it was returned at the time. Free (0 credits).\n\nTakes the request_id from any previous response, or the id from history_search. This is how you read an answer you already paid for rather than buying it again.\n\nA null body is not an error and not a missing call: the call happened, and its cost and timing are still there. response_data_omitted is \"not_stored\" and deliberately does not guess which of four causes applied — logging off for the account, a body over the size limit, a non-JSON body, or an endpoint whose response is never stored.",
      inputSchema: {
        id: z.string().min(1).describe("A request_id from a previous response, or an entry id from history_search."),
      },
      outputSchema: historyEntryDataSchema,
      annotations: { ...READ_ONLY, title: "Read a Past Response" },
    },
    withErrorHandling(async ({ id }) => {
      const result = await callApiGet(`/v1/history/${encodeURIComponent(id)}`, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
