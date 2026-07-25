import { z } from 'zod';

/**
 * BMC's four public-rental housing programs. Source CSVs use Korean labels
 * (매입임대/재개발임대/통합공공임대/행복주택) — see docs/DATA_MODEL.md for the mapping.
 */
export const HousingType = z.enum(['purchased', 'redevelopment', 'integrated', 'happy']);
export type HousingType = z.infer<typeof HousingType>;

/**
 * 상권업종대분류명 from 소상공인시장진흥공단's 상가(상권)정보 dataset (2026.03 cut).
 * Confirmed against the real Busan data file — the OT deck's 8-category list
 * (D/F/L/N/O/P/Q/R) was a stale/generic taxonomy; the actual current data uses
 * these 10. See docs/DATA_MODEL.md.
 */
export const PoiCategory = z.enum([
  'retail', // 소매
  'real_estate', // 부동산
  'food', // 음식
  'facility_leasing', // 시설관리·임대
  'healthcare', // 보건의료
  'education', // 교육
  'lodging', // 숙박
  'arts_sports', // 예술·스포츠
  'repair_personal', // 수리·개인
  'science_tech', // 과학·기술
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
  minAreaM2: z.number().nullable(),
  maxAreaM2: z.number().nullable(),
  minRooms: z.number().nullable(),
  maxRooms: z.number().nullable(),
  hasElevator: z.boolean().nullable(),
  parkingSpots: z.number().nullable(),
});
export type HousingSummary = z.infer<typeof HousingSummary>;

export const HousingSearchQuery = z.object({
  depositMax: z.coerce.number().optional(),
  rentMax: z.coerce.number().optional(),
  builtAfter: z.coerce.number().optional(), // year, e.g. 2020
  roomCount: z.coerce.number().optional(), // minimum room count
  minAreaM2: z.coerce.number().optional(),
  elevatorRequired: z.coerce.boolean().optional(),
  parkingRequired: z.coerce.boolean().optional(),
  district: z.string().optional(), // 구/군, e.g. "수영구"
  type: HousingType.optional(),
  busStopNearby: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(5000).optional(), // server default 2000
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

export const LifeStatWeights = z.object({
  fun: z.number().min(0).max(100),
  work: z.number().min(0).max(100),
  rest: z.number().min(0).max(100),
});
export type LifeStatWeights = z.infer<typeof LifeStatWeights>;

export const WeeklyRoutineInput = z.object({
  commute: z.number().min(0).max(7),
  focus: z.number().min(0).max(7),
  cafe: z.number().min(0).max(7),
  exercise: z.number().min(0).max(7),
  dining: z.number().min(0).max(7),
  culture: z.number().min(0).max(7),
  walking: z.number().min(0).max(7),
  homeRest: z.number().min(0).max(7),
});
export type WeeklyRoutineInput = z.infer<typeof WeeklyRoutineInput>;

export const LifestyleRecommendationRequest = z.object({
  preferences: z.array(LifestylePreference).min(1),
  depositMax: z.number().optional(),
  rentMax: z.number().optional(),
  minAreaM2: z.number().optional(),
  minRoomCount: z.number().optional(),
  elevatorRequired: z.boolean().optional(),
  parkingRequired: z.boolean().optional(),
  district: z.string().optional(),
  type: HousingType.optional(),
  lifeStats: LifeStatWeights.optional(),
  routine: WeeklyRoutineInput.optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
  destinationFrequency: z.number().min(0).max(7).optional(),
  radiusMeters: z.number().positive().default(500),
});
export type LifestyleRecommendationRequest = z.infer<typeof LifestyleRecommendationRequest>;

/** An individual matched place, for plotting pins/trails on the map — not just the aggregate count/distance. */
export const MatchedPoiPoint = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  distanceMeters: z.number(),
});
export type MatchedPoiPoint = z.infer<typeof MatchedPoiPoint>;

export const MatchedPoi = z.object({
  categoryName: z.string(),
  count: z.number(),
  nearestMeters: z.number().nullable(),
  /** Top-N nearest matched places within the radius (capped server-side), for map pins/trails. */
  pois: z.array(MatchedPoiPoint),
});
export type MatchedPoi = z.infer<typeof MatchedPoi>;

export const LifestyleRecommendationResult = z.object({
  housing: HousingSummary,
  score: z.number(),
  matchRate: z.number(),
  breakdown: z.object({
    lifestyle: z.number(),
    routine: z.number(),
    housing: z.number(),
    affordability: z.number(),
  }),
  lifeAxes: z.object({
    fun: z.number(),
    work: z.number(),
    rest: z.number(),
  }),
  neighborhood: z.object({
    residentialRatio: z.number().nullable(),
    commercialRatio: z.number().nullable(),
    greenRatio: z.number().nullable(),
    source: z.enum(['zoning', 'unavailable']),
  }),
  destinationDistanceMeters: z.number().nullable(),
  routineDetails: z.array(
    z.object({
      activity: z.enum([
        'commute',
        'focus',
        'cafe',
        'exercise',
        'dining',
        'culture',
        'walking',
        'homeRest',
      ]),
      requested: z.number(),
      score: z.number(),
      evidence: z.enum(['destination', 'nearbyPoi', 'zoning', 'proxy', 'unavailable']),
    }),
  ),
  matches: z.array(MatchedPoi),
});
export type LifestyleRecommendationResult = z.infer<typeof LifestyleRecommendationResult>;

/** For populating a category picker with real values — see /api/poi/categories. */
export const PoiCategorySummary = z.object({
  categoryName: z.string(),
  count: z.number(),
});
export type PoiCategorySummary = z.infer<typeof PoiCategorySummary>;

/** POI count within the profile radius, by 상권업종대분류명 (Korean label as stored). */
export const NeighborhoodCategory = z.object({
  category: z.string(),
  count: z.number(),
});
export type NeighborhoodCategory = z.infer<typeof NeighborhoodCategory>;

/** A zoning designation's share of the profile radius area (0..1). */
export const NeighborhoodZone = z.object({
  zoneType: z.string(),
  share: z.number(),
});
export type NeighborhoodZone = z.infer<typeof NeighborhoodZone>;

/**
 * The neighborhood profile around one housing project — POI density by
 * category plus the zoning mix, both computed within radiusMeters via
 * PostGIS. See /api/housing/:id/neighborhood.
 */
export const NeighborhoodTrendPoint = z.object({
  year: z.number(),
  count: z.number(),
});
export type NeighborhoodTrendPoint = z.infer<typeof NeighborhoodTrendPoint>;

export const NeighborhoodProfile = z.object({
  radiusMeters: z.number(),
  poiTotal: z.number(),
  categories: z.array(NeighborhoodCategory),
  zones: z.array(NeighborhoodZone),
  emdName: z.string().nullable().optional(),
  storeTrend: z.array(NeighborhoodTrendPoint).optional().default([]),
  trendLabel: z.enum(['rising', 'stable', 'declining']).nullable().optional(),
  youthShare: z.number().nullable().optional(),
  busStopCells: z.number().optional().default(0),
});
export type NeighborhoodProfile = z.infer<typeof NeighborhoodProfile>;

/**
 * A 법정동 boundary shaded by population density — rings are outer
 * polygon rings as [lat, lng] pairs, simplified server-side.
 * See /api/districts/density.
 */
export const DistrictDensity = z.object({
  emdCode: z.string(),
  emdName: z.string(),
  population: z.number(),
  areaKm2: z.number(),
  densityPerKm2: z.number(),
  centroidLat: z.number(),
  centroidLng: z.number(),
  rings: z.array(z.array(z.array(z.number()))),
});
export type DistrictDensity = z.infer<typeof DistrictDensity>;

export const DistrictAmenities = z.object({
  coffee: z.number(),
  convenience: z.number(),
  koreanFood: z.number(),
  pharmacy: z.number(),
  salon: z.number(),
});
export type DistrictAmenities = z.infer<typeof DistrictAmenities>;

/**
 * Public-housing supply measured against where people actually live, per
 * 법정동: BMC stock joined to the 선도소프트 population/industry grid.
 * See /api/districts/supply.
 */
export const DistrictSupply = z.object({
  emdCode: z.string(),
  emdName: z.string(),
  population: z.number(),
  youthShare: z.number().nullable(),
  areaKm2: z.number(),
  densityPerKm2: z.number(),
  projects: z.number(),
  units: z.number(),
  unitsPerThousand: z.number(),
  amenities: DistrictAmenities,
  amenityTotal: z.number(),
  amenitiesPerThousand: z.number(),
  underservedResidents: z.number(),
  supplyGap: z.number(),
});
export type DistrictSupply = z.infer<typeof DistrictSupply>;

export const User = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
});
export type User = z.infer<typeof User>;

export const AuthResponse = z.object({
  token: z.string(),
  user: User,
});
export type AuthResponse = z.infer<typeof AuthResponse>;

export const SignupRequest = z.object({
  username: z.string().min(3).max(32),
  email: z.string().min(3).max(254),
  password: z.string().min(8).max(200),
});
export type SignupRequest = z.infer<typeof SignupRequest>;

export const LoginRequest = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const ChatMessage = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const AlertCriteria = z.object({
  district: z.string().nullable().optional(),
  depositMax: z.number().nullable().optional(),
  builtAfter: z.number().int().nullable().optional(),
  roomCount: z.number().nullable().optional(),
  type: HousingType.nullable().optional(),
});
export type AlertCriteria = z.infer<typeof AlertCriteria>;

/** Why a housing search came back empty — drives the alert offer in chat. */
export const NoMatchContext = z.object({
  reason: z.enum([
    'district_inventory_empty',
    'criteria_no_match',
    'unsupported_region',
    'data_unavailable',
  ]),
  criteria: AlertCriteria,
  districtInventoryCount: z.number().int().nullable().optional(),
  matchingCount: z.literal(0),
  criteriaKey: z.string().nullable().optional(),
});
export type NoMatchContext = z.infer<typeof NoMatchContext>;

export const AiAction = z.object({
  type: z.enum(['subscribe_housing_alert', 'relax_filters']),
});
export type AiAction = z.infer<typeof AiAction>;

export const HousingAlert = z.object({
  id: z.number().int(),
  criteria: AlertCriteria,
  criteriaKey: z.string(),
  sourceMessageId: z.string().uuid().nullable(),
  createdAt: z.string(),
});
export type HousingAlert = z.infer<typeof HousingAlert>;

export const HousingAlertStats = z.object({
  activeAlerts: z.number().int(),
  uniqueUsers: z.number().int(),
  newLast7Days: z.number().int(),
  topDistrict: z.string().nullable(),
  topDistrictCount: z.number().int(),
});
export type HousingAlertStats = z.infer<typeof HousingAlertStats>;

export const AiSearchRequest = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
  /** Data URL of a document the user attached; never persisted server-side. */
  image: z.string().optional(),
});
export type AiSearchRequest = z.infer<typeof AiSearchRequest>;

export const AiSearchResponse = z.object({
  reply: z.string(),
  housing: z.array(HousingSummary),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  /** Present when the turn spawned a 하루 deck to play. */
  gameId: z.string().uuid().nullable().optional(),
  noMatch: NoMatchContext.nullable().optional(),
  actions: z.array(AiAction).default([]),
});
export type AiSearchResponse = z.infer<typeof AiSearchResponse>;

export const AiConversationSummary = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
});
export type AiConversationSummary = z.infer<typeof AiConversationSummary>;

export const AiConversationMessage = ChatMessage.extend({
  id: z.string().uuid(),
  housing: z.array(HousingSummary).default([]),
  /** The 하루 deck this reply spawned, replayed when the chat is reopened. */
  gameId: z.string().uuid().nullable().optional(),
  noMatch: NoMatchContext.nullable().optional(),
  actions: z.array(AiAction).default([]),
});
export type AiConversationMessage = z.infer<typeof AiConversationMessage>;

export const AiConversationDetail = z.object({
  id: z.string().uuid(),
  title: z.string(),
  messages: z.array(AiConversationMessage),
});
export type AiConversationDetail = z.infer<typeof AiConversationDetail>;

/** A model-authored 하루 deck: same trait vocabulary the Life Match engine scores. */
export const GameText = z.object({ ko: z.string(), en: z.string() });
export type GameText = z.infer<typeof GameText>;

export const GameOption = z.object({
  id: z.string(),
  title: GameText,
  caption: GameText,
  meaning: GameText,
  icon: z.string(),
  chips: z.array(GameText).default([]),
  traits: z.record(z.string(), z.number()).default({}),
});
export type GameOption = z.infer<typeof GameOption>;

export const GameQuestion = z.object({
  id: z.string(),
  kicker: GameText,
  title: GameText,
  description: GameText,
  options: z.array(GameOption),
});
export type GameQuestion = z.infer<typeof GameQuestion>;

export const GameResult = z.object({
  stats: z.object({ fun: z.number(), work: z.number(), rest: z.number() }),
  topTraits: z.array(z.string()),
  categories: z.array(z.string()),
  summary: GameText,
  housing: z.array(HousingSummary),
});
export type GameResult = z.infer<typeof GameResult>;

export const GameSession = z.object({
  id: z.string().uuid(),
  theme: z.string(),
  questions: z.array(GameQuestion),
  answers: z.record(z.string(), z.string()).nullable(),
  result: GameResult.nullable(),
  createdAt: z.string(),
});
export type GameSession = z.infer<typeof GameSession>;

export const GameSummary = z.object({
  id: z.string().uuid(),
  theme: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
});
export type GameSummary = z.infer<typeof GameSummary>;
