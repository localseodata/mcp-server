import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, callApiGet, formatResult, withErrorHandling } from "../api-client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function registerGeogridTools(server: McpServer, getAuth: () => string) {
  server.tool(
    "geogrid_scan",
    "Run a geogrid rank scan to see where a business ranks across a geographic area. Creates a grid of points around the location and checks the business's rank at each point. Returns: `grid` (2D array of rank numbers indexed by row/col, 0 = not found), `grid_points` (flat array where each entry has `row`, `col`, `lat`, `lng`, `rank` — use this when the user asks to plot the grid on a map), `center` ({lat, lng}), `average_rank`, `found_in`, `total_points`. Costs 50 credits (5x5), 98 credits (7x7), or 162 credits (9x9). This is an async operation — the tool will poll until results are ready.",
    {
      business: z.string().describe("Business name to track"),
      place_id: z.string().optional().describe("Google Place ID for precise matching (e.g. ChIJ...). When provided, the business is matched by Place ID instead of name, which is far more reliable."),
      location: z.string().describe("Center location for the grid"),
      keyword: z.string().describe("Search keyword to check rankings for"),
      grid_size: z.enum(["5x5", "7x7", "9x9"]).optional().describe("Grid dimensions. Default: 5x5"),
      radius_miles: z.number().positive().optional().describe("Radius in miles from center. Default: 3"),
    },
    READ_ONLY,
    withErrorHandling(async ({ business, place_id, location, keyword, grid_size, radius_miles }) => {
      // Submit the scan job
      const submitResult = await callApi(
        "/v1/geogrid/scan",
        {
          business,
          ...(place_id && { place_id }),
          location,
          keyword,
          ...(grid_size && { grid_size }),
          ...(radius_miles && { radius_miles }),
        },
        getAuth()
      );

      const jobData = submitResult.data as Record<string, unknown>;

      // If sandbox mode returned complete results immediately
      if (jobData.status === "complete") {
        return { content: [{ type: "text" as const, text: formatResult(jobData, submitResult) }] };
      }

      const jobId = jobData.job_id as string;

      // Poll for results
      const maxWaitMs = 120_000;
      const pollIntervalMs = 3_000;
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        await sleep(pollIntervalMs);

        const statusResult = await callApiGet(
          `/v1/geogrid/status/${jobId}`,
          getAuth()
        );

        const statusData = statusResult.data as Record<string, unknown>;

        if (statusData.status === "complete") {
          return {
            content: [{
              type: "text" as const,
              text: formatResult(statusData, {
                credits_used: submitResult.credits_used,
                credits_remaining: statusResult.credits_remaining,
                cached: false,
              }),
            }],
          };
        }

        if (statusData.status === "failed") {
          return {
            content: [{
              type: "text" as const,
              text: `Geogrid scan failed: ${statusData.error || "Unknown error"}`,
            }],
            isError: true,
          };
        }
      }

      // Timeout — return partial status
      return {
        content: [{
          type: "text" as const,
          text: `Geogrid scan is still running (job_id: ${jobId}). You can check status later. ${submitResult.credits_used} credits were used.`,
        }],
      };
    })
  );
}
