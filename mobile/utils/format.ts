export function formatWon(amount: number | null | undefined, fallback = '-'): string {
  if (amount == null) return fallback;
  return `${Math.round(amount / 10000).toLocaleString('ko-KR')}만원`;
}

export function formatArea(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${min}~${max}㎡`;
  return `${max ?? min}㎡`;
}

export function formatMeters(meters: number | null | undefined, fallback = '-'): string {
  if (meters == null) return fallback;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(Math.round(meters / 100) / 10).toFixed(1)}km`;
}
