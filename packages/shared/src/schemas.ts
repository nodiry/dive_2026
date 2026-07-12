import { z } from "zod";

/**
 * BMC's four public-rental housing programs. Source CSVs use Korean labels
 * (매입임대/재개발임대/통합공공임대/행복주택) — see docs/DATA_MODEL.md for the mapping.
 */
export const HousingType = z.enum(["purchased", "redevelopment", "integrated", "happy"]);
export type HousingType = z.infer<typeof HousingType>;

/**
 * 상권업종대분류명 from 소상공인시장진흥공단's 상가(상권)정보 dataset (2026.03 cut).
 * Confirmed against the real Busan data file — the OT deck's 8-category list
 * (D/F/L/N/O/P/Q/R) was a stale/generic taxonomy; the actual current data uses
 * these 10. See docs/DATA_MODEL.md.
 */
export const PoiCategory = z.enum([
  "retail", // 소매
  "real_estate", // 부동산
  "food", // 음식
  "facility_leasing", // 시설관리·임대
  "healthcare", // 보건의료
  "education", // 교육
  "lodging", // 숙박
  "arts_sports", // 예술·스포츠
  "repair_personal", // 수리·개인
  "science_tech", // 과학·기술
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

/**
 * Preferences match on `categoryName` (상권업종소분류명, e.g. "카페"/"헬스장"/
 * "편의점"), not the broad `PoiCategory` — that's the granularity the deck's
 * own example query uses, and commercial_poi.category_name carries 247
 * distinct values at that level. See docs/DATA_MODEL.md Part 2.
 */
export const LifestylePreference = z.object({
  categoryName: z.string(),
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
  categoryName: z.string(),
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

/** For populating a category picker with real values — see /api/poi/categories. */
export const PoiCategorySummary = z.object({
  categoryName: z.string(),
  count: z.number(),
});
export type PoiCategorySummary = z.infer<typeof PoiCategorySummary>;
