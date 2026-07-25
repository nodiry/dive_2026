import type { HousingType, LifestylePreference } from '@shared';
import { POI_ICON_CATEGORY_NAMES, type PoiIconKey } from '@constants/poi';

export type RoutineKey =
  | "commute"
  | "focus"
  | "cafe"
  | "exercise"
  | "dining"
  | "culture"
  | "walking"
  | "homeRest";

export type WeeklyRoutine = Record<RoutineKey, number>;

export interface LifeProfile {
  depositMaxManwon: string;
  rentMaxManwon: string;
  minAreaM2: string;
  minRoomCount: string;
  district: string;
  type: "" | HousingType;
  elevatorRequired: boolean;
  parkingRequired: boolean;
  hasVehicle: boolean;
  destinationId: string;
  destinationFrequency: string;
}

export interface LifeStats {
  fun: number;
  work: number;
  rest: number;
}

export const ROUTINE_KEYS: RoutineKey[] = [
  "commute",
  "focus",
  "cafe",
  "exercise",
  "dining",
  "culture",
  "walking",
  "homeRest",
];

export const DEFAULT_LIFE_PROFILE: LifeProfile = {
  depositMaxManwon: "3000",
  rentMaxManwon: "35",
  minAreaM2: "26",
  minRoomCount: "1",
  district: "",
  type: "",
  elevatorRequired: false,
  parkingRequired: false,
  hasVehicle: false,
  destinationId: "cityHall",
  destinationFrequency: "5",
};

export const DESTINATIONS = {
  cityHall: { ko: "부산시청", en: "Busan City Hall", lat: 35.1798, lng: 129.075 },
  seomyeon: { ko: "서면역", en: "Seomyeon Station", lat: 35.1578, lng: 129.0592 },
  centum: { ko: "센텀시티역", en: "Centum City Station", lat: 35.1691, lng: 129.1317 },
  busanStation: { ko: "부산역", en: "Busan Station", lat: 35.1151, lng: 129.0414 },
} as const;

export type DestinationId = keyof typeof DESTINATIONS;

export const ROUTINE_PRESETS: Record<"balanced" | "work" | "active" | "home", WeeklyRoutine> = {
  balanced: { commute: 4, focus: 3, cafe: 2, exercise: 2, dining: 2, culture: 1, walking: 3, homeRest: 4 },
  work: { commute: 5, focus: 5, cafe: 3, exercise: 1, dining: 2, culture: 0, walking: 1, homeRest: 2 },
  active: { commute: 4, focus: 2, cafe: 3, exercise: 5, dining: 4, culture: 2, walking: 4, homeRest: 1 },
  home: { commute: 2, focus: 4, cafe: 1, exercise: 1, dining: 1, culture: 1, walking: 3, homeRest: 6 },
};

export const DEFAULT_WEEKLY_ROUTINE = ROUTINE_PRESETS.balanced;

export function deriveLifeStats(routine: WeeklyRoutine): LifeStats {
  const rawFun = routine.cafe + routine.exercise + routine.dining + routine.culture;
  const rawWork = routine.commute + routine.focus;
  const rawRest = routine.walking + routine.homeRest;
  const total = rawFun + rawWork + rawRest;
  if (total === 0) return { fun: 34, work: 33, rest: 33 };

  const fun = Math.round((rawFun / total) * 100);
  const work = Math.round((rawWork / total) * 100);
  return { fun, work, rest: 100 - fun - work };
}

export function buildLifestylePreferences(
  profile: LifeProfile,
  routine: WeeklyRoutine,
  stats: LifeStats,
): LifestylePreference[] {
  const keyScores: Record<PoiIconKey, number> = {
    cafe: routine.cafe * 2 + routine.focus + stats.fun * 0.04,
    convenienceStore: routine.commute + routine.homeRest + stats.work * 0.025 + stats.rest * 0.025,
    gym: routine.exercise * 2.5 + stats.fun * 0.035,
    pharmacy: routine.walking + routine.homeRest + stats.rest * 0.05,
    gasStation: profile.hasVehicle ? routine.commute * 2 + stats.work * 0.03 : 0,
    food: routine.dining * 2.5 + routine.culture + stats.fun * 0.04,
  };
  const maxScore = Math.max(...Object.values(keyScores), 1);

  return (Object.entries(keyScores) as [PoiIconKey, number][]).flatMap(([key, rawScore]) => {
    if (rawScore <= 0) return [];
    const categoryNames = POI_ICON_CATEGORY_NAMES[key];
    const groupWeight = Math.max(0.15, rawScore / maxScore);
    const categoryWeight = groupWeight / categoryNames.length;
    return categoryNames.map((categoryName) => ({ categoryName, weight: categoryWeight }));
  });
}
