import type { HousingSearchQuery, HousingType } from "@dive2026/shared";
import { useState } from "react";
import { HousingCard } from "../components/HousingCard";
import { KakaoMap } from "../components/KakaoMap";
import { useLocale } from "../lib/i18n/localeContext";
import { DISTRICTS } from "../lib/i18n/translations";
import { useHousingSearch } from "../lib/queries";

const TYPE_VALUES: HousingType[] = ["purchased", "redevelopment", "integrated", "happy"];

interface Filters {
  depositMaxManwon: string;
  builtAfter: string;
  roomCount: string;
  district: string;
  type: string;
}

const EMPTY_FILTERS: Filters = { depositMaxManwon: "", builtAfter: "", roomCount: "", district: "", type: "" };

function toQuery(filters: Filters): HousingSearchQuery {
  return {
    depositMax: filters.depositMaxManwon ? Number(filters.depositMaxManwon) * 10000 : undefined,
    builtAfter: filters.builtAfter ? Number(filters.builtAfter) : undefined,
    roomCount: filters.roomCount ? Number(filters.roomCount) : undefined,
    district: filters.district || undefined,
    type: filters.type ? (filters.type as HousingType) : undefined,
  };
}

export function Search() {
  const { t } = useLocale();
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [submitted, setSubmitted] = useState<Filters>(EMPTY_FILTERS);
  const [hasSearched, setHasSearched] = useState(false);

  const { data, isLoading, isError } = useHousingSearch(toQuery(submitted), hasSearched);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-extrabold text-marine">{t.search.title}</h1>
      <p className="mt-2 text-slate">{t.search.subtitle}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(draft);
          setHasSearched(true);
        }}
        className="mt-8 grid gap-4 rounded-2xl border border-slate-light/30 bg-white/60 p-6 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">{t.search.depositMaxLabel}</span>
          <input
            type="number"
            min={0}
            placeholder={t.search.depositMaxPlaceholder}
            value={draft.depositMaxManwon}
            onChange={(e) => setDraft({ ...draft, depositMaxManwon: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">{t.search.builtAfterLabel}</span>
          <input
            type="number"
            min={1980}
            max={2026}
            placeholder={t.search.builtAfterPlaceholder}
            value={draft.builtAfter}
            onChange={(e) => setDraft({ ...draft, builtAfter: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">{t.search.roomCountLabel}</span>
          <input
            type="number"
            min={1}
            placeholder={t.search.roomCountPlaceholder}
            value={draft.roomCount}
            onChange={(e) => setDraft({ ...draft, roomCount: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">{t.search.districtLabel}</span>
          <select
            value={draft.district}
            onChange={(e) => setDraft({ ...draft, district: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2"
          >
            <option value="">{t.search.districtAll}</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {t.districts[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">{t.search.typeLabel}</span>
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2"
          >
            <option value="">{t.search.typeAll}</option>
            {TYPE_VALUES.map((v) => (
              <option key={v} value={v}>
                {t.housingType[v]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="col-span-full rounded-lg bg-marine px-6 py-3 font-medium text-mist transition-colors hover:bg-marine-light sm:col-auto sm:self-end"
        >
          {t.search.submit}
        </button>
      </form>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {!hasSearched && <p className="text-slate">{t.search.prompt}</p>}
          {hasSearched && isLoading && <p className="text-slate">{t.search.loading}</p>}
          {hasSearched && isError && <p className="text-terracotta-dark">{t.search.error}</p>}
          {hasSearched && data?.length === 0 && <p className="text-slate">{t.search.empty}</p>}
          {data?.map((housing) => <HousingCard key={housing.id} housing={housing} />)}
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <KakaoMap
            className="aspect-square w-full"
            markers={(data ?? []).map((h) => ({ lat: h.lat ?? NaN, lng: h.lng ?? NaN, label: h.projectName }))}
          />
        </div>
      </div>
    </div>
  );
}
