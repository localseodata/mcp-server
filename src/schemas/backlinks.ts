import { z } from "zod";

export const summaryDataSchema = z.object({
  domain: z.string(),
  rank: z.number(),
  backlinks_total: z.number(),
  referring_domains: z.number(),
  referring_domains_nofollow: z.number(),
  broken_backlinks: z.number(),
  spam_score: z.number(),
  backlinks_by_type: z.object({
    anchor: z.number(),
    image: z.number(),
    redirect: z.number(),
  }),
});

export const gapDataSchema = z.object({
  your_domain: z.string(),
  opportunities: z.array(
    z.object({
      referring_domain: z.string(),
      domain_authority: z.number(),
      links_to_competitors: z.array(
        z.object({
          domain: z.string(),
          backlinks: z.number(),
        })
      ),
      links_to_you: z.literal(false),
    })
  ),
  total_opportunities: z.number(),
});
