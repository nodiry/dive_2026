import { z } from "zod";

/**
 * BMC's four public-rental housing programs. Source CSVs use Korean labels
 * (매입임대/재개발임대/통합공공임대/행복주택) — see docs/DATA_MODEL.md for the mapping.
 */
export const HousingType = z.enum(["purchased", "redevelopment", "integrated", "happy"]);
export type HousingType = z.infer<typeof HousingType>;

/**
 * Sundosoft's 상가-건물 융합정보 category codes (소상공인시장진흥공단 표준 업종 대분류).
 * Extend this list once the real SHP sample is available — treat as provisional.
 */
export const PoiCategory = z.enum([
  "retail", // D 도소매업
  "life_service", // F 생활서비스업
  "real_estate", // L 부동산업
  "leisure", // N 관광/여가/오락
  "lodging", // O 숙박
  "sports", // P 스포츠
  "food", // Q 음식
  "education", // R 학문/교육
]);
export type PoiCategory = z.infer<typeof PoiCategory>;

export const HousingSummary = z.object({
  id: z.number(),
  type: HousingType,
  projectName: z.string(),
  address: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  builtDate: z.string().nullable(),
  totalUnits: z.number().nullable(),
  minDeposit: z.number().nullable(),
  minRent: z.number().nullable(),
});
export type HousingSummary = z.infer<typeof HousingSummary>;

export const HousingSearchQuery = z.object({
  depositMax: z.coerce.number().optional(),
  builtAfter: z.coerce.number().optional(), // year, e.g. 2020
  roomCount: z.coerce.number().optional(),
  district: z.string().optional(), // 구/군, e.g. "수영구"
  type: HousingType.optional(),
});
export type HousingSearchQuery = z.infer<typeof HousingSearchQuery>;

export const LifestylePreference = z.object({
  category: PoiCategory,
  weight: z.number().min(0).max(1), // 0 = ignore, 1 = highest priority
});
export type LifestylePreference = z.infer<typeof LifestylePreference>;

export const LifestyleRecommendationRequest = z.object({
  preferences: z.array(LifestylePreference).min(1),
  depositMax: z.number().optional(),
  district: z.string().optional(),
  radiusMeters: z.number().default(500),
});
export type LifestyleRecommendationRequest = z.infer<typeof LifestyleRecommendationRequest>;

export const MatchedPoi = z.object({
  category: PoiCategory,
  count: z.number(),
  nearestMeters: z.number().nullable(),
});
export type MatchedPoi = z.infer<typeof MatchedPoi>;

export const LifestyleRecommendationResult = z.object({
  housing: HousingSummary,
  score: z.number(),
  matches: z.array(MatchedPoi),
});
export type LifestyleRecommendationResult = z.infer<typeof LifestyleRecommendationResult>;
