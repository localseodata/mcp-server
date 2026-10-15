import { z } from "zod";

export const pageAuditDataSchema = z.object({
  seo_score: z.number(),
  title: z.string(),
  meta_description: z.string(),
  h1: z.array(z.string()),
  word_count: z.number(),
  load_time_ms: z.number(),
  // FID was retired for INP in March 2024. New fields optional for
  // deploy-order compatibility.
  core_web_vitals: z.object({
    lcp: z.number().nullable(),
    cls: z.number().nullable(),
    inp: z.number().nullable().optional(),
    source: z.string().optional(),
    note: z.string().optional(),
  }),
  body_text_unreadable: z.boolean().optional(),
  issues: z.array(
    z.object({
      severity: z.enum(["critical", "warning", "info"]),
      issue: z.string(),
    })
  ),
  schema_markup: z.array(z.string()),
  mobile_friendly: z.boolean(),
});
