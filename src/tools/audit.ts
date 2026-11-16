import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callApi, callApiGet, formatResult, withErrorHandling } from "../api-client.js";
import {
  reputationAuditDataSchema,
  citationAuditJobDataSchema,
} from "../schemas/audit.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

async function pollAsyncJob(
  pollUrl: string,
  auth: string,
  maxWaitMs: number = 180_000
): Promise<{ data: unknown; credits_used: number; credits_remaining: number; cached: boolean }> {
  const start = Date.now();
  let delay = 2000;

  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, delay));
    const result = await callApiGet(pollUrl, auth);
    const data = result.data as Record<string, unknown>;

    if (data.status === "complete") {
      return result;
    }
    if (data.status === "failed") {
      throw new Error((data.error as string) || "Audit job failed");
    }
    delay = Math.min(delay * 1.3, 4000);
  }

  throw new Error("Audit timed out after 3 minutes. The job may still be processing — try polling the status URL.");
}

export function registerAuditTools(server: McpServer, getAuth: () => string) {
  server.registerTool(
    "local_audit",
    {
      description: "Use when running a comprehensive local SEO check: SERP + profile + reviews + competitors in one call. Returns local_pack_position, organic_positions, rating, reviews_count, profile_completeness, review_velocity, competitors, and recommendations. Expensive (50 credits) -- confirm with user first. Async, takes 15-45 seconds.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
      },
      annotations: { ...READ_ONLY, title: "Comprehensive Local SEO Audit" },
    },
    withErrorHandling(async ({ business_name, location }) => {
      const submitResult = await callApi(
        "/v1/audit/local",
        { business_name, location },
        getAuth(),
        30_000
      );
      const submitData = submitResult.data as Record<string, unknown>;

      if (!submitData.job_id) {
        return {
          content: [{ type: "text" as const, text: formatResult(submitResult.data, submitResult) }],
          structuredContent: submitResult.data as Record<string, unknown>,
        };
      }

      const pollUrl = submitData.poll_url as string;
      const result = await pollAsyncJob(pollUrl, getAuth());
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "reputation_audit",
    {
      description: "Use when analyzing cross-platform review reputation with sentiment. Returns reputation_score, per-platform ratings, sentiment themes, response_rate, and recommendations. Costs 30 credits. May take 10-30 seconds.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        location: z.string().describe("City and state"),
      },
      outputSchema: reputationAuditDataSchema,
      annotations: { ...READ_ONLY, title: "Reputation Audit" },
    },
    withErrorHandling(async ({ business_name, location }) => {
      const result = await callApi(
        "/v1/audit/reputation",
        { business_name, location },
        getAuth(),
        120_000
      );
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: result.data as Record<string, unknown>,
      };
    })
  );

  server.registerTool(
    "citation_audit",
    {
      description: "Use when checking NAP (Name, Address, Phone) consistency across business directories. Each directory is searched directly (by phone first, then name and city) and the listing it shows is compared with the business: status is consistent, inconsistent, unverified (a field isn't shown) or not_found (searched, not listed). Found rows include listing_url and the listed name, address and phone. stale: true marks a listing showing details the business used to have, found through a previous phone, a previous name and address, or a linked listing on a sister directory; website matches tie other listings and locations to the business (matched_on: website). Pass website and any previous_* details to find more of these. other_listings holds further listings of the business on the same directory, such as duplicates. check_failed rows could not be searched this time and are not charged; unsupported/defunct rows are directories not checked, also free. By default checks the 18 core directories (incl. Google, Apple, Bing, Facebook, Yelp, Nextdoor and MapQuest; 45 credits) plus the directories for the business's industry, detected from its Google category (up to 58 credits): home services adds Angi, HomeAdvisor, Thumbtack, Houzz and BuildZoom; medical adds Healthgrades, Vitals and Zocdoc; legal adds Avvo, Justia and FindLaw; auto dealers add DealerRater and Cars.com; restaurants add OpenTable and Tripadvisor; lodging adds Tripadvisor. The industry field says which set was added. 2.5 credits per directory checked. Pass aggregators: [\"foursquare\"] to also check Foursquare (10 credits). A full audit can take up to 90 seconds: if it is not done in 45, this returns a job_id; collect the result with citation_audit_status (free) and do not run the audit again.",
      inputSchema: {
        business_name: z.string().describe("Business name"),
        address: z.string().describe("Full business address, e.g. '136 Trademark Dr, Buda, TX 78610'"),
        phone: z.string().describe("Business phone number"),
        directories: z
          .union([z.number().int().min(1).max(53), z.array(z.string()).min(1).max(53)])
          .optional()
          .describe(
            "Optional. Directory names to check, e.g. [\"yellowpages\", \"bbb\"]. Omit for the core directories plus the business's industry set. Names not checked yet come back as unsupported, free."
          ),
        website: z.string().optional().describe("Optional. The business's website, used to recognise listings that show old details"),
        previous_names: z.array(z.string()).max(10).optional().describe("Optional. Former business names, to find stale listings"),
        previous_addresses: z.array(z.string()).max(10).optional().describe("Optional. Former addresses, to find stale listings"),
        previous_phones: z.array(z.string()).max(10).optional().describe("Optional. Former phone numbers, to find stale listings"),
        facebook_url: z.string().optional().describe("Optional. The business's Facebook page. Facebook can't be searched, so it is otherwise found only through links on the business's website or listings"),
        industry: z
          .enum(["auto", "none", "home_services", "medical", "legal", "auto_dealers", "restaurants", "lodging"])
          .optional()
          .describe("Optional. Industry directories to add: auto (default when directories is omitted) picks them from the business's Google category; none adds nothing; or name a set: home_services, medical, legal, auto_dealers, restaurants, lodging"),
        aggregators: z
          .array(z.enum(["foursquare"]))
          .optional()
          .describe("Optional. Data aggregators to check too, at their own price: foursquare (10 credits). Finds listings under old names, addresses and phones"),
      },
      outputSchema: citationAuditJobDataSchema,
      annotations: { ...READ_ONLY, title: "Citation / NAP Consistency Audit" },
    },
    withErrorHandling(async ({ business_name, address, phone, directories, ...stale }) => {
      // A full audit can take 90s (Yelp) and MCP clients give up at about
      // 60: ask for an answer within 45s, and a job_id if it isn't done.
      const result = await callApi(
        "/v1/audit/citation",
        { business_name, address, phone, ...(directories ? { directories } : {}), ...stale, wait_seconds: 45 },
        getAuth(),
        120_000
      );
      const data = result.data as Record<string, unknown>;
      if (data.status === "running") {
        return {
          content: [
            {
              type: "text" as const,
              text:
                `The citation audit is still running (job_id: ${data.job_id}). ` +
                (data.deduplicated
                  ? "An identical audit was already running; this joined it at no charge. "
                  : `${result.credits_used} credits were reserved; checks that fail are refunded. `) +
                "Collect the result with citation_audit_status in about 30 seconds. Do not run the audit again: that would pay for it twice.",
            },
          ],
          structuredContent: data,
        };
      }
      return {
        content: [{ type: "text" as const, text: formatResult(result.data, result) }],
        structuredContent: data,
      };
    })
  );

  server.registerTool(
    "citation_audit_status",
    {
      description:
        "Collects the result of a citation_audit that returned a job_id instead of a result. FREE -- poll as often as you need. Returns status \"running\" until the audit is done (most finish within 90 seconds of starting; wait about 20 seconds between checks), then \"complete\" with the full audit, the same fields citation_audit returns, plus credits_charged, what the audit cost after refunds. \"failed\" means it was interrupted; its credits were refunded.",
      inputSchema: {
        job_id: z.string().min(1).describe("The job_id citation_audit returned."),
      },
      outputSchema: citationAuditJobDataSchema,
      annotations: { ...READ_ONLY, title: "Citation Audit Status" },
    },
    withErrorHandling(async ({ job_id }) => {
      const result = await callApiGet(`/v1/audit/citation/status/${encodeURIComponent(job_id)}`, getAuth());
      const data = result.data as Record<string, unknown>;
      const text =
        data.status === "running"
          ? `Still running (job_id: ${job_id}). Check again in about 20 seconds.`
          : data.status === "failed"
            ? `The audit failed: ${data.error ?? "unknown error"}`
            : formatResult(result.data, result);
      return { content: [{ type: "text" as const, text }], structuredContent: data };
    })
  );
}
