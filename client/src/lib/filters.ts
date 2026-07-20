import type { HousingSearchQuery, HousingType } from "@dive2026/shared";

export interface CriteriaFilters {
  depositMaxManwon: string;
  builtAfter: string;
  roomCount: string;
  district: string;
  type: string;
}

export const EMPTY_CRITERIA_FILTERS: CriteriaFilters = {
  depositMaxManwon: "",
  builtAfter: "",
  roomCount: "",
  district: "",
  type: "",
};

export const HOUSING_TYPE_VALUES: HousingType[] = ["purchased", "redevelopment", "integrated", "happy"];

export function toHousingSearchQuery(filters: CriteriaFilters): HousingSearchQuery {
  return {
    depositMax: filters.depositMaxManwon ? Number(filters.depositMaxManwon) * 10000 : undefined,
    builtAfter: filters.builtAfter ? Number(filters.builtAfter) : undefined,
    roomCount: filters.roomCount ? Number(filters.roomCount) : undefined,
    district: filters.district || undefined,
    type: filters.type ? (filters.type as HousingType) : undefined,
  };
}
