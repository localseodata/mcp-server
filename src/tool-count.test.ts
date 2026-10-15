import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createMcpServer } from "./server.js";
import { AGENT_INSTRUCTIONS } from "./instructions.js";

/** Every registered tool name, read off the server the clients actually get. */
function registeredTools(): string[] {
  const server = createMcpServer(() => "test") as unknown as {
    _registeredTools?: Record<string, unknown>;
  };
  return Object.keys(server._registeredTools ?? {});
}

/** The count a piece of copy advertises, e.g. "53 local SEO data tools". */
function advertisedCount(text: string): number[] {
  return [...text.matchAll(/(\d+) local SEO data tools/g)].map((m) => Number(m[1]));
}

// The count is written into the server description, the agent instructions and
// the published package files, and nothing recomputed it when a tool was added. It
// drifted to 43 while 53 were registered, which is the first thing an agent
// reads about this server and the last thing anyone thinks to check. Pin it.
describe("advertised tool count", () => {
  const files = [
    "./server.ts",
    "../server.json",
    "../package.json",
    "../README.md",
  ];

  it("matches the number of tools the server registers", () => {
    const actual = registeredTools().length;

    for (const file of files) {
      const claimed = advertisedCount(readFileSync(new URL(file, import.meta.url), "utf8"));
      expect(claimed, `${file} should state the tool count exactly once`).toHaveLength(1);
      expect(claimed[0], `${file} advertises ${claimed[0]} tools, ${actual} are registered`).toBe(
        actual
      );
    }

    const instructions = advertisedCount(AGENT_INSTRUCTIONS);
    expect(instructions).toEqual([actual]);
  });

  // Tool names are the API: renaming one silently breaks every saved prompt
  // and workflow that calls it.
  it("registers each tool under exactly one name", () => {
    const names = registeredTools();
    expect(new Set(names).size).toBe(names.length);
  });
});
