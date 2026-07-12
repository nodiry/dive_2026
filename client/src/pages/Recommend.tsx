import { useState } from "react";
import { HousingCard } from "../components/HousingCard";
import { KakaoMap } from "../components/KakaoMap";
import { TagStrip } from "../components/TagStrip";
import { useLifestyleRecommendation, usePoiCategories } from "../lib/queries";

const RADIUS_OPTIONS = [300, 500, 1000];

export function Recommend() {
  const { data: categories, isLoading: categoriesLoading } = usePoiCategories();
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [district, setDistrict] = useState("");
  const [depositMaxManwon, setDepositMaxManwon] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(500);

  const recommend = useLifestyleRecommendation();
  const selected = Object.keys(weights);

  function toggle(categoryName: string) {
    setWeights((prev) => {
      const next = { ...prev };
      if (categoryName in next) delete next[categoryName];
      else next[categoryName] = 0.7;
      return next;
    });
  }

  function handleSubmit() {
    recommend.mutate({
      preferences: selected.map((categoryName) => ({ categoryName, weight: weights[categoryName] ?? 0.7 })),
      district: district || undefined,
      depositMax: depositMaxManwon ? Number(depositMaxManwon) * 10000 : undefined,
      radiusMeters,
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-extrabold text-marine">취향으로 찾기</h1>
      <p className="mt-2 text-slate">자주 가는 곳을 골라주시면, 가까운 순서로 임대주택을 추천해드려요.</p>

      <section className="mt-8 rounded-2xl border border-slate-light/30 bg-white/60 p-6">
        <h2 className="font-medium text-marine">자주 이용하는 곳을 선택하세요</h2>
        {categoriesLoading && <p className="mt-3 text-sm text-slate">불러오는 중...</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {categories?.map((c) => (
            <button
              key={c.categoryName}
              type="button"
              onClick={() => toggle(c.categoryName)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                c.categoryName in weights
                  ? "border-terracotta bg-terracotta text-white"
                  : "border-slate-light/40 bg-white text-marine hover:border-terracotta/50"
              }`}
            >
              {c.categoryName}
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-light/30 pt-4">
            <p className="text-sm font-medium text-marine">얼마나 중요한가요?</p>
            {selected.map((categoryName) => (
              <label key={categoryName} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-marine">{categoryName}</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={weights[categoryName]}
                  onChange={(e) => setWeights({ ...weights, [categoryName]: Number(e.target.value) })}
                  className="flex-1 accent-terracotta"
                />
                <span className="w-8 shrink-0 font-mono text-slate">{weights[categoryName].toFixed(1)}</span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-4 border-t border-slate-light/30 pt-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-marine">지역 (선택)</span>
            <input
              type="text"
              placeholder="예: 수영구"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-lg border border-slate-light/50 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-marine">보증금 상한 (만원, 선택)</span>
            <input
              type="number"
              min={0}
              placeholder="예: 3000"
              value={depositMaxManwon}
              onChange={(e) => setDepositMaxManwon(e.target.value)}
              className="rounded-lg border border-slate-light/50 bg-white px-3 py-2 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-marine">반경</span>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="rounded-lg border border-slate-light/50 bg-white px-3 py-2"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}m 이내
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled={selected.length === 0 || recommend.isPending}
          onClick={handleSubmit}
          className="mt-6 w-full rounded-lg bg-terracotta px-6 py-3 font-medium text-white transition-colors hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {recommend.isPending ? "찾는 중..." : "추천받기"}
        </button>
      </section>

      {recommend.isError && (
        <p className="mt-6 text-terracotta-dark">추천을 불러오지 못했습니다. 다시 시도해주세요.</p>
      )}

      {recommend.isSuccess && recommend.data.length === 0 && (
        <p className="mt-6 text-slate">
          조건에 맞는 결과가 없어요. 아직 위치 정보가 등록된 임대주택이 없을 수 있어요 — 지오코딩이 완료되면
          결과가 채워집니다.
        </p>
      )}

      {recommend.isSuccess && recommend.data.length > 0 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {recommend.data.map((result) => (
              <HousingCard key={result.housing.id} housing={result.housing}>
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-light/20 pt-3">
                  <TagStrip
                    tags={result.matches.map((m) => ({
                      label: m.categoryName,
                      sublabel: m.count > 0 ? `${m.count}곳 · ${Math.round(m.nearestMeters ?? 0)}m` : "없음",
                      muted: m.count === 0,
                    }))}
                  />
                  <span className="shrink-0 font-mono text-sm text-slate">점수 {result.score.toFixed(1)}</span>
                </div>
              </HousingCard>
            ))}
          </div>
          <div className="lg:sticky lg:top-6 lg:self-start">
            <KakaoMap
              className="aspect-square w-full"
              markers={recommend.data.map((r) => ({
                lat: r.housing.lat ?? NaN,
                lng: r.housing.lng ?? NaN,
                label: r.housing.projectName,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
