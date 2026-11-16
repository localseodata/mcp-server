import { z } from "zod";

export const localAuditSubmitDataSchema = z.object({
  job_id: z.string(),
  status: z.literal("pending"),
  estimated_seconds: z.number(),
  poll_url: z.string(),
});

// Completed-audit shape returned by the audit-local worker pipeline.
// rating + competitors[].rating are normalized to number-or-null at the
// worker (extractRating in worker.ts) so consumers don't have to handle
// the raw nested-object variant. CACHE_VERSION was bumped when
// that normalization landed, so any pre-normalization cache entries
// are unreachable.
export const localAuditCompletedDataSchema = z.object({
  local_pack_position: z.number().nullable(),
  organic_positions: z.array(
    z.object({
      keyword: z.unknown(),
      rank: z.number(),
    })
  ),
  rating: z.number().nullable(),
  reviews_count: z.number(),
  profile_completeness: z.number(),
  review_velocity: z.number(),
  competitors: z.array(
    z.object({
      name: z.unknown(),
      rank: z.number(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      profile_completeness: z.number().nullable(),
    })
  ),
  recommendations: z.array(z.string()),
}).passthrough();

export const localAuditStatusDataSchema = z.discriminatedUnion("status", [
  z.object({
    job_id: z.string(),
    status: z.literal("pending"),
    progress: z.number(),
    total_steps: z.number(),
  }),
  z.object({
    job_id: z.string(),
    status: z.literal("processing"),
    progress: z.number(),
    total_steps: z.number(),
  }),
  z.object({
    job_id: z.string(),
    status: z.literal("complete"),
    completed_at: z.string().nullable(),
  }).passthrough(),
  z.object({
    job_id: z.string(),
    status: z.literal("failed"),
    error: z.string().nullable(),
  }),
]);

export const reputationAuditDataSchema = z.object({
  reputation_score: z.number(),
  platforms: z.object({
    google: z.object({
      rating: z.number(),
      count: z.number(),
      trend: z.string(),
    }),
  }),
  sentiment: z.object({
    positive: z.array(z.string()),
    negative: z.array(z.string()),
  }),
  response_rate: z.number(),
  recommendations: z.array(z.string()),
});

// Match fields are three-state: true (verified), false (conflicting value
// found), null (SERP snippet doesn't show that field — unverifiable).
// consistency_score is a partial-credit average over found listings and is
// null when no directory listing was found at all.
// found/unverified are optional (not nullable-required) so this schema also
// validates responses from deployments predating the three-state comparator —
// the CI schema-validation job runs branch schemas against the LIVE API, so a
// required new field would deadlock the deploy that introduces it.
export const citationAuditDataSchema = z.object({
  consistency_score: z.number().nullable(),
  // Directories named in the request (or the default set), checked or not.
  directories_requested: z.number().optional(),
  // Directories searched to completion; not_found is only ever counted here.
  directories_checked: z.number(),
  found: z.number().optional(),
  consistent: z.number(),
  inconsistent: z.number(),
  unverified: z.number().optional(),
  not_found: z.number(),
  check_failed: z.number().optional(),
  unsupported: z.number().optional(),
  // The industry directory set added to the scan, and where it came from:
  // the caller (request) or the business's primary Google category.
  industry: z
    .object({
      name: z.string().nullable(),
      source: z.enum(["request", "google_category", "not_detected"]),
      google_category: z.string().nullable().optional(),
    })
    .optional(),
  details: z.array(
    z.object({
      directory: z.string(),
      status: z.enum([
        "consistent",
        "inconsistent",
        "unverified",
        "not_found",
        "check_failed",
        "unsupported",
        "defunct",
        "covered_by",
      ]),
      name_match: z.boolean().nullable(),
      address_match: z.boolean().nullable(),
      phone_match: z.boolean().nullable(),
      // The listing as the directory shows it, when one was found.
      listing_url: z.string().optional(),
      listed_name: z.string().optional(),
      listed_address: z.string().nullable().optional(),
      listed_phone: z.string().nullable().optional(),
      // How the listing was recognised as the business. The previous_* ways
      // (and a linked listing showing other details) mean it is stale.
      matched_on: z
        .enum(["phone", "name_and_address", "website", "previous_phone", "previous_name_and_address", "name_and_city", "linked_listing"])
        .optional(),
      stale: z.boolean().optional(),
      // Further listings of the same business on this directory, usually
      // duplicates left over from an old name, address or phone.
      other_listings: z
        .array(
          z.object({
            listing_url: z.string(),
            listed_name: z.string(),
            listed_address: z.string().nullable(),
            listed_phone: z.string().nullable(),
            name_match: z.boolean(),
            address_match: z.boolean().nullable(),
            phone_match: z.boolean().nullable(),
            matched_on: z.enum(["phone", "name_and_address", "website", "previous_phone", "previous_name_and_address", "name_and_city", "linked_listing"]),
            stale: z.boolean(),
          })
        )
        .optional(),
      expected_address: z.string().optional(),
      expected_phone: z.string().optional(),
      // Why a row was not checked, or how to retry it.
      note: z.string().optional(),
    })
  ),
});

// A citation audit asked to answer within wait_seconds, and its status
// endpoint: the full audit once done, or a job to collect it from.
export const citationAuditJobDataSchema = citationAuditDataSchema.partial().extend({
  job_id: z.string().optional(),
  status: z.enum(["running", "complete", "failed"]).optional(),
  poll_url: z.string().optional(),
  deduplicated: z.boolean().optional(),
  credits_charged: z.number().optional(),
  error: z.string().nullable().optional(),
});
