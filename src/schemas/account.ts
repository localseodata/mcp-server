import { z } from "zod";

export const balanceDataSchema = z.object({
  balance: z.number(),
  // Split of `balance`: the plan allowance for the current period, which
  // refills on renewal and is spent first, and the wallet, which holds
  // deposits and signup credits and never expires. Optional so an older
  // API deployment still validates.
  monthly_balance: z.number().optional(),
  wallet_balance: z.number().optional(),
  plan: z.object({
    id: z.string(),
    name: z.string(),
    credits_per_month: z.number(),
    current_period_end: z.string().nullable(),
  }),
});

export const usageDataSchema = z.object({
  credits_used_this_period: z.number(),
  // Start of the window the totals cover: the subscriber's billing period,
  // or 30 days back for an account without a subscription.
  period_start: z.string().optional(),
  calls_by_endpoint: z.array(
    z.object({
      endpoint: z.string().nullable(),
      calls: z.number(),
      credits: z.number(),
    })
  ),
  daily_breakdown: z.array(
    z.object({
      date: z.string(),
      calls: z.number(),
      credits: z.number(),
    })
  ),
});

export const listKeysDataSchema = z.object({
  keys: z.array(
    z.object({
      id: z.string(),
      prefix: z.string(),
      name: z.string(),
      environment: z.string(),
      created_at: z.string(),
      last_used_at: z.string().nullable(),
    })
  ),
});

export const createKeyDataSchema = z.object({
  id: z.string(),
  key: z.string(),
  prefix: z.string(),
  name: z.string(),
  environment: z.string(),
  message: z.string(),
});

export const revokeKeyDataSchema = z.object({
  revoked: z.literal(true),
  key_id: z.string(),
});

// ─── Request history (/v1/history) ──────────────────────────────────────────

const historyEntrySchema = z.object({
  id: z.string(),
  request_id: z.string(),
  endpoint: z.string(),
  method: z.string(),
  status_code: z.number(),
  credits_used: z.number(),
  response_time_ms: z.number(),
  // Whatever was POSTed: request-log stores the parsed body as-is, so an
  // array or scalar body is stored as one. Declared as a record, a single
  // historical array-bodied request made the MCP tool throw for every page
  // that included it.
  params: z.unknown(),
  error_code: z.string().nullable(),
  created_at: z.union([z.string(), z.date()]).nullable(),
});

export const historyListDataSchema = z.object({
  entries: z.array(historyEntrySchema),
  total: z.number(),
  /** False when `total` is a floor rather than the real count — the count is
   *  bounded so it cannot scale with how long someone has been a customer. */
  total_is_exact: z.boolean(),
  page: z.number(),
  pages: z.number(),
  limit: z.number(),
});

export const historyEntryDataSchema = historyEntrySchema.extend({
  response_data: z.unknown(),
  /** "not_stored" when response_data is null: the account had response
   *  logging off, the body was over the storage cap, it was not JSON, or the
   *  endpoint is one whose response is never stored. Null when present. */
  response_data_omitted: z.enum(["not_stored"]).nullable(),
});
