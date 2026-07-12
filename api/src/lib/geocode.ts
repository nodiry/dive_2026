/**
 * Kakao Local API address search (server-side geocoding). Needs
 * KAKAO_REST_API_KEY (not KAKAO_MAP_KEY — that's the browser JS-SDK key,
 * different key from the same Kakao app). Untested against a live key (none
 * available while building this — see docs/DATA_MODEL.md Part 3), but this is
 * the standard, documented request/response shape for this endpoint.
 */
export interface GeocodeResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    throw new Error(
      "KAKAO_REST_API_KEY not set. Get one at https://developers.kakao.com/console/app (REST API key, not the JS key).",
    );
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);

  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
  if (!res.ok) {
    throw new Error(`Kakao geocode request failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { documents: { x: string; y: string }[] };
  const doc = data.documents[0];
  if (!doc) return null;
  return { lat: Number(doc.y), lng: Number(doc.x) };
}
