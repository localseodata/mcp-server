import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// The same plugin ships in several marketplace formats (grok/, cursor/,
// antigravity/, and gemini-extension.json at the root, which the Gemini CLI
// gallery requires). Each format keeps its own copy of the skill and its own
// MCP config, so nothing stops one copy drifting from the others. Pin them.

const ENDPOINT = "https://mcp.localseodata.com/mcp";
const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const json = (path: string) => JSON.parse(read(path));

describe("marketplace plugins", () => {
  it("ship one identical skill", () => {
    const canonical = read("grok/skills/local-seo-data/SKILL.md");
    for (const copy of [
      "cursor/skills/local-seo-data/SKILL.md",
      "antigravity/skills/local-seo-data/SKILL.md",
      "gemini/GEMINI.md",
    ]) {
      expect(read(copy), `${copy} differs from grok/skills/local-seo-data/SKILL.md`).toBe(canonical);
    }
  });

  it("point every MCP config at the hosted endpoint", () => {
    const servers: Array<[string, Record<string, unknown>]> = [
      ["grok/.mcp.json", json("grok/.mcp.json").mcpServers.localseodata],
      ["cursor/mcp.json", json("cursor/mcp.json").mcpServers.localseodata],
      ["antigravity/mcp_config.json", json("antigravity/mcp_config.json").mcpServers.localseodata],
      ["gemini-extension.json", json("gemini-extension.json").mcpServers.localseodata],
    ];
    for (const [file, server] of servers) {
      const url = server.url ?? server.serverUrl ?? server.httpUrl;
      expect(url, file).toBe(ENDPOINT);
    }
    expect(json("server.json").remotes[0].url).toBe(ENDPOINT);
  });

  it("use the same plugin name everywhere", () => {
    for (const file of [
      "grok/.grok-plugin/plugin.json",
      "cursor/.cursor-plugin/plugin.json",
      "antigravity/plugin.json",
      "gemini-extension.json",
    ]) {
      expect(json(file).name, file).toBe("local-seo-data");
    }
    const market = json(".cursor-plugin/marketplace.json");
    expect(market.plugins.map((p: { source: string }) => p.source)).toEqual(["cursor"]);
  });

  it("keep server.json versions in step with package.json", () => {
    const version = json("package.json").version;
    const server = json("server.json");
    expect(server.version).toBe(version);
    expect(server.packages[0].version).toBe(version);
  });
});
