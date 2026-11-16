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
  // Zod 4 types the children of a schema as the core $ZodType; every schema
  // built with `z` is also a ZodType, so the casts below are safe.
  const child = (inner: unknown) => lenientOutput(inner as z.ZodTypeAny);
  if (schema instanceof z.ZodObject) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, value] of Object.entries(schema.shape)) {
      // A field that accepts undefined (optional, defaulted, unknown) may be
      // absent from the answer. Zod 3's converter left such fields out of
      // `required`; Zod 4 lists defaulted and unknown ones in output mode,
      // which is how the SDK converts output schemas, so say it explicitly.
      const rebuilt = child(value);
      shape[key] = (value as z.ZodTypeAny).safeParse(undefined).success ? rebuilt.optional() : rebuilt;
    }
    return z.looseObject(shape);
  }
  if (schema instanceof z.ZodArray) return z.array(child(schema.element));
  if (schema instanceof z.ZodOptional) return child(schema.unwrap()).optional();
  if (schema instanceof z.ZodNullable) return child(schema.unwrap()).nullable();
  if (schema instanceof z.ZodDefault) {
    return child(schema.unwrap()).default(schema.def.defaultValue);
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options = schema.options.map(child) as z.ZodObject[];
    return z.discriminatedUnion(schema.def.discriminator, options as [z.ZodObject, ...z.ZodObject[]]);
  }
  if (schema instanceof z.ZodUnion) {
    const options = schema.options.map(child);
    return z.union(options as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }
  if (schema instanceof z.ZodRecord) {
    return z.record(schema.keyType as z.ZodString, child(schema.valueType));
  }
  return schema;
}
