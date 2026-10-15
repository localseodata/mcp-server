import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, callApiGet, formatResult, withErrorHandling } from "../api-client.js";
import { geogridStatusDataSchema } from "../schemas/geogrid.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function registerGeogridTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "geogrid_scan",
    {
      description: "Use when mapping where a business ranks across a geographic area. Read-only: it checks public Google Maps rankings at each point of a grid and changes nothing. Ranks count organic listings only (ads are skipped), top 20. Returns: grid (2D array, 0 = not found), grid_points (flat array with row, col, lat, lng, rank, status -- use for map plotting), center, average_rank (ARP), atrp (not found = 21), solv (% of points in the top 3), found_in, failed_points, total_points. Set include_listings to also get the top 20 businesses at every point (competitor analysis). Expensive: 2 cr per point -- 18 cr (3x3), 50 cr (5x5, the default), 98 cr (7x7), 162 cr (9x9); confirm with user first. Points that could not be checked are refunded. Usually takes 30-60 seconds; this tool waits for the result.\n\nIF THE RESULT IS NOT READY IN TIME: a 9x9 can take longer than the wait. You then get a job_id instead of a grid -- fetch the grid with geogrid_status, which is free. Calling geogrid_scan again with the same inputs returns that same lookup at 0 credits rather than running a second one, and a finished grid is cached for 24 hours -- but geogrid_status is the way to get the grid.",
      inputSchema: {
        business: z.string().optional().describe("Business name to track. Required unless place_id is given."),
        place_id: z.string().optional().describe("Google Place ID for precise matching (e.g. ChIJ...). When provided, the business is matched by Place ID instead of name, which is far more reliable."),
        location: z.string().optional().describe("Center location for the grid, e.g. \"Buffalo, NY\". Required unless center is given."),
        center: z.object({ lat: z.number(), lng: z.number() }).optional().describe("Exact grid center. Use the business's own coordinates to track it over time; overrides location."),
        keyword: z.string().describe("Search keyword to check rankings for"),
        grid_size: z.enum(["3x3", "5x5", "7x7", "9x9"]).optional().describe("Grid dimensions. Default: 5x5. Larger grids cost more (2 cr per point)."),
        radius_miles: z.number().positive().optional().describe("Radius in miles from center. Default: 3"),
        zoom: z.union([z.literal("auto"), z.number().int().min(3).max(21)]).optional().describe("Maps zoom each point searches at. Default: auto (14). Fix it only to match an existing series."),
        include_listings: z.boolean().optional().describe("Also return the top 20 organic listings at every point. Default: false. Same price; larger response."),
      },
      annotations: { ...READ_ONLY, title: "Geogrid Rank Scan" },
    },
    withErrorHandling(async ({ business, place_id, location, center, keyword, grid_size, radius_miles, zoom, include_listings }) => {
      const submitResult = await callApi(
        "/v1/geogrid/scan",
        {
          ...(business && { business }),
          ...(place_id && { place_id }),
          ...(location && { location }),
          ...(center && { center }),
          keyword,
          ...(grid_size && { grid_size }),
          ...(radius_miles && { radius_miles }),
          ...(zoom !== undefined && { zoom }),
          ...(include_listings !== undefined && { include_listings }),
        },
        getAuth()
      );

      const jobData = submitResult.data as Record<string, unknown>;

      // Test on the GRID, not on the status. A sandbox key answers inline with
      // the whole scan, and so does a cache hit — those are finished results.
      // But a submit that matched a scan already run answers "complete" with
      // only a job id and a poll URL, and returning that stub as the result
      // would hand back a scan with no grid in it. Reachable whenever the
      // worker skipped caching: a scan that found nothing, or one that
      // answered to a callback_url.
      if (Array.isArray(jobData.grid)) {
        return {
          content: [{ type: "text" as const, text: formatResult(jobData, submitResult) }],
          structuredContent: jobData,
        };
      }

      const jobId = jobData.job_id as string;

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
            structuredContent: statusData,
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

      // The scan is still running and already paid for. Until geogrid_status
      // existed this was a dead end: the job_id was printed with nothing to
      // poll it with, so the usual next move was to run the scan again and
      // pay for it twice.
      return {
        content: [{
          type: "text" as const,
          text: `Geogrid scan is still running (job_id: ${jobId}). ${submitResult.credits_used} credits were used. Collect it with geogrid_status — do not submit the scan again.`,
        }],
      };
    })
  );

  server.registerTool(
    "geogrid_status",
    {
      description: "Collects the grid from a geogrid_scan that returned a job_id instead of a result. FREE -- poll as often as you need.\n\nReturns status \"pending\" or \"running\" while the grid is being searched, \"complete\" with the full grid once done, and \"failed\" with an error if the scan died (it is refunded). Most scans finish inside geogrid_scan itself and never need this; a scan that runs long is the one that does.\n\nPoints that could not be checked have status \"error\" in grid_points, are counted in failed_points, and are refunded.\n\nREADING THE GRID: grid is a 2D array where 0 means the business was not found at that point, not that it ranked zero. average_rank and found_in count only the points where it WAS found, so a strong average_rank across a low found_in means the business ranks well in a small area and is invisible outside it -- which is the finding a geogrid exists to produce.",
      inputSchema: {
        job_id: z.string().min(1).describe("The job_id geogrid_scan returned instead of a grid."),
      },
      outputSchema: geogridStatusDataSchema,
      annotations: { ...READ_ONLY, title: "Geogrid Scan Status" },
    },
    withErrorHandling(async ({ job_id }) => {
      const result = await callApiGet(
        `/v1/geogrid/status/${encodeURIComponent(job_id)}`,
        getAuth()
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );
}
