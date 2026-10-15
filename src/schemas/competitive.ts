import { z } from "zod";

export const competitorAdsDataSchema = z.object({
  advertiser: z.string(),
  total_ads: z.number(),
  ads: z.array(
    z.object({
      // Google's Ads Transparency Center carries no headline,
      // body text, landing URL or platforms — only the creative's advertiser,
      // format, dates and preview links. New fields optional for
      // deploy-order compatibility.
      advertiser_name: z.string().optional(),
      advertiser_id: z.string().nullable().optional(),
      creative_id: z.string().nullable().optional(),
      format: z.string(),
      verified: z.boolean().nullable().optional(),
      first_shown: z.string().nullable(),
      last_shown: z.string().nullable(),
      preview_image_url: z.string().nullable().optional(),
      preview_url: z.string().nullable().optional(),
      transparency_url: z.string().nullable().optional(),
    })
  ),
  domain: z.string().optional(),
  total_available: z.number().optional(),
});

export const brandMentionsDataSchema = z.object({
  total_mentions: z.number(),
  sentiment_breakdown: z.object({
    positive: z.number(),
    neutral: z.number(),
    negative: z.number(),
  }),
  mentions: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      domain: z.string(),
      domain_authority: z.number().nullable(),
      sentiment: z.enum(["positive", "neutral", "negative"]),
      snippet: z.string(),
      date: z.string().nullable(),
    })
  ),
});
