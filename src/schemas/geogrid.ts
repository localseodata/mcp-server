import { z } from "zod";

export const geogridScanSubmitDataSchema = z.object({
  job_id: z.string(),
  // A submit that matched a scan already running hands back that scan, which
  // may have moved past "pending" by now.
  status: z.string(),
  estimated_seconds: z.number(),
  poll_url: z.string(),
  /** Present and true when this submit matched a scan already in flight and
   *  started nothing. */
  deduplicated: z.boolean().optional(),
});

// Completed-scan shape produced by the geogrid worker pipeline. Fields
// that the worker may legitimately omit (warning is conditional;
// completed_at is added by the status endpoint not the worker itself)
// are optional or nullable so live polled completions, sandbox mocks,
// and async-skip sandbox responses all validate cleanly.
const geogridListingSchema = z.object({
  rank: z.number(),
  place_id: z.string().nullable(),
  cid: z.string().nullable(),
  title: z.string().nullable(),
  category: z.string().nullable(),
  rating: z.number().nullable(),
  reviews_count: z.number().nullable(),
  address: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

// The fields added in October 2026 (atrp, solv,
// failed_points, per-point status, ...) are optional so a scan stored before
// them still validates.
export const geogridScanCompletedDataSchema = z.object({
  grid: z.array(z.array(z.number())),
  grid_points: z.array(
    z.object({
      row: z.number(),
      col: z.number(),
      lat: z.number(),
      lng: z.number(),
      /** 0 when the business was not found, or the point failed. */
      rank: z.number(),
      status: z.enum(["ok", "error"]).optional(),
      /** The top 20 organic listings, when include_listings was set. */
      results: z.array(geogridListingSchema).optional(),
      error: z.string().optional(),
    })
  ),
  average_rank: z.number(),
  atrp: z.number().optional(),
  solv: z.number().optional(),
  found_in: z.number(),
  failed_points: z.number().optional(),
  total_points: z.number(),
  center: z.object({ lat: z.number(), lng: z.number() }),
  grid_size: z.string(),
  radius_miles: z.number(),
  keyword: z.string().optional(),
  place_id: z.string().optional(),
  business_name: z.string().nullable().optional(),
  zoom: z.number().optional(),
  zoom_mode: z.enum(["auto", "fixed"]).optional(),
  credits_refunded: z.number().optional(),
  cached: z.boolean(),
  completed_at: z.string().nullable().optional(),
  warning: z.string().optional(),
}).passthrough();

/** A status poll, which can land on a job that is queued, running, finished
 *  or failed.
 *
 *  One object rather than the discriminated union this used to be. The union
 *  was precise and unused — and unusable where it was needed, because the MCP
 *  SDK accepts an outputSchema only as an object shape: handed a union it does
 *  not complain, it drops the schema and the tool ships with no output
 *  validation at all. Declaring too narrow an object is worse still, since the
 *  SDK validates structuredContent and throws AFTER the call has been made,
 *  which on a poll would strand a caller on top of a scan they have already
 *  paid for. Same reasoning as matchAnyDataSchema. */
export const geogridStatusDataSchema = geogridScanCompletedDataSchema
  .partial()
  .extend({
    job_id: z.string(),
    status: z.string(),
    progress: z.number().optional(),
    total: z.number().optional(),
    error: z.string().nullable().optional(),
  });
