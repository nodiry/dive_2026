import type { CategoryWeights } from '@/constants/poi';
import type { HousingSearchQuery, HousingType } from '@/shared/schemas';

export type ExploreMode = 'criteria' | 'preference';

export interface ExploreFilters {
  district: string;
  type: HousingType | '';
  depositMaxManwon: string;
  roomCount: string;
  builtAfter: string;
}

export const EMPTY_FILTERS: ExploreFilters = {
  district: '',
  type: '',
  depositMaxManwon: '',
  roomCount: '',
  builtAfter: '',
};

export const HOUSING_TYPES: HousingType[] = [
  'purchased',
  'redevelopment',
  'integrated',
  'happy',
];

export const DEFAULT_RADIUS = 500;

/** Blank and zero both mean "not filtering", so neither may reach the API. */
export function positiveNumber(value: string, multiplier = 1): number | undefined {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed * multiplier : undefined;
}

export function toHousingQuery(filters: ExploreFilters): HousingSearchQuery {
  const number = positiveNumber;
  return {
    district: filters.district || undefined,
    type: filters.type || undefined,
    depositMax: number(filters.depositMaxManwon, 10000),
    roomCount: number(filters.roomCount),
    builtAfter: number(filters.builtAfter),
  };
}

export function countActiveFilters(
  filters: ExploreFilters,
  mode: ExploreMode,
  weights: CategoryWeights,
): number {
  const base = Object.values(filters).filter(Boolean).length;
  return mode === 'preference' ? base + Object.keys(weights).length : base;
}
