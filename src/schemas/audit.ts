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
  directories_checked: z.number(),
  found: z.number().optional(),
  consistent: z.number(),
  inconsistent: z.number(),
  unverified: z.number().optional(),
  not_found: z.number(),
  details: z.array(
    z.object({
      directory: z.string(),
      status: z.enum(["consistent", "inconsistent", "unverified", "not_found"]),
      name_match: z.boolean().nullable(),
      address_match: z.boolean().nullable(),
      phone_match: z.boolean().nullable(),
      expected_address: z.string().optional(),
      expected_phone: z.string().optional(),
    })
  ),
});
