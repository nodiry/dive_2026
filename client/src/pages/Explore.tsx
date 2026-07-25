import type { HousingSummary, LifestylePreference } from '@shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ExploreNavbar } from '@components/explore/ExploreNavbar';
import { FilterPanel } from '@components/explore/FilterPanel';
import { ListItem, ListMessage, ListPanel, ListSkeleton } from '@components/explore/ListPanel';
import { MapShell } from '@components/explore/MapShell';
import { HousingCard } from '@components/HousingCard';
import type {
  HousingMarker,
  MapBounds,
  MapCircle,
  MapFocus,
  MapMarker,
  MapTrail,
  PoiMarker,
} from '@components/KakaoMap';
import { TagStrip } from '@components/TagStrip';
import { poiCategoryLabel, poiColorForCategoryName, poiIconForCategoryName } from '@constants/poi';
import { useDebouncedValue } from '@hooks/useDebouncedValue';
import { useHousingSearch } from '@hooks/useHousing';
import { useLifestyleRecommendation } from '@hooks/useRecommendation';
import { useSavedHousing } from '@hooks/useSaved';
import { useAuthStore } from '@stores/useAuthStore';
import { useExploreStore } from '@stores/useExploreStore';
import { toHousingSearchQuery } from '@utils/filters';
import { haversineMeters, walkingMinutes } from '@utils/geo';
import { formatWon } from '@utils/money';

function aggregateTags(
  matches: { categoryName: string; count: number; nearestMeters: number | null }[],
  t: TFunction,
) {
  return matches.map((m) => ({
    label: poiCategoryLabel(m.categoryName, t),
    sublabel:
      m.count > 0
        ? t('units.matchCount', { count: m.count, meters: Math.round(m.nearestMeters ?? 0) })
        : t('units.matchNone'),
    muted: m.count === 0,
  }));
}

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  const ratio = maxScore > 0 ? Math.max(score / maxScore, 0.04) : 0;
  return (
    <div className='mt-2.5 flex items-center gap-2'>
      <div className='h-1 flex-1 rounded-full bg-mist-dim'>
        <div
          className='h-1 rounded-full bg-terracotta transition-[width] duration-300'
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <span className='shrink-0 font-mono text-xs text-slate'>{score.toFixed(1)}</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`absolute -top-2 -left-2 z-10 flex size-6 items-center justify-center rounded-full font-mono text-xs font-bold shadow ${
        rank === 1 ? 'bg-gold text-white' : 'bg-marine text-mist'
      }`}
    >
      {rank}
    </span>
  );
}

export function Explore() {
  const { t } = useTranslation();
  const isLoggedIn = useAuthStore((s) => s.user !== null);
  const { savedHousing, isSaved, toggleSaved } = useSavedHousing();

  const mode = useExploreStore((s) => s.mode);
  const panelView = useExploreStore((s) => s.panelView);
  const filters = useExploreStore((s) => s.filters);
  const weights = useExploreStore((s) => s.weights);
  const radiusMeters = useExploreStore((s) => s.radiusMeters);
  const selectedHousingId = useExploreStore((s) => s.selectedHousingId);
  const hoveredHousingId = useExploreStore((s) => s.hoveredHousingId);
  const toggleSelectedHousing = useExploreStore((s) => s.toggleSelectedHousing);
  const clearSelectedHousing = useExploreStore((s) => s.clearSelectedHousing);
  const setHoveredHousing = useExploreStore((s) => s.setHoveredHousing);

  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [clusterIds, setClusterIds] = useState<number[] | null>(null);

  // Everything filters live: no search button anywhere. Criteria fields are
  // debounced into an always-on query; preference weights auto-run below.
  const debouncedFilters = useDebouncedValue(filters, 350);
  const criteriaQuery = useHousingSearch(toHousingSearchQuery(debouncedFilters), true);
  const recommend = useLifestyleRecommendation();

  const selectedCategoryNames = Object.keys(weights);
  const selectedCount = selectedCategoryNames.length;

  function submitPreference() {
    const preferences: LifestylePreference[] = selectedCategoryNames.map((categoryName) => ({
      categoryName,
      weight: weights[categoryName],
    }));
    if (preferences.length === 0) return;
    recommend.mutate({
      preferences,
      district: filters.district || undefined,
      depositMax: filters.depositMaxManwon ? Number(filters.depositMaxManwon) * 10000 : undefined,
      radiusMeters,
    });
  }

  const liveKey = JSON.stringify([
    weights,
    radiusMeters,
    debouncedFilters.district,
    debouncedFilters.depositMaxManwon,
  ]);
  const recommendReset = recommend.reset;
  useEffect(() => {
    if (mode !== 'preference') return;
    if (selectedCount === 0) {
      recommendReset();
      return;
    }
    const timer = setTimeout(submitPreference, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedCount, liveKey, recommendReset]);

  const baseHousing = criteriaQuery.data ?? [];
  const showingRecommendation = mode === 'preference' && (recommend.data?.length ?? 0) > 0;

  const results = showingRecommendation ? (recommend.data ?? []) : null;
  const visibleHousing: HousingSummary[] = results ? results.map((r) => r.housing) : baseHousing;

  const fitKey = visibleHousing
    .map((h) => h.id)
    .sort((a, b) => a - b)
    .join(',');

  // A fresh result set invalidates any cluster selection — reset during
  // render (the sanctioned adjust-state-on-change pattern, not an effect).
  const [prevFitKey, setPrevFitKey] = useState(fitKey);
  if (prevFitKey !== fitKey) {
    setPrevFitKey(fitKey);
    setClusterIds(null);
  }

  const selectedPreferenceResult = results?.find((r) => r.housing.id === selectedHousingId);
  const selectedHousing = visibleHousing.find((h) => h.id === selectedHousingId);

  function inViewport(h: HousingSummary): boolean {
    if (h.lat == null || h.lng == null) return true;
    if (!mapBounds) return true;
    return (
      h.lat >= mapBounds.swLat &&
      h.lat <= mapBounds.neLat &&
      h.lng >= mapBounds.swLng &&
      h.lng <= mapBounds.neLng
    );
  }

  function inCluster(h: HousingSummary): boolean {
    return clusterIds === null || clusterIds.includes(h.id);
  }

  const rankById = new Map<number, number>();
  results?.forEach((r, i) => {
    if (i < 3) rankById.set(r.housing.id, i + 1);
  });

  const listResults = results?.filter((r) => inViewport(r.housing) && inCluster(r.housing));
  const listHousing = results ? null : baseHousing.filter((h) => inViewport(h) && inCluster(h));

  const housingMarkers: HousingMarker[] = visibleHousing.map((h) => ({
    kind: 'housing',
    id: h.id,
    lat: h.lat ?? NaN,
    lng: h.lng ?? NaN,
    label: h.projectName,
    priceLabel: formatWon(h.minDeposit),
    rank: rankById.get(h.id),
    selected: h.id === selectedHousingId || h.id === hoveredHousingId,
  }));

  // Only the nearest POI per category is "the destination" (routed +
  // animated below) — the rest are just anchors on the map with their
  // category icon, per category up to POIS_PER_CATEGORY server-side.
  const poiMarkers: PoiMarker[] = selectedPreferenceResult
    ? selectedPreferenceResult.matches.flatMap((m) =>
        m.pois.map((p, i): PoiMarker => ({
          kind: 'poi',
          id: `${m.categoryName}-${i}-${p.lat}-${p.lng}`,
          lat: p.lat,
          lng: p.lng,
          label: p.name,
          categoryName: m.categoryName,
          color: poiColorForCategoryName(m.categoryName),
          icon: poiIconForCategoryName(m.categoryName),
          highlighted: i === 0,
        })),
      )
    : [];

  const markers: MapMarker[] = [...housingMarkers, ...poiMarkers];

  // Nearest POI per matched category, only for a selected result with
  // coordinates — a straight line, colored by the destination's category,
  // with distance/time computed locally (no routing round-trip).
  const trails: MapTrail[] = (() => {
    if (!selectedPreferenceResult) return [];
    const { housing, matches } = selectedPreferenceResult;
    if (housing.lat == null || housing.lng == null) return [];
    const from = { lat: housing.lat, lng: housing.lng };
    return matches
      .filter((m) => m.pois.length > 0)
      .map((m): MapTrail => {
        const to = { lat: m.pois[0].lat, lng: m.pois[0].lng };
        const distanceMeters = haversineMeters(from, to);
        return {
          id: `${housing.id}-${m.categoryName}`,
          path: [from, to],
          distanceMeters,
          durationMinutes: walkingMinutes(distanceMeters),
          color: poiColorForCategoryName(m.categoryName),
        };
      });
  })();

  const circle: MapCircle | null =
    selectedPreferenceResult &&
    selectedPreferenceResult.housing.lat != null &&
    selectedPreferenceResult.housing.lng != null
      ? {
          lat: selectedPreferenceResult.housing.lat,
          lng: selectedPreferenceResult.housing.lng,
          radiusMeters,
        }
      : null;

  const focus: MapFocus | null =
    selectedHousing && selectedHousing.lat != null && selectedHousing.lng != null
      ? { lat: selectedHousing.lat, lng: selectedHousing.lng, key: selectedHousing.id }
      : null;

  const listCount =
    panelView === 'saved'
      ? savedHousing.length
      : (listResults?.length ?? listHousing?.length ?? 0);

  const activeFilterCount =
    Number(Boolean(filters.depositMaxManwon)) +
    Number(Boolean(filters.district)) +
    Number(Boolean(filters.roomCount)) +
    Number(Boolean(filters.builtAfter)) +
    Number(Boolean(filters.type)) +
    (mode === 'preference' ? selectedCount : 0);

  return (
    <MapShell
      markers={markers}
      trails={trails}
      circle={circle}
      focus={focus}
      onMarkerClick={(marker) => {
        if (marker.kind === 'housing') toggleSelectedHousing(marker.id);
      }}
      onMapClick={() => {
        clearSelectedHousing();
        setClusterIds(null);
      }}
      onClusterClick={setClusterIds}
      onBoundsChange={setMapBounds}
      fitKey={fitKey}
    >
      <ExploreNavbar />

      <div className='pointer-events-none relative min-h-0 flex-1'>
        <FilterPanel activeFilterCount={activeFilterCount} />

        <ListPanel
          heading={panelView === 'saved' ? t('saved.title') : t('explore.resultsHeading')}
          count={listCount}
          fetching={criteriaQuery.isFetching || recommend.isPending}
          clusterLabel={
            clusterIds !== null && panelView !== 'saved' ? t('explore.clusterFilter') : null
          }
          onClearCluster={() => setClusterIds(null)}
        >
          {panelView === 'saved' ? (
            !isLoggedIn ? (
              <ListItem
                key='saved-auth'
                index={0}
              >
                <ListMessage>{t('saved.loginRequired')}</ListMessage>
              </ListItem>
            ) : savedHousing.length === 0 ? (
              <ListItem
                key='saved-empty'
                index={0}
              >
                <ListMessage>{t('saved.empty')}</ListMessage>
              </ListItem>
            ) : (
              savedHousing.map((housing, i) => (
                <ListItem
                  key={`saved-${housing.id}`}
                  index={i}
                  active={housing.id === selectedHousingId}
                >
                  <div
                    onMouseEnter={() => setHoveredHousing(housing.id)}
                    onMouseLeave={() => setHoveredHousing(null)}
                  >
                    <HousingCard
                      housing={housing}
                      onSelect={() => toggleSelectedHousing(housing.id)}
                      selected={housing.id === selectedHousingId}
                      saved
                      onToggleSave={() => toggleSaved(housing.id)}
                    />
                  </div>
                </ListItem>
              ))
            )
          ) : mode === 'preference' && selectedCount === 0 ? (
            <ListItem
              key='pref-hint'
              index={0}
            >
              <ListMessage>{t('explore.prompt')}</ListMessage>
            </ListItem>
          ) : mode === 'preference' && recommend.isPending && !recommend.data ? (
            <ListItem
              key='pref-loading'
              index={0}
            >
              <ListSkeleton />
            </ListItem>
          ) : mode === 'preference' && recommend.isError ? (
            <ListItem
              key='pref-error'
              index={0}
            >
              <ListMessage tone='error'>{t('explore.error')}</ListMessage>
            </ListItem>
          ) : mode === 'preference' && recommend.isSuccess && recommend.data.length === 0 ? (
            <ListItem
              key='pref-empty'
              index={0}
            >
              <ListMessage>{t('explore.emptyResult')}</ListMessage>
            </ListItem>
          ) : listResults ? (
            listResults.length === 0 ? (
              <ListItem
                key='pref-view-empty'
                index={0}
              >
                <ListMessage>{t('explore.emptyResult')}</ListMessage>
              </ListItem>
            ) : (
              listResults.map((result, i) => (
                <ListItem
                  key={`r-${result.housing.id}`}
                  index={i}
                  active={result.housing.id === selectedHousingId}
                >
                  <div
                    className='relative'
                    onMouseEnter={() => setHoveredHousing(result.housing.id)}
                    onMouseLeave={() => setHoveredHousing(null)}
                  >
                    {rankById.has(result.housing.id) && (
                      <RankBadge rank={rankById.get(result.housing.id)!} />
                    )}
                    <HousingCard
                      housing={result.housing}
                      onSelect={() => toggleSelectedHousing(result.housing.id)}
                      selected={result.housing.id === selectedHousingId}
                      saved={isSaved(result.housing.id)}
                      onToggleSave={() => toggleSaved(result.housing.id)}
                    >
                      <ScoreBar
                        score={result.score}
                        maxScore={recommend.data?.[0]?.score ?? 0}
                      />
                      <div className='mt-2'>
                        <TagStrip tags={aggregateTags(result.matches, t)} />
                      </div>
                    </HousingCard>
                  </div>
                </ListItem>
              ))
            )
          ) : criteriaQuery.isLoading ? (
            <ListItem
              key='crit-loading'
              index={0}
            >
              <ListSkeleton />
            </ListItem>
          ) : criteriaQuery.isError ? (
            <ListItem
              key='crit-error'
              index={0}
            >
              <ListMessage tone='error'>{t('explore.error')}</ListMessage>
            </ListItem>
          ) : (listHousing?.length ?? 0) === 0 ? (
            <ListItem
              key='crit-empty'
              index={0}
            >
              <ListMessage>{t('explore.empty')}</ListMessage>
            </ListItem>
          ) : (
            (listHousing ?? []).map((housing, i) => (
              <ListItem
                key={`h-${housing.id}`}
                index={i}
                active={housing.id === selectedHousingId}
              >
                <div
                  onMouseEnter={() => setHoveredHousing(housing.id)}
                  onMouseLeave={() => setHoveredHousing(null)}
                >
                  <HousingCard
                    housing={housing}
                    onSelect={() => toggleSelectedHousing(housing.id)}
                    selected={housing.id === selectedHousingId}
                    saved={isSaved(housing.id)}
                    onToggleSave={() => toggleSaved(housing.id)}
                  />
                </div>
              </ListItem>
            ))
          )}
        </ListPanel>
      </div>
    </MapShell>
  );
}
