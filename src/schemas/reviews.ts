import { z } from "zod";

export const googleReviewsDataSchema = z.object({
  reviews: z.array(
    z.object({
      text: z.string(),
      rating: z.number(),
      date: z.string(),
      author_name: z.string(),
      author_url: z.string(),
      owner_reply: z.string().nullable(),
      owner_reply_date: z.string().nullable(),
    })
  ),
  total_reviews: z.number(),
  average_rating: z.number().nullable(),
});

export const velocityDataSchema = z.object({
  reviews_per_month: z.number(),
  rating_trend: z.enum(["improving", "declining", "stable"]),
  current_rating: z.number(),
  period_rating: z.number(),
  reply_rate: z.number(),
  sentiment_themes: z.object({
    positive: z.array(z.string()),
    negative: z.array(z.string()),
  }),
  review_count_by_month: z.array(
    z.object({
      month: z.string(),
      count: z.number(),
      avg_rating: z.number(),
    })
  ),
});

export const multiPlatformDataSchema = z.object({
  platforms: z.record(
    z.string(),
    z.object({
      rating: z.number(),
      count: z.number(),
      recent_trend: z.string(),
    })
  ),
  combined_rating: z.number(),
  total_reviews: z.number(),
});
