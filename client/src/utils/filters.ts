import type { HousingSearchQuery, HousingType } from '@shared';

export interface CriteriaFilters {
  depositMaxManwon: string;
  rentMaxManwon: string;
  builtAfter: string;
  roomCount: string;
  minAreaM2: string;
  elevatorRequired: boolean;
  parkingRequired: boolean;
  district: string;
  type: string;
  busStopNearby: boolean;
}

export const EMPTY_CRITERIA_FILTERS: CriteriaFilters = {
  depositMaxManwon: '',
  rentMaxManwon: '',
  builtAfter: '',
  roomCount: '',
  minAreaM2: '',
  elevatorRequired: false,
  parkingRequired: false,
  district: '',
  type: '',
  busStopNearby: false,
};

/**
 * The map needs every matching project, not a page of them: pins are the
 * whole point of Explore and the policy report aggregates over the full set.
 * The API caps this at 5000 and defaults to 2000 on its own.
 */
export const HOUSING_QUERY_LIMIT = 2000;

export const HOUSING_TYPE_VALUES: HousingType[] = [
  'purchased',
  'redevelopment',
  'integrated',
  'happy',
];

export function toHousingSearchQuery(filters: CriteriaFilters): HousingSearchQuery {
  return {
    depositMax: filters.depositMaxManwon ? Number(filters.depositMaxManwon) * 10000 : undefined,
    rentMax: filters.rentMaxManwon ? Number(filters.rentMaxManwon) * 10000 : undefined,
    builtAfter: filters.builtAfter ? Number(filters.builtAfter) : undefined,
    roomCount: filters.roomCount ? Number(filters.roomCount) : undefined,
    minAreaM2: filters.minAreaM2 ? Number(filters.minAreaM2) : undefined,
    elevatorRequired: filters.elevatorRequired || undefined,
    parkingRequired: filters.parkingRequired || undefined,
    district: filters.district || undefined,
    type: filters.type ? (filters.type as HousingType) : undefined,
    busStopNearby: filters.busStopNearby || undefined,
    limit: HOUSING_QUERY_LIMIT,
  };
}
