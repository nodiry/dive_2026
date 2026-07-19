import { useState } from "react";
import { HousingCard } from "../components/HousingCard";
import { KakaoMap } from "../components/KakaoMap";
import { TagStrip } from "../components/TagStrip";
import { useLocale } from "../lib/i18n/localeContext";
import { useLifestyleRecommendation, usePoiCategories } from "../lib/queries";

const RADIUS_OPTIONS = [300, 500, 1000];

export function Recommend() {
  const { t } = useLocale();
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
      <h1 className="text-3xl font-extrabold text-marine">{t.recommend.title}</h1>
      <p className="mt-2 text-slate">{t.recommend.subtitle}</p>

      <section className="mt-8 rounded-2xl border border-slate-light/30 bg-white/60 p-6">
        <h2 className="font-medium text-marine">{t.recommend.chooseHeading}</h2>
        {categoriesLoading && <p className="mt-3 text-sm text-slate">{t.recommend.loadingCategories}</p>}
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
            <p className="text-sm font-medium text-marine">{t.recommend.importanceHeading}</p>
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
            <span className="font-medium text-marine">{t.recommend.districtLabel}</span>
            <input
              type="text"
              placeholder={t.recommend.districtPlaceholder}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-lg border border-slate-light/50 bg-white px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-marine">{t.recommend.depositMaxLabel}</span>
            <input
              type="number"
              min={0}
              placeholder={t.recommend.depositMaxPlaceholder}
              value={depositMaxManwon}
              onChange={(e) => setDepositMaxManwon(e.target.value)}
              className="rounded-lg border border-slate-light/50 bg-white px-3 py-2 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-marine">{t.recommend.radiusLabel}</span>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="rounded-lg border border-slate-light/50 bg-white px-3 py-2"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {t.units.radiusOption(r)}
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
          {recommend.isPending ? t.recommend.submitting : t.recommend.submit}
        </button>
      </section>

      {recommend.isError && <p className="mt-6 text-terracotta-dark">{t.recommend.error}</p>}

      {recommend.isSuccess && recommend.data.length === 0 && (
        <p className="mt-6 text-slate">{t.recommend.emptyResult}</p>
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
                      sublabel:
                        m.count > 0 ? t.units.matchCount(m.count, Math.round(m.nearestMeters ?? 0)) : t.units.matchNone,
                      muted: m.count === 0,
                    }))}
                  />
                  <span className="shrink-0 font-mono text-sm text-slate">
                    {t.recommend.scoreLabel} {result.score.toFixed(1)}
                  </span>
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
