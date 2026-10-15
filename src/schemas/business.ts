import { z } from "zod";

export const profileSuggestionSchema = z.object({
  name: z.string(),
  address: z.string(),
  rating: z.number().nullable(),
  reviews_count: z.number(),
  place_id: z.string(),
  phone: z.string(),
  categories: z.array(z.string()),
});

export const profileDataSchema = z.object({
  matched: z.boolean().optional(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  website: z.string(),
  hours: z.unknown().nullable(),
  categories: z.array(z.string()),
  photos_count: z.number(),
  rating: z.number().nullable(),
  reviews_count: z.number(),
  description: z.string(),
  attributes: z.array(z.string()),
  cid: z.string(),
  place_id: z.string(),
  verified: z.boolean(),
  suggestions: z.array(profileSuggestionSchema).nullable().optional().default(null),
});

export const profileHealthDataSchema = z.object({
  completeness_score: z.number(),
  verified: z.boolean(),
  photos_count: z.number(),
  qa_count: z.number(),
  posts_last_30d: z.number(),
  missing_fields: z.array(z.string()),
  incomplete_fields: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export const qaDataSchema = z.object({
  questions: z.array(
    z.object({
      question_text: z.string(),
      asked_by: z.string(),
      // ISO 8601; null when the listing gave no absolute date
      date: z.string().nullable(),
      time_ago: z.string().nullable().optional(),
      answers: z.array(
        z.object({
          text: z.string(),
          author: z.string(),
          date: z.string().nullable(),
          time_ago: z.string().nullable().optional(),
          upvotes: z.number(),
        })
      ),
    })
  ),
  total_questions: z.number(),
});

export const listingsDataSchema = z.object({
  businesses: z.array(
    z.object({
      name: z.string(),
      rating: z.number().nullable(),
      reviews_count: z.number(),
      address: z.string(),
      phone: z.string(),
      place_id: z.string(),
      categories: z.array(z.string()),
      // Optional for deploy-order compatibility
      city: z.string().optional(),
      website: z.string().optional(),
      cid: z.string().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
  ),
  total_available: z.number(),
  category: z.string().optional(),
  location: z.string().optional(),
  location_used: z.string().optional(),
  search_radius_km: z.number().optional(),
});
