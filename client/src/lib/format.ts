export function formatWon(amount: number | null): string {
  if (amount == null) return "정보 없음";
  return `${Math.round(amount / 10000).toLocaleString("ko-KR")}만원`;
}
