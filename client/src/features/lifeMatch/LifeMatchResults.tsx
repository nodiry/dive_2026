import type { LifestyleRecommendationResult } from '@shared';
import { CheckCircle2, MapPin, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { KakaoMap, type HousingMarker } from '@components/KakaoMap';
import { formatWon } from '@utils/money';
import type { Translations } from "../../lib/i18n/translations";
import type { LifeProfile } from "./model";

interface LifeMatchResultsProps {
  results: LifestyleRecommendationResult[];
  profile: LifeProfile;
  pending: boolean;
  error: boolean;
  onProfileChange: (profile: LifeProfile) => void;
  onRecalculate: (profile?: LifeProfile) => void;
  t: Translations;
}

type BreakdownKey = keyof LifestyleRecommendationResult["breakdown"];

function breakdownEntries(result: LifestyleRecommendationResult, t: Translations) {
  const labels: Record<BreakdownKey, string> = {
    lifestyle: t.lifeMatch.lifestyle,
    routine: t.lifeMatch.routine,
    housing: t.lifeMatch.housing,
    affordability: t.lifeMatch.affordability,
  };
  return (Object.entries(result.breakdown) as [BreakdownKey, number][]).map(([key, value]) => ({ key, label: labels[key], value }));
}

function MatchRate({ value }: { value: number }) {
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-marine text-mist shadow-md">
      <div className="text-center">
        <strong className="font-mono text-2xl">{Math.round(value)}%</strong>
        <span className="block text-[10px] tracking-wide text-mist/65">MATCH</span>
      </div>
    </div>
  );
}

function LifeAxisStrip({ result, t }: { result: LifestyleRecommendationResult; t: Translations }) {
  const axes = [
    [t.lifeMatch.fun, result.lifeAxes.fun, "bg-terracotta"],
    [t.lifeMatch.work, result.lifeAxes.work, "bg-marine"],
    [t.lifeMatch.rest, result.lifeAxes.rest, "bg-gold"],
  ] as const;
  return (
    <div className="mt-5 grid grid-cols-3 gap-2">
      {axes.map(([label, value, color]) => (
        <div key={label} className="rounded-xl bg-mist px-3 py-3">
          <div className="flex items-center justify-between gap-2 font-mono text-xs">
            <span className="text-slate">{label}</span>
            <strong className="text-marine">{Math.round(value)}</strong>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist-dim">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ result, rank, selected, t, onOpen, onSelect }: { result: LifestyleRecommendationResult; rank: number; selected: boolean; t: Translations; onOpen: () => void; onSelect: () => void }) {
  const entries = breakdownEntries(result, t);
  const strongest = entries.reduce((best, entry) => (entry.value > best.value ? entry : best));
  const weakest = entries.reduce((worst, entry) => (entry.value < worst.value ? entry : worst));

  return (
    <article
      onMouseEnter={onSelect}
      onFocusCapture={onSelect}
      className={`rounded-3xl border bg-white/80 p-5 shadow-sm transition ${selected ? "border-terracotta/70 shadow-md" : "border-slate-light/30"}`}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs tracking-wider text-terracotta">#{rank} LIFE MATCH</p>
          <h3 className="mt-2 truncate text-xl font-extrabold text-marine">{result.housing.projectName}</h3>
          <p className="mt-1 truncate text-sm text-slate">{result.housing.address}</p>
          <p className="mt-3 font-mono text-sm text-marine">
            {formatWon(result.housing.minDeposit)} · {formatWon(result.housing.minRent)}
          </p>
        </div>
        <MatchRate value={result.matchRate} />
      </div>

      <LifeAxisStrip result={result} t={t} />

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {entries.map((entry) => (
          <div key={entry.key} className="rounded-xl bg-mist px-3 py-2">
            <span className="block text-[11px] text-slate">{entry.label}</span>
            <strong className="font-mono text-sm text-marine">{Math.round(entry.value)}</strong>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p className="flex gap-2 rounded-xl bg-terracotta/10 px-3 py-2 text-terracotta-dark">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {t.lifeMatch.strength}: {strongest.label} {Math.round(strongest.value)}
        </p>
        <p className="flex gap-2 rounded-xl bg-gold/15 px-3 py-2 text-marine">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {t.lifeMatch.caution}: {weakest.label} {Math.round(weakest.value)}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-5 w-full rounded-xl border border-terracotta/40 px-4 py-2.5 text-sm font-semibold text-terracotta-dark transition hover:bg-terracotta hover:text-white"
      >
        {t.lifeMatch.openDetail}
      </button>
    </article>
  );
}

function ComparisonTable({ results, t }: { results: LifestyleRecommendationResult[]; t: Translations }) {
  const top = results.slice(0, 3);
  if (top.length < 2) return null;
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-light/30 bg-white/75">
      <div className="border-b border-slate-light/25 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-bold text-marine">{t.lifeMatch.compareTitle}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-mist text-slate">
            <tr>
              <th className="px-5 py-3 font-medium">HOME</th>
              <th className="px-5 py-3 font-medium">MATCH</th>
              <th className="px-5 py-3 font-medium">FUN</th>
              <th className="px-5 py-3 font-medium">WORK</th>
              <th className="px-5 py-3 font-medium">REST</th>
              <th className="px-5 py-3 font-medium">{t.lifeMatch.routine}</th>
              <th className="px-5 py-3 font-medium">{t.lifeMatch.affordability}</th>
              <th className="px-5 py-3 font-medium">AREA</th>
              <th className="px-5 py-3 font-medium">ROOMS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-light/20">
            {top.map((result, index) => (
              <tr key={result.housing.id}>
                <td className="px-5 py-4 font-semibold text-marine">#{index + 1} {result.housing.projectName}</td>
                <td className="px-5 py-4 font-mono text-terracotta-dark">{Math.round(result.matchRate)}%</td>
                <td className="px-5 py-4 font-mono">{Math.round(result.lifeAxes.fun)}</td>
                <td className="px-5 py-4 font-mono">{Math.round(result.lifeAxes.work)}</td>
                <td className="px-5 py-4 font-mono">{Math.round(result.lifeAxes.rest)}</td>
                <td className="px-5 py-4 font-mono">{Math.round(result.breakdown.routine)}</td>
                <td className="px-5 py-4 font-mono">{Math.round(result.breakdown.affordability)}</td>
                <td className="px-5 py-4 font-mono">{result.housing.maxAreaM2 != null ? `${result.housing.maxAreaM2}㎡` : "—"}</td>
                <td className="px-5 py-4 font-mono">{result.housing.maxRooms ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HousingMatchModal({
  result,
  t,
  onClose,
}: {
  result: LifestyleRecommendationResult;
  t: Translations;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"resume" | "week" | "data">("resume");
  const tabs = [
    ["resume", t.lifeMatch.houseResume],
    ["week", t.lifeMatch.weekAtHome],
    ["data", t.lifeMatch.dataBasis],
  ] as const;
  const housing = result.housing;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-marine/65 p-4" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="house-match-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-mist shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-slate-light/25 p-6">
          <div>
            <p className="font-mono text-xs text-terracotta">{Math.round(result.matchRate)}% MATCH</p>
            <h2 id="house-match-title" className="mt-1 text-2xl font-extrabold text-marine">{housing.projectName}</h2>
          </div>
          <button autoFocus type="button" onClick={onClose} aria-label={t.lifeMatch.close} className="rounded-full p-2 text-slate hover:bg-marine/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-light/25 px-6 pt-4">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === key ? "border-terracotta text-terracotta-dark" : "border-transparent text-slate"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "resume" ? (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [t.detail.specAddress, housing.address],
                [t.detail.specBuiltDate, housing.builtDate ?? t.detail.noData],
                [t.detail.specDeposit, formatWon(housing.minDeposit)],
                [t.detail.specRent, formatWon(housing.minRent)],
                [t.lifeMatch.minArea, housing.maxAreaM2 != null ? `${housing.maxAreaM2}㎡` : t.detail.noData],
                [t.lifeMatch.minRooms, housing.maxRooms?.toString() ?? t.detail.noData],
                [t.lifeMatch.elevator, housing.hasElevator == null ? t.detail.noData : housing.hasElevator ? "YES" : "NO"],
                [t.lifeMatch.parking, housing.parkingSpots?.toString() ?? t.detail.noData],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white/70 p-4">
                  <dt className="text-xs text-slate">{label}</dt>
                  <dd className="mt-1 font-mono text-sm text-marine">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {tab === "week" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {result.routineDetails.map((detail) => (
                <div key={detail.activity} className="rounded-2xl bg-white/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-marine">{t.lifeMatch.activities[detail.activity]}</span>
                    <span className="font-mono text-sm text-terracotta-dark">{Math.round(detail.score)} / 100</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist-dim">
                    <div className="h-full rounded-full bg-terracotta" style={{ width: `${detail.score}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate">{t.lifeMatch.perWeek} {detail.requested} · {t.lifeMatch.evidenceLabels[detail.evidence]}</p>
                </div>
              ))}
              <p className="sm:col-span-2 rounded-2xl bg-marine p-4 text-sm text-mist">
                {t.lifeMatch.routine}: <strong className="font-mono">{Math.round(result.breakdown.routine)} / 100</strong>
              </p>
            </div>
          ) : null}

          {tab === "data" ? (
            <div className="space-y-5 text-sm text-slate">
              <p className="rounded-2xl bg-white/70 p-4 text-marine">42% {t.lifeMatch.lifestyle} + 28% {t.lifeMatch.routine} + 18% {t.lifeMatch.housing} + 12% {t.lifeMatch.affordability}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/70 p-4"><span className="text-xs text-slate">{t.lifeMatch.residentialArea}</span><strong className="mt-1 block font-mono text-marine">{result.neighborhood.residentialRatio == null ? "—" : `${Math.round(result.neighborhood.residentialRatio * 100)}%`}</strong></div>
                <div className="rounded-2xl bg-white/70 p-4"><span className="text-xs text-slate">{t.lifeMatch.commercialArea}</span><strong className="mt-1 block font-mono text-marine">{result.neighborhood.commercialRatio == null ? "—" : `${Math.round(result.neighborhood.commercialRatio * 100)}%`}</strong></div>
                <div className="rounded-2xl bg-white/70 p-4"><span className="text-xs text-slate">{t.lifeMatch.greenArea}</span><strong className="mt-1 block font-mono text-marine">{result.neighborhood.greenRatio == null ? "—" : `${Math.round(result.neighborhood.greenRatio * 100)}%`}</strong></div>
              </div>
              {result.destinationDistanceMeters != null ? (
                <p className="flex items-start gap-2 rounded-2xl bg-white/70 p-4 text-marine"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />{Math.round(result.destinationDistanceMeters / 100) / 10}km · {t.lifeMatch.straightLineNote}</p>
              ) : null}
              {result.neighborhood.source === "unavailable" ? <p className="text-xs leading-5">{t.lifeMatch.zoningUnavailable}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {result.matches.map((match) => (
                  <div key={match.categoryName} className="rounded-2xl border border-slate-light/25 bg-white/60 p-4">
                    <strong className="text-marine">{match.categoryName}</strong>
                    <p className="mt-1 font-mono text-xs">{match.count} POI · {match.nearestMeters == null ? "—" : `${Math.round(match.nearestMeters)}m`}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-5">{t.lifeMatch.demoWeightNote}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LifeMatchResults({
  results,
  profile,
  pending,
  error,
  onProfileChange,
  onRecalculate,
  t,
}: LifeMatchResultsProps) {
  const [openResult, setOpenResult] = useState<LifestyleRecommendationResult | null>(null);
  const [selectedHousingId, setSelectedHousingId] = useState<number | null>(results[0]?.housing.id ?? null);
  const topResults = results.slice(0, 3);
  const activeSelectedHousingId = topResults.some((result) => result.housing.id === selectedHousingId)
    ? selectedHousingId
    : topResults[0]?.housing.id ?? null;
  const markers: HousingMarker[] = topResults.map((result, index) => ({
    kind: "housing",
    id: result.housing.id,
    lat: result.housing.lat ?? Number.NaN,
    lng: result.housing.lng ?? Number.NaN,
    label: result.housing.projectName,
    selected: result.housing.id === activeSelectedHousingId || (activeSelectedHousingId == null && index === 0),
  }));
  const setProfileNumber = (key: "depositMaxManwon" | "rentMaxManwon" | "minAreaM2", value: string) =>
    onProfileChange({ ...profile, [key]: value });
  const applyRelaxation = (patch: Partial<LifeProfile>) => {
    const nextProfile = { ...profile, ...patch };
    onProfileChange(nextProfile);
    onRecalculate(nextProfile);
  };
  const numeric = (value: string) => Number(value) || 0;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-marine">{t.lifeMatch.resultTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">{t.lifeMatch.resultDescription}</p>
        </div>
        {results.length > 0 ? (
          <div className="font-mono text-sm text-slate">{results.length} CANDIDATES · TOP {Math.round(results[0].matchRate)}%</div>
        ) : null}
      </div>

      {error ? <p className="mt-6 rounded-2xl bg-terracotta/10 p-4 text-sm text-terracotta-dark">{t.lifeMatch.error}</p> : null}
      {!pending && !error && results.length === 0 ? <p className="mt-6 rounded-2xl bg-white/70 p-5 text-sm text-slate">{t.lifeMatch.noResults}</p> : null}

      {topResults.length > 0 ? (
        <>
          <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className="space-y-4">
              {topResults.map((result, index) => (
                <MatchCard
                  key={result.housing.id}
                  result={result}
                  rank={index + 1}
                  selected={result.housing.id === activeSelectedHousingId}
                  t={t}
                  onOpen={() => setOpenResult(result)}
                  onSelect={() => setSelectedHousingId(result.housing.id)}
                />
              ))}
            </div>
            <div className="h-[520px] overflow-hidden rounded-3xl border border-slate-light/30 bg-mist-dim shadow-sm xl:sticky xl:top-24">
              <KakaoMap className="h-full w-full" markers={markers} />
            </div>
          </div>
          <ComparisonTable results={results} t={t} />
        </>
      ) : null}

      <section className="mt-8 rounded-3xl bg-marine p-6 text-mist sm:p-8">
        <div className="flex items-start gap-3">
          <SlidersHorizontal className="mt-1 h-5 w-5 text-gold" />
          <div>
            <h2 className="text-xl font-bold">{t.lifeMatch.simulatorTitle}</h2>
            <p className="mt-1 text-sm text-mist/70">{t.lifeMatch.simulatorDescription}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <label className="text-sm">
            <span>{t.lifeMatch.depositMax}: {profile.depositMaxManwon}</span>
            <input type="range" min="500" max="10000" step="100" value={profile.depositMaxManwon} onChange={(event) => setProfileNumber("depositMaxManwon", event.target.value)} className="mt-3 w-full accent-terracotta" />
          </label>
          <label className="text-sm">
            <span>{t.lifeMatch.rentMax}: {profile.rentMaxManwon}</span>
            <input type="range" min="5" max="100" step="1" value={profile.rentMaxManwon} onChange={(event) => setProfileNumber("rentMaxManwon", event.target.value)} className="mt-3 w-full accent-terracotta" />
          </label>
          <label className="text-sm">
            <span>{t.lifeMatch.minArea}: {profile.minAreaM2}</span>
            <input type="range" min="10" max="85" step="1" value={profile.minAreaM2} onChange={(event) => setProfileNumber("minAreaM2", event.target.value)} className="mt-3 w-full accent-terracotta" />
          </label>
        </div>
        <button type="button" onClick={() => onRecalculate()} disabled={pending} className="mt-6 rounded-xl bg-terracotta px-5 py-3 text-sm font-bold text-white transition hover:bg-terracotta-dark disabled:opacity-50">
          {pending ? t.lifeMatch.recalculating : t.lifeMatch.applyChanges}
        </button>
        <div className="mt-8 border-t border-white/15 pt-6">
          <h3 className="font-bold">{t.lifeMatch.quickRelaxTitle}</h3>
          <p className="mt-1 text-xs leading-5 text-mist/65">{t.lifeMatch.quickRelaxDescription}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => applyRelaxation({ rentMaxManwon: String(numeric(profile.rentMaxManwon) + 3) })} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">{t.lifeMatch.rentMax} +3</button>
            <button type="button" onClick={() => applyRelaxation({ depositMaxManwon: String(numeric(profile.depositMaxManwon) + 500) })} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">{t.lifeMatch.depositMax} +500</button>
            <button type="button" onClick={() => applyRelaxation({ minAreaM2: String(Math.max(10, numeric(profile.minAreaM2) - 3)) })} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">{t.lifeMatch.minArea} -3</button>
            {profile.elevatorRequired ? <button type="button" onClick={() => applyRelaxation({ elevatorRequired: false })} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">× {t.lifeMatch.elevator}</button> : null}
            {profile.parkingRequired ? <button type="button" onClick={() => applyRelaxation({ parkingRequired: false })} className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">× {t.lifeMatch.parking}</button> : null}
          </div>
        </div>
      </section>

      {openResult ? <HousingMatchModal result={openResult} t={t} onClose={() => setOpenResult(null)} /> : null}
    </div>
  );
}
