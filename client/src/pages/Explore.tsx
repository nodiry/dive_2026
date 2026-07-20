import type { LifestylePreference } from "@dive2026/shared";
import { useState } from "react";
import { ExploreNavbar } from "../components/explore/ExploreNavbar";
import { MapShell } from "../components/explore/MapShell";
import type { ExploreMode } from "../components/explore/ModeToggle";
import { ResultsListPanel } from "../components/explore/ResultsListPanel";
import { HousingCard } from "../components/HousingCard";
import type { HousingMarker, MapMarker, MapTrail, PoiMarker } from "../components/KakaoMap";
import { TagStrip } from "../components/TagStrip";
import { EMPTY_CRITERIA_FILTERS, toHousingSearchQuery, type CriteriaFilters } from "../lib/filters";
import { useLocale } from "../lib/i18n/localeContext";
import { aggregateMatchesByIcon, POI_ICON_CATEGORY_NAMES, poiColorForCategoryName, type PoiIconKey } from "../lib/poiIcons";
import { useHousingDetail, useHousingSearch, useLifestyleRecommendation, usePoiCategories } from "../lib/queries";
import { useSavedHousing } from "../lib/savedHousing/savedHousingContext";

function SavedHousingCard({
  id,
  onSelect,
  onHover,
  onUnhover,
}: {
  id: number;
  onSelect: () => void;
  onHover: () => void;
  onUnhover: () => void;
}) {
  const { data } = useHousingDetail(id);
  const { isSaved, toggleSaved } = useSavedHousing();
  if (!data) return null;
  return (
    <div onMouseEnter={onHover} onMouseLeave={onUnhover}>
      <HousingCard housing={data} onSelect={onSelect} saved={isSaved(data.id)} onToggleSave={() => toggleSaved(data.id)} />
    </div>
  );
}

export function Explore() {
  const { t } = useLocale();
  const { isSaved, toggleSaved, savedIds } = useSavedHousing();

  const [mode, setMode] = useState<ExploreMode>("criteria");
  const [panelView, setPanelView] = useState<"results" | "saved">("results");
  const [filters, setFilters] = useState<CriteriaFilters>(EMPTY_CRITERIA_FILTERS);
  const [hasSearchedCriteria, setHasSearchedCriteria] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<PoiIconKey>>(new Set());
  const [radiusMeters, setRadiusMeters] = useState(500);
  const [selectedHousingId, setSelectedHousingId] = useState<number | null>(null);
  const [hoveredHousingId, setHoveredHousingId] = useState<number | null>(null);
  const [hasEverSearched, setHasEverSearched] = useState(false);

  const criteriaQuery = useHousingSearch(toHousingSearchQuery(filters), mode === "criteria" && hasSearchedCriteria);
  const recommend = useLifestyleRecommendation();
  const { data: categories } = usePoiCategories();

  // Derived directly from the result set (not a separate effect+setState) — changes only
  // when the actual set of result ids changes, i.e. a fresh search, never on hover alone.
  const fitKey =
    mode === "criteria"
      ? criteriaQuery.data?.map((h) => h.id).join(",")
      : recommend.data?.map((r) => r.housing.id).join(",");

  function toggleCategory(key: PoiIconKey) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleModeChange(next: ExploreMode) {
    setMode(next);
    setSelectedHousingId(null);
    setHoveredHousingId(null);
    setPanelView("results");
  }

  function handleSelect(id: number) {
    setSelectedHousingId((prev) => (prev === id ? null : id));
  }

  function handleMarkerClick(marker: MapMarker) {
    if (marker.kind === "housing") handleSelect(marker.id);
  }

  function handleSubmit() {
    setSelectedHousingId(null);
    setPanelView("results");
    setHasEverSearched(true);
    if (mode === "criteria") {
      setHasSearchedCriteria(true);
      if (hasSearchedCriteria) criteriaQuery.refetch();
      return;
    }
    const preferences: LifestylePreference[] = [];
    for (const key of selectedCategories) {
      for (const categoryName of POI_ICON_CATEGORY_NAMES[key]) preferences.push({ categoryName, weight: 1 });
    }
    if (preferences.length === 0) return;
    recommend.mutate({
      preferences,
      district: filters.district || undefined,
      depositMax: filters.depositMaxManwon ? Number(filters.depositMaxManwon) * 10000 : undefined,
      radiusMeters,
    });
  }

  const selectedPreferenceResult =
    mode === "preference" ? recommend.data?.find((r) => r.housing.id === selectedHousingId) : undefined;

  const housingMarkers: HousingMarker[] =
    mode === "criteria"
      ? (criteriaQuery.data ?? []).map((h) => ({
          kind: "housing",
          id: h.id,
          lat: h.lat ?? NaN,
          lng: h.lng ?? NaN,
          label: h.projectName,
          selected: h.id === selectedHousingId || h.id === hoveredHousingId,
        }))
      : (recommend.data ?? []).map((r) => ({
          kind: "housing",
          id: r.housing.id,
          lat: r.housing.lat ?? NaN,
          lng: r.housing.lng ?? NaN,
          label: r.housing.projectName,
          selected: r.housing.id === selectedHousingId || r.housing.id === hoveredHousingId,
        }));

  const poiMarkers: PoiMarker[] = selectedPreferenceResult
    ? selectedPreferenceResult.matches.flatMap((m) =>
        m.pois.map(
          (p, i): PoiMarker => ({
            kind: "poi",
            id: `${m.categoryName}-${i}-${p.lat}-${p.lng}`,
            lat: p.lat,
            lng: p.lng,
            label: p.name,
            categoryName: m.categoryName,
            color: poiColorForCategoryName(m.categoryName),
          }),
        ),
      )
    : [];

  const markers: MapMarker[] = [...housingMarkers, ...poiMarkers];

  const trails: MapTrail[] = selectedPreferenceResult
    ? selectedPreferenceResult.matches
        .filter((m) => m.pois.length > 0)
        .map((m) => ({
          id: `${selectedPreferenceResult.housing.id}-${m.categoryName}`,
          fromLat: selectedPreferenceResult.housing.lat ?? NaN,
          fromLng: selectedPreferenceResult.housing.lng ?? NaN,
          toLat: m.pois[0].lat,
          toLng: m.pois[0].lng,
        }))
    : [];

  return (
    <MapShell markers={markers} trails={trails} onMarkerClick={handleMarkerClick} fitKey={fitKey}>
      <ExploreNavbar
        mode={mode}
        onModeChange={handleModeChange}
        criteriaFilters={filters}
        onCriteriaFiltersChange={setFilters}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        radiusMeters={radiusMeters}
        onRadiusChange={setRadiusMeters}
        onSubmit={handleSubmit}
        submitDisabled={mode === "preference" && (selectedCategories.size === 0 || recommend.isPending)}
        submitting={recommend.isPending}
        panelView={panelView}
        onPanelViewChange={setPanelView}
      />

      {!hasEverSearched && (
        <div className="pointer-events-none flex flex-1 items-center justify-center px-6">
          <div className="pointer-events-auto max-w-lg rounded-3xl border border-slate-light/30 bg-mist/95 p-8 text-center shadow-lg backdrop-blur">
            <p className="font-mono text-sm tracking-wide text-terracotta uppercase">{t.explore.heroEyebrow}</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-marine">{t.explore.heroTitle}</h1>
            <p className="mt-3 text-slate">{t.explore.prompt}</p>
            <div className="mt-6 flex justify-center">
              <TagStrip variant="hero" tags={(categories ?? []).slice(0, 7).map((c) => ({ label: c.categoryName }))} />
            </div>
          </div>
        </div>
      )}

      {(hasEverSearched || panelView === "saved") && (
      <div className="flex flex-1 overflow-hidden">
        <ResultsListPanel>
          {panelView === "saved" ? (
            savedIds.length === 0 ? (
              <p className="text-sm text-slate">{t.saved.empty}</p>
            ) : (
              savedIds.map((id) => (
                <SavedHousingCard
                  key={id}
                  id={id}
                  onSelect={() => handleSelect(id)}
                  onHover={() => setHoveredHousingId(id)}
                  onUnhover={() => setHoveredHousingId(null)}
                />
              ))
            )
          ) : mode === "criteria" ? (
            <>
              {!hasSearchedCriteria && <p className="text-sm text-slate">{t.explore.prompt}</p>}
              {hasSearchedCriteria && criteriaQuery.isLoading && <p className="text-sm text-slate">{t.explore.loading}</p>}
              {hasSearchedCriteria && criteriaQuery.isError && (
                <p className="text-sm text-terracotta-dark">{t.explore.error}</p>
              )}
              {hasSearchedCriteria && criteriaQuery.data?.length === 0 && (
                <p className="text-sm text-slate">{t.explore.empty}</p>
              )}
              {criteriaQuery.data?.map((housing) => (
                <div
                  key={housing.id}
                  onMouseEnter={() => setHoveredHousingId(housing.id)}
                  onMouseLeave={() => setHoveredHousingId(null)}
                >
                  <HousingCard
                    housing={housing}
                    onSelect={() => handleSelect(housing.id)}
                    saved={isSaved(housing.id)}
                    onToggleSave={() => toggleSaved(housing.id)}
                  />
                </div>
              ))}
            </>
          ) : (
            <>
              {!recommend.isPending && !recommend.isSuccess && <p className="text-sm text-slate">{t.explore.prompt}</p>}
              {recommend.isPending && <p className="text-sm text-slate">{t.explore.submitting}</p>}
              {recommend.isError && <p className="text-sm text-terracotta-dark">{t.explore.error}</p>}
              {recommend.isSuccess && recommend.data.length === 0 && (
                <p className="text-sm text-slate">{t.explore.emptyResult}</p>
              )}
              {recommend.data?.map((result) => (
                <div
                  key={result.housing.id}
                  onMouseEnter={() => setHoveredHousingId(result.housing.id)}
                  onMouseLeave={() => setHoveredHousingId(null)}
                >
                  <HousingCard
                    housing={result.housing}
                    onSelect={() => handleSelect(result.housing.id)}
                    saved={isSaved(result.housing.id)}
                    onToggleSave={() => toggleSaved(result.housing.id)}
                  >
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-light/20 pt-3">
                      <TagStrip
                        tags={aggregateMatchesByIcon(result.matches).map((m) => ({
                          label: t.poiCategoryLabels[m.key],
                          sublabel:
                            m.count > 0 ? t.units.matchCount(m.count, Math.round(m.nearestMeters ?? 0)) : t.units.matchNone,
                          muted: m.count === 0,
                        }))}
                      />
                      <span className="shrink-0 font-mono text-sm text-slate">
                        {t.explore.scoreLabel} {result.score.toFixed(1)}
                      </span>
                    </div>
                  </HousingCard>
                </div>
              ))}
            </>
          )}
        </ResultsListPanel>
      </div>
      )}
    </MapShell>
  );
}
