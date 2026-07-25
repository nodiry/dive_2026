import type { TFunction } from 'i18next';

export type PoiIconKey = 'cafe' | 'convenienceStore' | 'gym' | 'pharmacy' | 'gasStation' | 'food';

export type CategoryWeights = Record<string, number>;

export const POI_FALLBACK_COLOR = '#948DA6';

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

export const POI_ICON_COLORS: Record<PoiIconKey, string> = {
  cafe: '#E2592E',
  food: '#D9A441',
  convenienceStore: '#3F7FB0',
  gym: '#C2508A',
  pharmacy: '#3F9D72',
  gasStation: '#A8642F',
};

export const POI_ICON_NAMES: Record<PoiIconKey, string> = {
  cafe: 'cafe-outline',
  food: 'restaurant-outline',
  convenienceStore: 'storefront-outline',
  gym: 'barbell-outline',
  pharmacy: 'medkit-outline',
  gasStation: 'car-outline',
};

export const POI_ICON_KEYS: PoiIconKey[] = [
  'cafe',
  'food',
  'convenienceStore',
  'gym',
  'pharmacy',
  'gasStation',
];

export function poiIconKeyForCategoryName(categoryName: string): PoiIconKey | undefined {
  return POI_ICON_KEYS.find((key) => POI_ICON_CATEGORY_NAMES[key].includes(categoryName));
}

export function poiColorForCategoryName(categoryName: string): string {
  const key = poiIconKeyForCategoryName(categoryName);
  return key ? POI_ICON_COLORS[key] : POI_FALLBACK_COLOR;
}

export function poiIconNameForCategoryName(categoryName: string): string {
  const key = poiIconKeyForCategoryName(categoryName);
  return key ? POI_ICON_NAMES[key] : 'location-outline';
}

export function poiCategoryLabel(categoryName: string, t: TFunction): string {
  const key = poiIconKeyForCategoryName(categoryName);
  if (key && key !== 'food') return t(`poiCategoryLabels.${key}`);
  return t(`poiCategoryNames.${categoryName}`, { defaultValue: categoryName });
}
