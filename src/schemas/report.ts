import { z } from "zod";

export const competitorGapDataSchema = z.object({
  your_business: z.object({
    name: z.string(),
    rank: z.number().nullable(),
    rating: z.number(),
    reviews_count: z.number(),
    profile_completeness: z.number().nullable(),
  }),
  competitors: z.array(
    z.object({
      name: z.string(),
      rank: z.number(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      profile_completeness: z.number().nullable(),
      advantages: z.array(z.string()),
    })
  ),
  your_gaps: z.array(z.string()),
});

export const localAuthorityDataSchema = z.object({
  authority_score: z.number(),
  breakdown: z.object({
    ranking: z.object({
      score: z.number(),
      max: z.literal(25),
      detail: z.string(),
    }),
    reviews: z.object({
      score: z.number(),
      max: z.literal(30),
      detail: z.string(),
    }),
    profile: z.object({
      score: z.number(),
      max: z.literal(25),
      detail: z.string(),
    }),
    citations: z.object({
      score: z.number(),
      max: z.literal(20),
      detail: z.string(),
    }),
  }),
  percentile: z.string(),
});

export const localOpportunitiesDataSchema = z.object({
  keywords: z.array(
    z.object({
      keyword: z.string(),
      estimated_difficulty: z.number(),
      your_rank: z.number().nullable(),
      search_volume: z.number(),
      top_competitor: z.string().nullable(),
      competitor_rank: z.number().nullable(),
    })
  ),
});
