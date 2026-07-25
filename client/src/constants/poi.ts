import type { TFunction } from 'i18next';
import { Coffee, Dumbbell, Fuel, MapPin, Pill, Store, Utensils, type LucideIcon } from 'lucide-react';

/**
 * The preference-mode icon bar shows only real commercial_poi category_name
 * values (verified against the live data, see docs/DATA_MODEL.md Part 2) —
 * no invented categories like parking or EV charging, which this dataset
 * (a 상가/business registry) simply doesn't cover.
 *
 * "food" is a curated bundle of the top food-related category_name values,
 * not a single real value — the raw data has no umbrella "restaurant"
 * category, it's split across dozens of granular types. Drinking-focused
 * venues (요리 주점, 일반 유흥 주점) are deliberately excluded so this reads
 * as "restaurant," not "restaurant + bar."
 */
export type PoiIconKey = 'cafe' | 'convenienceStore' | 'gym' | 'pharmacy' | 'gasStation' | 'food';

/** Preferences are keyed by the real category_name (e.g. "카페", "치킨") — not just the 6 curated icon keys. */
export type CategoryWeights = Record<string, number>;

/** Generic anchor for any real category outside the 6 curated icon keys (most of the ~40 real values). */
export const POI_FALLBACK_ICON: LucideIcon = MapPin;
export const POI_FALLBACK_COLOR = '#8a969a'; // slate-light

export const FOOD_GROUP_CATEGORY_NAMES = [
  '백반/한정식',
  '김밥/만두/분식',
  '치킨',
  '중국집',
  '국/탕/찌개류',
  '경양식',
  '일식 회/초밥',
  '국수/칼국수',
  '돼지고기 구이/찜',
  '횟집',
];

export const POI_ICON_CATEGORY_NAMES: Record<PoiIconKey, string[]> = {
  cafe: ['카페'],
  convenienceStore: ['편의점'],
  gym: ['헬스장'],
  pharmacy: ['약국'],
  gasStation: ['주유소'],
  food: FOOD_GROUP_CATEGORY_NAMES,
};

// A small qualitative "map pin" palette, distinct from (but harmonious
// with) the core marine/mist/terracotta/gold/slate theme — these need to
// stay visually distinguishable as dots on a map, which 5 shades of one
// hue can't do. See docs/DESIGN.md.
export const POI_ICON_COLORS: Record<PoiIconKey, string> = {
  cafe: '#e2592e', // terracotta
  food: '#d9a441', // gold
  convenienceStore: '#3f7fb0', // blue
  gym: '#6b4fa0', // violet
  pharmacy: '#3f9d72', // green
  gasStation: '#a8642f', // amber
};

export const POI_ICON_GLYPHS: Record<PoiIconKey, LucideIcon> = {
  cafe: Coffee,
  convenienceStore: Store,
  gym: Dumbbell,
  pharmacy: Pill,
  gasStation: Fuel,
  food: Utensils,
};

export const POI_ICON_KEYS: PoiIconKey[] = [
  'cafe',
  'food',
  'convenienceStore',
  'gym',
  'pharmacy',
  'gasStation',
];

/** categoryName (real API value) -> the icon key it belongs to, for coloring POI map pins. */
export function poiIconKeyForCategoryName(categoryName: string): PoiIconKey | undefined {
  for (const key of POI_ICON_KEYS) {
    if (POI_ICON_CATEGORY_NAMES[key].includes(categoryName)) return key;
  }
  return undefined;
}

export function poiColorForCategoryName(categoryName: string): string {
  const key = poiIconKeyForCategoryName(categoryName);
  return key ? POI_ICON_COLORS[key] : POI_FALLBACK_COLOR;
}

export function poiIconForCategoryName(categoryName: string): LucideIcon {
  const key = poiIconKeyForCategoryName(categoryName);
  return key ? POI_ICON_GLYPHS[key] : POI_FALLBACK_ICON;
}

/**
 * Display label for a real category_name. The 5 single-mapped curated keys
 * (cafe/convenienceStore/gym/pharmacy/gasStation) get their nice localized
 * label; everything else — including individual "food" group members like
 * 치킨/중국집, now selectable on their own rather than bundled — falls back
 * to its own translated entry (`poiCategoryNames.*`), or the raw Korean
 * string itself if a real category slips in without one.
 */
export function poiCategoryLabel(categoryName: string, t: TFunction): string {
  const key = poiIconKeyForCategoryName(categoryName);
  if (key && key !== 'food') return t(`poiCategoryLabels.${key}`);
  return t(`poiCategoryNames.${categoryName}`, { defaultValue: categoryName });
}
