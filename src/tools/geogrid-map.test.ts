import { describe, it, expect, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGeogridTools } from "./geogrid.js";

type Handler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; data?: string; mimeType?: string; text?: string }>;
  isError?: boolean;
}>;

function geogridMap(): Handler {
  const server = new McpServer({ name: "test", version: "0" });
  registerGeogridTools(server, () => "Bearer key");
  const tools = (server as unknown as { _registeredTools: Record<string, { handler: Handler }> })._registeredTools;
  return tools.geogrid_map.handler;
}

afterEach(() => vi.unstubAllGlobals());

describe("geogrid_map", () => {
  it("returns the map as an image block with a credits line", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          request_id: "req_1",
          credits_used: 2,
          credits_remaining: 98,
          cached: false,
          data: {
            job_id: "geo_abc",
            image_base64: "AAAA",
            mime_type: "image/webp",
            width: 1600,
            height: 1600,
            style: "light",
            format: "webp",
            business_name: "Joe's Plumbing",
            keyword: "plumber",
            atrp: 10.1,
            found: 24,
            compared_to: { job_id: "geo_old", date: "2026-10-01T12:04:00.000Z", atrp: 12.4 },
            points: 25,
            attribution: "© OpenMapTiles © OpenStreetMap contributors",
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await geogridMap()({ job_id: "geo_abc", size: 600, style: "dark", compare: false });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]).toEqual({ type: "image", data: "AAAA", mimeType: "image/webp" });
    expect(result.content[1].text).toBe(
      `[2 credits used | 98 remaining] Geogrid map: Joe's Plumbing, "plumber", found at 24/25 points, average rank 10.1 counting not-found points as 21 (the scan's average_rank counts found points only). It was 12.4 on 2026-10-01. © OpenMapTiles © OpenStreetMap contributors`
    );
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/v1\/geogrid\/map$/);
    // Chat clients cap tool results, so the tool always asks for a 1x WebP.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ job_id: "geo_abc", format: "webp", scale: 1, size: 600, style: "dark", compare: false });
  });

  // An image over the client's result cap would be dropped, so the summary goes back alone.
  it("returns the summary without the image when it is too large for a chat client", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "success",
            request_id: "req_3",
            credits_used: 2,
            credits_remaining: 96,
            cached: false,
            data: {
              job_id: "geo_abc", image_base64: "A".repeat(150_000), mime_type: "image/webp", width: 1000, height: 1000,
              style: "light", format: "webp", business_name: "Joe's Plumbing", keyword: "plumber", atrp: 10.1,
              found: 24, compared_to: null, points: 25, attribution: "© OpenMapTiles © OpenStreetMap contributors",
            },
          }),
          { status: 200 }
        )
      )
    );
    const result = await geogridMap()({ job_id: "geo_abc", size: 800 });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain("credits were spent");
  });

  it("tells the agent to wait when the scan has not finished", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "error",
            request_id: "req_2",
            error: { code: "job_not_complete", message: "This scan hasn't finished. Poll the status until it is complete." },
          }),
          { status: 409 }
        )
      )
    );
    const result = await geogridMap()({ job_id: "geo_abc" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("hasn't finished");
  });
});
