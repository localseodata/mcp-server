import { z } from "zod";

// parent_code/total_count/truncated are optional so this schema also
// validates responses from deployments predating the segment-aware resolver
// (the CI schema-validation job runs branch schemas against the LIVE API).
export const locationSearchDataSchema = z.object({
  locations: z.array(
    z.object({
      name: z.string(),
      code: z.number(),
      // location_type as stored in our location index: "City", "County", "State",
      // "DMA Region", ... (no longer derived from comma counting)
      type: z.string(),
      country: z.string(),
      state: z.string(),
      parent_code: z.number().nullable().optional(),
    })
  ),
  total_count: z.number().optional(),
  truncated: z.boolean().optional(),
});
