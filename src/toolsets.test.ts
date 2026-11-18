import { describe, it, expect } from "vitest";
import { createMcpServer } from "./server.js";
import { TOOLSETS, resolveToolset, type ToolsetSlug } from "./toolsets.js";

type ServerInternals = {
  _registeredTools?: Record<string, unknown>;
  server: { _serverInfo: { name: string }; _instructions?: string };
};

function build(toolset?: ToolsetSlug): ServerInternals {
  return createMcpServer(() => "test", toolset) as unknown as ServerInternals;
}

const fullTools = Object.keys(build()._registeredTools ?? {});
const slugs = Object.keys(TOOLSETS) as ToolsetSlug[];

describe("focused toolsets", () => {
  it("leaves the full server unchanged", () => {
    expect(fullTools).toHaveLength(55);
    expect(build().server._serverInfo.name).toBe("localseodata");
  });

  for (const slug of slugs) {
    const toolset = TOOLSETS[slug];

    describe(slug, () => {
      // A misspelled name would silently drop a tool from the list.
      it("only names tools the full server has", () => {
        for (const name of toolset.tools) expect(fullTools, name).toContain(name);
      });

      it("registers exactly its tools", () => {
        const registered = Object.keys(build(slug)._registeredTools ?? {});
        expect(registered.sort()).toEqual([...toolset.tools].sort());
        expect(new Set(toolset.tools).size).toBe(toolset.tools.length);
      });

      it("identifies itself and states its own tool count", () => {
        const server = build(slug).server;
        expect(server._serverInfo.name).toBe(toolset.name);
        expect(server._instructions).toBe(toolset.instructions);
        expect(toolset.instructions).toContain(`${toolset.tools.length} tools`);
      });

      it("only points the agent at tools it can call", () => {
        const mentioned = new Set(toolset.instructions.match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? []);
        for (const word of mentioned) {
          if (fullTools.includes(word)) expect(toolset.tools, word).toContain(word);
        }
      });

      it("keeps the description within directory limits", () => {
        expect(toolset.description.length).toBeLessThanOrEqual(200);
      });
    });
  }
});

describe("resolveToolset", () => {
  it("sends the existing paths to the full server", () => {
    for (const path of ["/", "/mcp", "/mcp/", "/mcp/sse"]) expect(resolveToolset(path), path).toBeNull();
  });

  it("finds each toolset at /<slug>/mcp", () => {
    for (const slug of slugs) {
      expect(resolveToolset(`/${slug}/mcp`)).toBe(slug);
      expect(resolveToolset(`/${slug}/mcp/`)).toBe(slug);
    }
  });

  it("does not treat other paths as MCP endpoints", () => {
    for (const path of ["/reviews", "/bogus/mcp", "/reviews/mcpx", "/health", "/.well-known/oauth-protected-resource"]) {
      expect(resolveToolset(path), path).toBeUndefined();
    }
  });
});

describe("per-toolset attribution", () => {
  it("names the toolset a call came through", async () => {
    const { internalApiHeaders, requestToolset } = await import("./config.js");
    expect(internalApiHeaders()["User-Agent"]).toMatch(/^localseodata-mcp\/[\d.]+$/);
    expect(requestToolset.run("reviews", () => internalApiHeaders()["User-Agent"])).toMatch(/ \(reviews\)$/);
  });

  it("tags signup links with the toolset and points at its own URL", async () => {
    const { keysUrl, missingKeyMessage, requestToolset } = await import("./config.js");
    expect(keysUrl()).not.toContain("utm_campaign");
    requestToolset.run("reviews", () => {
      expect(keysUrl()).toContain("utm_campaign=reviews");
      expect(missingKeyMessage()).toContain("mcp.localseodata.com/reviews/mcp?key=");
    });
  });
});
