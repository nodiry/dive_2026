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
};

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
  };
}
