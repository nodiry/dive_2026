import { useParams } from "react-router";
import { KakaoMap } from "../components/KakaoMap";
import { formatWon } from "../lib/format";
import { useHousingDetail } from "../lib/queries";

const TYPE_LABEL: Record<string, string> = {
  purchased: "매입임대",
  redevelopment: "재개발임대",
  integrated: "통합공공임대",
  happy: "행복주택",
};

export function Detail() {
  const { id } = useParams();
  const housingId = Number(id);
  const { data: housing, isLoading, isError } = useHousingDetail(housingId);

  if (isLoading) return <div className="mx-auto max-w-3xl px-6 py-12 text-slate">불러오는 중...</div>;
  if (isError || !housing) {
    return <div className="mx-auto max-w-3xl px-6 py-12 text-terracotta-dark">해당 임대주택을 찾을 수 없습니다.</div>;
  }

  const specs: { label: string; value: string }[] = [
    { label: "유형", value: TYPE_LABEL[housing.type] ?? housing.type },
    { label: "주소", value: housing.address },
    { label: "준공/사용승인일", value: housing.builtDate ?? "정보 없음" },
    { label: "세대수", value: housing.totalUnits != null ? `${housing.totalUnits}세대` : "정보 없음" },
    { label: "보증금", value: formatWon(housing.minDeposit) },
    { label: "월 임대료", value: formatWon(housing.minRent) },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <span className="inline-block rounded-full bg-marine/10 px-2.5 py-0.5 text-xs font-medium text-marine">
        {TYPE_LABEL[housing.type] ?? housing.type}
      </span>
      <h1 className="mt-2 text-3xl font-extrabold text-marine">{housing.projectName}</h1>
      <p className="mt-1 text-slate">{housing.address}</p>

      <dl className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-slate-light/30 bg-white/60 p-6 sm:grid-cols-3">
        {specs.map((spec) => (
          <div key={spec.label}>
            <dt className="text-xs text-slate">{spec.label}</dt>
            <dd className="font-mono text-marine">{spec.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <h2 className="mb-3 font-medium text-marine">위치</h2>
        <KakaoMap className="aspect-video w-full" markers={[{ lat: housing.lat ?? NaN, lng: housing.lng ?? NaN }]} />
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-light/50 bg-mist-dim p-6 text-center text-sm text-slate">
        주변 상권 정보는 이 주택의 위치 정보(지오코딩)가 등록되면 표시됩니다.
      </div>
    </div>
  );
}
