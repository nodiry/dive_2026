import type { HousingSummary, LifestylePreference } from '@shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Layers, Loader2, LocateFixed, Minus, Plus, Store } from 'lucide-react';
import { ExploreNavbar } from '@components/explore/ExploreNavbar';
import { FilterPanel } from '@components/explore/FilterPanel';
import { ListItem, ListMessage, ListPanel, ListSkeleton } from '@components/explore/ListPanel';
import { MapShell } from '@components/explore/MapShell';
import { HousingCard } from '@components/HousingCard';
import type {
  HousingMarker,
  MapControls,
  MapBounds,
  MapCircle,
  MapFocus,
  MapMarker,
  MapTrail,
  PoiMarker,
} from '@components/KakaoMap';
import { TagStrip } from '@components/TagStrip';
import {
  ALL_DISTRICTS_FOCUS,
  DISTRICT_CENTERS,
  DISTRICT_CODES,
  type District,
} from '@constants/districts';
import { poiCategoryLabel, poiColorForCategoryName, poiIconForCategoryName } from '@constants/poi';
import { useDebouncedValue } from '@hooks/useDebouncedValue';
import {
  useDistrictBoundaries,
  useDistrictDensity,
  useDistrictSupply,
} from '@hooks/useDistrictDensity';
import { useHousingSearch } from '@hooks/useHousing';
import { useLifestyleRecommendation } from '@hooks/useRecommendation';
import { useSavedHousing } from '@hooks/useSaved';
import { useAuthStore } from '@stores/useAuthStore';
import { useExploreStore } from '@stores/useExploreStore';
import { useToastStore } from '@stores/useToastStore';
import { cn } from '@utils/cn';
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

/**
 * The list is viewport-synced rather than paged, so it can be handed all 355
 * projects at once. Every card is a layout-animated motion node, and a pan
 * re-animates the whole set, so render a window of them and tell the user
 * plainly what is not shown. The header count stays the true total.
 */
const LIST_RENDER_CAP = 60;

function ListFooterNote({
  moreInView,
  outsideView,
  onFit,
}: {
  moreInView: number;
  outsideView: number;
  onFit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className='rounded-2xl border-2 border-dashed border-slate-light/40 bg-lilac-dim/90 p-4 text-sm text-slate'>
      {moreInView > 0 && <p>{t('explore.listCapped', { count: moreInView })}</p>}
      {outsideView > 0 && (
        <>
          <p className={moreInView > 0 ? 'mt-2' : undefined}>
            {t('explore.outsideView', { count: outsideView })}
          </p>
          <button
            type='button'
            onClick={onFit}
            className='mt-2 rounded-full border border-violet/40 bg-violet/10 px-3 py-1.5 text-xs font-medium text-violet-dark transition-colors hover:bg-violet/20'
          >
            {t('explore.fitResults')}
          </button>
        </>
      )}
    </div>
  );
}

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  const ratio = maxScore > 0 ? Math.max(score / maxScore, 0.04) : 0;
  return (
    <div className='mt-2.5 flex items-center gap-2'>
      <div className='h-1 flex-1 rounded-full bg-lilac-dim'>
        <div
          className='h-1 rounded-full bg-violet transition-[width] duration-300'
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
        rank === 1 ? 'bg-gold text-white' : 'bg-plum text-lilac'
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

  const mapLayer = useExploreStore((s) => s.mapLayer);
  const setMapLayer = useExploreStore((s) => s.setMapLayer);
  const { data: densityRegions } = useDistrictDensity(mapLayer !== 'none');
  const { data: supplyRegions, isFetching: supplyFetching } = useDistrictSupply(
    mapLayer === 'amenity',
  );

  // The amenity layer reuses the population heat canvas with a different value
  // per 동: franchise counts per km² instead of residents per km². Both
  // endpoints key on emdCode, so the geometry comes from one and the metric
  // from the other with no extra request.
  const amenityRegions = useMemo(() => {
    if (mapLayer !== 'amenity' || !densityRegions || !supplyRegions) return null;
    const amenityByCode = new Map(supplyRegions.map((d) => [d.emdCode, d.amenityTotal]));
    return densityRegions
      .filter((region) => amenityByCode.has(region.emdCode))
      .map((region) => ({
        ...region,
        densityPerKm2: (amenityByCode.get(region.emdCode) ?? 0) / Math.max(region.areaKm2, 0.0001),
      }));
  }, [mapLayer, densityRegions, supplyRegions]);

  const activeRegions =
    mapLayer === 'amenity'
      ? amenityRegions
      : mapLayer === 'population'
        ? (densityRegions ?? null)
        : null;

  const { data: districtBoundaries } = useDistrictBoundaries(Boolean(filters.district));
  const districtBoundary = filters.district
    ? (districtBoundaries?.find(
        (boundary) => boundary.sggCode === DISTRICT_CODES[filters.district as District],
      ) ?? null)
    : null;

  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [clusterIds, setClusterIds] = useState<number[] | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapControlsRef = useRef<MapControls | null>(null);
  const showError = useToastStore((s) => s.showError);

  // Give immediate feedback with the approximate center while the GIS
  // boundary is loading. Once the boundary arrives, KakaoMap fits its exact
  // bounds and this effect deliberately stops overriding that viewport.
  // Clearing back to "전체" still lands on Seomyeon.
  useEffect(() => {
    if (filters.district && districtBoundary) return;
    const center = filters.district
      ? DISTRICT_CENTERS[filters.district as District]
      : ALL_DISTRICTS_FOCUS;
    if (center) mapControlsRef.current?.focusRegion(center.lat, center.lng);
  }, [districtBoundary, filters.district]);

  function locateMe() {
    if (!navigator.geolocation) {
      showError(t('map.locateError'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        mapControlsRef.current?.panTo(latitude, longitude);
      },
      () => showError(t('map.locateError')),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

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

  // The selected home stays listed even when the pan that focused it pushes
  // it to the edge of the viewport, so the card you just clicked can't vanish
  // out from under the scroll.
  const isListed = (h: HousingSummary) =>
    (inViewport(h) || h.id === selectedHousingId) && inCluster(h);

  const listResults = results?.filter((r) => isListed(r.housing));
  const listHousing = results ? null : baseHousing.filter(isListed);

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

  // Only the nearest POI per category is "the destination" (animated +
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
      .flatMap((m): MapTrail[] => {
        const color = poiColorForCategoryName(m.categoryName);
        const to = { lat: m.pois[0].lat, lng: m.pois[0].lng };
        const distanceMeters = haversineMeters(from, to);
        const primary: MapTrail = {
          id: `${housing.id}-${m.categoryName}`,
          path: [from, to],
          distanceMeters,
          durationMinutes: walkingMinutes(distanceMeters),
          color,
          emphasis: 'primary',
        };
        const subtle = m.pois.slice(1).map((p, i): MapTrail => ({
          id: `${housing.id}-${m.categoryName}-sub-${i}`,
          path: [from, { lat: p.lat, lng: p.lng }],
          color,
          emphasis: 'subtle',
        }));
        return [primary, ...subtle];
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
    panelView === 'saved' ? savedHousing.length : (listResults?.length ?? listHousing?.length ?? 0);

  // Two different kinds of "not shown": trimmed by the render cap, and
  // filtered out because the map was panned away from them. The second one is
  // the confusing one, so it gets a way back.
  const totalMatches = results?.length ?? baseHousing.length;
  const moreInView = panelView === 'saved' ? 0 : Math.max(0, listCount - LIST_RENDER_CAP);
  const outsideView = panelView === 'saved' ? 0 : Math.max(0, totalMatches - listCount);

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
        if (marker.kind !== 'housing') return;
        toggleSelectedHousing(marker.id);
        setClusterIds((current) =>
          current !== null && !current.includes(marker.id) ? null : current,
        );
      }}
      onMapClick={() => {
        clearSelectedHousing();
        setClusterIds(null);
      }}
      onClusterClick={(ids) =>
        setClusterIds((current) =>
          current !== null &&
          current.length === ids.length &&
          ids.every((id) => current.includes(id))
            ? null
            : ids,
        )
      }
      activeClusterIds={clusterIds}
      onBoundsChange={setMapBounds}
      densityRegions={activeRegions}
      districtBoundary={districtBoundary}
      controlsRef={mapControlsRef}
      userLocation={userLocation}
      fitKey={fitKey}
    >
      <ExploreNavbar />

      <div className='pointer-events-none relative min-h-0 flex-1'>
        <FilterPanel activeFilterCount={activeFilterCount} />

        <div className='pointer-events-auto absolute top-3 right-[23.5rem] z-10 hidden items-center gap-1 rounded-full border border-slate-light/30 bg-lilac/95 p-1 shadow-lg backdrop-blur sm:flex'>
          <button
            type='button'
            aria-label={t('map.zoomIn')}
            title={t('map.zoomIn')}
            onClick={() => mapControlsRef.current?.zoomIn()}
            className='rounded-full p-2 text-plum transition-colors hover:bg-plum/10'
          >
            <Plus className='size-4' />
          </button>
          <button
            type='button'
            aria-label={t('map.zoomOut')}
            title={t('map.zoomOut')}
            onClick={() => mapControlsRef.current?.zoomOut()}
            className='rounded-full p-2 text-plum transition-colors hover:bg-plum/10'
          >
            <Minus className='size-4' />
          </button>
          <button
            type='button'
            aria-label={t('map.locate')}
            title={t('map.locate')}
            onClick={locateMe}
            className='rounded-full p-2 text-plum transition-colors hover:text-violet'
          >
            <LocateFixed className='size-4' />
          </button>
        </div>

        <div className='pointer-events-none absolute bottom-4 left-3 z-10 flex items-center gap-2'>
          {(['population', 'amenity'] as const).map((layer) => {
            // The amenity metric aggregates the 100m grid per 동, so it can
            // take a beat. Without this the button reads as pressed while
            // nothing paints, which looks broken rather than busy.
            const pending = layer === 'amenity' && mapLayer === 'amenity' && supplyFetching;
            return (
              <button
                key={layer}
                type='button'
                aria-pressed={mapLayer === layer}
                aria-busy={pending}
                onClick={() => setMapLayer(layer)}
                className={cn(
                  'pointer-events-auto flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium shadow-lg backdrop-blur transition-all',
                  mapLayer === layer
                    ? 'border-plum bg-plum text-lilac'
                    : 'border-slate-light/30 bg-lilac/95 text-plum hover:border-violet/40',
                )}
              >
                {pending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : layer === 'population' ? (
                  <Layers className='size-4' />
                ) : (
                  <Store className='size-4' />
                )}
                {t(layer === 'population' ? 'explore.densityToggle' : 'explore.amenityToggle')}
              </button>
            );
          })}
          {mapLayer !== 'none' && (
            <div className='pointer-events-auto flex items-center gap-1.5 rounded-full border border-slate-light/30 bg-lilac/95 px-3 py-1.5 shadow-lg backdrop-blur'>
              <span className='text-xs text-slate'>{t('explore.densityLow')}</span>
              {['#a99bd8', '#8a76c9', '#6d4aff', '#d9a441', '#c98a1f'].map((c) => (
                <span
                  key={c}
                  aria-hidden
                  className='size-3 rounded-sm'
                  style={{ backgroundColor: c }}
                />
              ))}
              <span className='text-xs text-slate'>{t('explore.densityHigh')}</span>
              <span className='ml-1 font-mono text-xs text-slate-light'>
                {t(mapLayer === 'amenity' ? 'explore.amenitySource' : 'explore.densitySource')}
              </span>
            </div>
          )}
        </div>

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
              listResults.slice(0, LIST_RENDER_CAP).map((result, i) => (
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
            (listHousing ?? []).slice(0, LIST_RENDER_CAP).map((housing, i) => (
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

          {moreInView > 0 || outsideView > 0 ? (
            <ListItem
              key='list-footer'
              index={0}
            >
              <ListFooterNote
                moreInView={moreInView}
                outsideView={outsideView}
                onFit={() => mapControlsRef.current?.fitToResults()}
              />
            </ListItem>
          ) : null}
        </ListPanel>
      </div>
    </MapShell>
  );
}
