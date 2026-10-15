import { z } from "zod";

/** One listing on a non-Google platform. Mirrors PlatformListing in
 *  the backend — the platform-neutral shape Apple and Bing both map into,
 *  deliberately separate from the Google-shaped profile schema. */
export const platformListingSchema = z.object({
  platform: z.enum(["apple", "bing"]),
  platform_id: z.string(),
  rank: z.number().nullable(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  website: z.string(),
  rating: z.number().nullable(),
  reviews_count: z.number(),
  categories: z.array(z.string()),
  hours: z.string(),
  claimed: z.boolean().nullable(),
  data_source: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

export const platformSerpDataSchema = z.object({
  results: z.array(platformListingSchema),
  total_results: z.number(),
  keyword: z.string(),
  location: z.string(),
  platform: z.enum(["apple", "bing"]),
});

/** listing is null when the business has no listing on that platform —
 *  an actionable answer (the profile was never claimed), not an error. */
export const platformProfileDataSchema = z.object({
  matched: z.boolean(),
  platform: z.enum(["apple", "bing"]),
  listing: platformListingSchema.nullable(),
  business_name: z.string(),
  location: z.string(),
});
