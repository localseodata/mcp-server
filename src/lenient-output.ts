import { z } from "zod";

// Output schemas describe what a tool returns; they must not forbid what it
// might ALSO return. Converted as-is, every z.object advertises
// `additionalProperties: false`, and clients that validate structuredContent
// (the Anthropic MCP connector does) reject the whole call over one extra
// field. That broke organic_serp outright — it always returns location_used,
// which its schema never listed — and page_audit whenever the cache served
// an answer from before a field was removed. Response shapes grow additively
// and caches outlive deploys, so the advertised contract is "at least these
// fields", at every level.

/** Deep copy of a schema with every object accepting unknown keys. */
export function lenientOutput(schema: z.ZodTypeAny): z.ZodTypeAny {
  const out = rebuild(schema);
  return schema.description && out !== schema ? out.describe(schema.description) : out;
}

function rebuild(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodObject) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, value] of Object.entries(schema.shape as Record<string, z.ZodTypeAny>)) {
      shape[key] = lenientOutput(value);
    }
    return z.object(shape).passthrough();
  }
  if (schema instanceof z.ZodArray) return z.array(lenientOutput(schema.element));
  if (schema instanceof z.ZodOptional) return lenientOutput(schema.unwrap()).optional();
  if (schema instanceof z.ZodNullable) return lenientOutput(schema.unwrap()).nullable();
  if (schema instanceof z.ZodDefault) {
    return lenientOutput(schema._def.innerType).default(schema._def.defaultValue());
  }
  if (schema instanceof z.ZodUnion) {
    const options = (schema.options as z.ZodTypeAny[]).map(lenientOutput);
    return z.union(options as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options = (schema.options as z.ZodTypeAny[]).map(lenientOutput) as z.ZodObject<z.ZodRawShape>[];
    return z.discriminatedUnion(
      schema.discriminator,
      options as [z.ZodObject<z.ZodRawShape>, ...z.ZodObject<z.ZodRawShape>[]]
    );
  }
  if (schema instanceof z.ZodRecord) return z.record(schema.keySchema, lenientOutput(schema.valueSchema));
  return schema;
}
