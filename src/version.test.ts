import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { MCP_SERVER_VERSION } from "./version.js";

describe("MCP server version", () => {
  it("matches package.json", () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { version: string };
    expect(MCP_SERVER_VERSION).toBe(pkg.version);
  });
});
