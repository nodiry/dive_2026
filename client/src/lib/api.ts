import {
  HousingSearchQuery,
  HousingSummary,
  LifestyleRecommendationRequest,
  LifestyleRecommendationResult,
  PoiCategorySummary,
} from "@dive2026/shared";
import { z } from "zod";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `request failed (${res.status})`);
  }
  return schema.parse(await res.json());
}

export function searchHousing(query: HousingSearchQuery): Promise<HousingSummary[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }
  return request(`/api/housing?${params}`, z.array(HousingSummary));
}

export function getHousing(id: number): Promise<HousingSummary> {
  return request(`/api/housing/${id}`, HousingSummary);
}

export function recommendLifestyle(
  body: LifestyleRecommendationRequest,
): Promise<LifestyleRecommendationResult[]> {
  return request(`/api/recommendations/lifestyle`, z.array(LifestyleRecommendationResult), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listPoiCategories(): Promise<PoiCategorySummary[]> {
  return request(`/api/poi/categories`, z.array(PoiCategorySummary));
}
