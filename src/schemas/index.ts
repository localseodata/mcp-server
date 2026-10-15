import { z } from "zod";

export * from "./shared.js";
export * from "./serp.js";
export * from "./business.js";
export * from "./reviews.js";
export * from "./audit.js";
export * from "./keywords.js";
export * from "./ai-visibility.js";
export * from "./backlinks.js";
export * from "./site.js";
export * from "./competitive.js";
export * from "./report.js";
export * from "./account.js";
export * from "./geogrid.js";
export * from "./locations.js";
export * from "./platforms.js";

import { localPackDataSchema, organicDataSchema, lsaDataSchema, mapsDataSchema, localFinderDataSchema, aiOverviewDataSchema, aiModeDataSchema } from "./serp.js";
import { profileDataSchema, profileHealthDataSchema, qaDataSchema, listingsDataSchema } from "./business.js";
import { googleReviewsDataSchema, velocityDataSchema, multiPlatformDataSchema } from "./reviews.js";
import { localAuditSubmitDataSchema, localAuditCompletedDataSchema, reputationAuditDataSchema, citationAuditDataSchema } from "./audit.js";
import { searchVolumeDataSchema, suggestionsDataSchema, overviewDataSchema, forSiteDataSchema, relatedDataSchema, trendsDataSchema } from "./keywords.js";
import { mentionsDataSchema, topSourcesDataSchema, topPagesDataSchema, visibilityDataSchema, compareDataSchema, keywordDataSchema, llmResponseDataSchema, scraperDataSchema,
  sampleSubmitDataSchema,
  sampleCompletedDataSchema,
  matchDataSchema,
  matchRunsDataSchema,
} from "./ai-visibility.js";
import { summaryDataSchema, gapDataSchema } from "./backlinks.js";
import { pageAuditDataSchema } from "./site.js";
import { competitorAdsDataSchema, brandMentionsDataSchema } from "./competitive.js";
import { competitorGapDataSchema, localAuthorityDataSchema, localOpportunitiesDataSchema } from "./report.js";
import { balanceDataSchema, usageDataSchema, listKeysDataSchema, createKeyDataSchema, revokeKeyDataSchema,
  historyListDataSchema,
} from "./account.js";
import { geogridScanSubmitDataSchema, geogridScanCompletedDataSchema } from "./geogrid.js";
import { locationSearchDataSchema } from "./locations.js";
import { platformSerpDataSchema, platformProfileDataSchema } from "./platforms.js";

// Async endpoints accept both shapes:
//   - submit-pending: live API returns { job_id, status:"pending", ... } and the caller polls /status
//   - completed: sandbox/test environment skips the queue and returns the
//     finished result inline (mirroring what production callers see once
//     their /status poll reaches "complete")
const localAuditResponseSchema = z.union([
  localAuditSubmitDataSchema,
  localAuditCompletedDataSchema,
]);
const geogridScanResponseSchema = z.union([
  geogridScanSubmitDataSchema,
  geogridScanCompletedDataSchema,
]);
const sampleResponseSchema = z.union([
  sampleSubmitDataSchema,
  sampleCompletedDataSchema,
]);
// One answer or a whole sample — the request decides which, so the response
// schema accepts both.
const matchResponseSchema = z.union([matchDataSchema, matchRunsDataSchema]);

export const endpointSchemaMap: Record<string, z.ZodTypeAny> = {
  "/v1/serp/local-pack": localPackDataSchema,
  "/v1/serp/organic": organicDataSchema,
  "/v1/serp/lsa": lsaDataSchema,
  "/v1/serp/maps": mapsDataSchema,
  "/v1/serp/local-finder": localFinderDataSchema,
  "/v1/serp/ai-overview": aiOverviewDataSchema,
  "/v1/serp/ai-mode": aiModeDataSchema,
  "/v1/serp/apple-maps": platformSerpDataSchema,
  "/v1/serp/bing-local": platformSerpDataSchema,

  "/v1/business/profile": profileDataSchema,
  "/v1/profile/health": profileHealthDataSchema,
  "/v1/business/qa": qaDataSchema,
  "/v1/business/listings": listingsDataSchema,
  "/v1/business/apple-profile": platformProfileDataSchema,
  "/v1/business/bing-profile": platformProfileDataSchema,

  "/v1/reviews/google": googleReviewsDataSchema,
  "/v1/business/reviews": googleReviewsDataSchema,
  "/v1/reviews/velocity": velocityDataSchema,
  "/v1/reviews/multi-platform": multiPlatformDataSchema,

  "/v1/audit/local": localAuditResponseSchema,
  "/v1/audit/reputation": reputationAuditDataSchema,
  "/v1/audit/citation": citationAuditDataSchema,
  "/v1/audit/citation-consistency": citationAuditDataSchema,

  "/v1/keywords/search-volume": searchVolumeDataSchema,
  "/v1/keywords/suggestions": suggestionsDataSchema,
  "/v1/keywords/overview": overviewDataSchema,
  "/v1/keywords/for-site": forSiteDataSchema,
  "/v1/keywords/related": relatedDataSchema,
  "/v1/keywords/trends": trendsDataSchema,

  "/v1/ai/mentions": mentionsDataSchema,
  "/v1/ai/top-sources": topSourcesDataSchema,
  "/v1/ai/top-pages": topPagesDataSchema,
  "/v1/ai/visibility": visibilityDataSchema,
  "/v1/ai/compare": compareDataSchema,
  "/v1/ai/keyword-data": keywordDataSchema,
  "/v1/ai/llm-response": llmResponseDataSchema,
  "/v1/ai/scraper": scraperDataSchema,
  "/v1/ai/sample": sampleResponseSchema,
  "/v1/ai/match": matchResponseSchema,
  "/v1/history": historyListDataSchema,

  "/v1/backlinks/summary": summaryDataSchema,
  "/v1/backlinks/gap": gapDataSchema,

  "/v1/site/page-audit": pageAuditDataSchema,

  "/v1/ads/competitor": competitorAdsDataSchema,
  "/v1/brand/mentions": brandMentionsDataSchema,

  "/v1/report/competitor-gap": competitorGapDataSchema,
  "/v1/score/local-authority": localAuthorityDataSchema,
  "/v1/keywords/local-opportunities": localOpportunitiesDataSchema,

  "/v1/account/balance": balanceDataSchema,
  "/v1/account/usage": usageDataSchema,
  "/v1/account/keys": listKeysDataSchema,

  "/v1/geogrid/scan": geogridScanResponseSchema,

  "/v1/locations/search": locationSearchDataSchema,
};
