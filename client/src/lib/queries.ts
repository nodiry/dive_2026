import type { HousingSearchQuery, LifestyleRecommendationRequest } from "@dive2026/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getHousing, listPoiCategories, recommendLifestyle, searchHousing } from "./api";

export function useHousingSearch(query: HousingSearchQuery, enabled: boolean) {
  return useQuery({
    queryKey: ["housing", "search", query],
    queryFn: () => searchHousing(query),
    enabled,
  });
}

export function useHousingDetail(id: number) {
  return useQuery({
    queryKey: ["housing", "detail", id],
    queryFn: () => getHousing(id),
  });
}

export function useLifestyleRecommendation() {
  return useMutation({
    mutationFn: (body: LifestyleRecommendationRequest) => recommendLifestyle(body),
  });
}

export function usePoiCategories() {
  return useQuery({
    queryKey: ["poi", "categories"],
    queryFn: listPoiCategories,
    staleTime: Number.POSITIVE_INFINITY, // this list barely changes within a session
  });
}
