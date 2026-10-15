import { z } from "zod";

export const responseEnvelope = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.literal("success"),
    request_id: z.string(),
    credits_used: z.number(),
    credits_remaining: z.number(),
    cached: z.boolean(),
    data: dataSchema,
  });

export const ratingSchema = z.number().nullable();

export const coordinatesSchema = z.object({
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

export const citedSourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  domain: z.string(),
});
