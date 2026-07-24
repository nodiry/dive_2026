import { Coffee, Dumbbell, Fuel, Pill, Store, Utensils, type LucideIcon } from 'lucide-react';

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

export type CategoryWeights = Partial<Record<PoiIconKey, number>>;

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
  return key ? POI_ICON_COLORS[key] : '#8a969a'; // slate-light fallback
}

export interface AggregatedMatch {
  key: PoiIconKey;
  count: number;
  nearestMeters: number | null;
}

/**
 * Rolls per-real-category matches (e.g. up to 10 for the grouped "food"
 * button) back up to one entry per icon the user actually picked, so the
 * result card's TagStrip shows "음식점 · 12곳 · 40m", not ten separate rows.
 */
export function aggregateMatchesByIcon(
  matches: { categoryName: string; count: number; nearestMeters: number | null }[],
): AggregatedMatch[] {
  const byKey = new Map<PoiIconKey, AggregatedMatch>();
  for (const m of matches) {
    const key = poiIconKeyForCategoryName(m.categoryName);
    if (!key) continue;
    const existing = byKey.get(key) ?? { key, count: 0, nearestMeters: null };
    existing.count += m.count;
    if (
      m.nearestMeters != null &&
      (existing.nearestMeters == null || m.nearestMeters < existing.nearestMeters)
    ) {
      existing.nearestMeters = m.nearestMeters;
    }
    byKey.set(key, existing);
  }
  return POI_ICON_KEYS.filter((k) => byKey.has(k)).map((k) => byKey.get(k)!);
}
