interface LatLng {
  lat: number;
  lng: number;
}

// Korean real-estate listings quote "도보 n분" as distance / 80m, rounded up —
// matched here so the map's walking-time tag reads the way users expect.
const WALK_METERS_PER_MINUTE = 80;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const r = 6371000;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function walkingMinutes(distanceMeters: number): number {
  return Math.max(1, Math.ceil(distanceMeters / WALK_METERS_PER_MINUTE));
}
