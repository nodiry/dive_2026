import type { HousingSearchQuery, HousingType } from "@dive2026/shared";
import { useState } from "react";
import { HousingCard } from "../components/HousingCard";
import { KakaoMap } from "../components/KakaoMap";
import { useHousingSearch } from "../lib/queries";

const DISTRICTS = [
  "강서구",
  "금정구",
  "기장군",
  "남구",
  "동구",
  "동래구",
  "부산진구",
  "북구",
  "사상구",
  "사하구",
  "서구",
  "수영구",
  "연제구",
  "영도구",
  "중구",
  "해운대구",
];

const TYPE_OPTIONS: { value: HousingType; label: string }[] = [
  { value: "purchased", label: "매입임대" },
  { value: "redevelopment", label: "재개발임대" },
  { value: "integrated", label: "통합공공임대" },
  { value: "happy", label: "행복주택" },
];

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
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [submitted, setSubmitted] = useState<Filters>(EMPTY_FILTERS);
  const [hasSearched, setHasSearched] = useState(false);

  const { data, isLoading, isError } = useHousingSearch(toQuery(submitted), hasSearched);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-extrabold text-marine">조건으로 찾기</h1>
      <p className="mt-2 text-slate">보증금, 건축연도, 방수, 지역으로 원하는 임대주택을 바로 필터링하세요.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(draft);
          setHasSearched(true);
        }}
        className="mt-8 grid gap-4 rounded-2xl border border-slate-light/30 bg-white/60 p-6 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">보증금 상한 (만원)</span>
          <input
            type="number"
            min={0}
            placeholder="예: 3000"
            value={draft.depositMaxManwon}
            onChange={(e) => setDraft({ ...draft, depositMaxManwon: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">건축연도 이후</span>
          <input
            type="number"
            min={1980}
            max={2026}
            placeholder="예: 2020"
            value={draft.builtAfter}
            onChange={(e) => setDraft({ ...draft, builtAfter: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">방수</span>
          <input
            type="number"
            min={1}
            placeholder="예: 2"
            value={draft.roomCount}
            onChange={(e) => setDraft({ ...draft, roomCount: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">지역</span>
          <select
            value={draft.district}
            onChange={(e) => setDraft({ ...draft, district: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2"
          >
            <option value="">전체</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-marine">주택 유형</span>
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            className="rounded-lg border border-slate-light/50 bg-white px-3 py-2"
          >
            <option value="">전체</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="col-span-full rounded-lg bg-marine px-6 py-3 font-medium text-mist transition-colors hover:bg-marine-light sm:col-auto sm:self-end"
        >
          검색
        </button>
      </form>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {!hasSearched && <p className="text-slate">조건을 입력하고 검색을 눌러주세요.</p>}
          {hasSearched && isLoading && <p className="text-slate">검색 중...</p>}
          {hasSearched && isError && <p className="text-terracotta-dark">검색에 실패했습니다. 다시 시도해주세요.</p>}
          {hasSearched && data?.length === 0 && (
            <p className="text-slate">조건에 맞는 임대주택이 없어요. 조건을 조금 넓혀보세요.</p>
          )}
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
