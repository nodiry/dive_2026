import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterSheet } from '@/components/explore/filter-sheet';
import {
  DEFAULT_RADIUS,
  EMPTY_FILTERS,
  countActiveFilters,
  positiveNumber,
  toHousingQuery,
  type ExploreFilters,
  type ExploreMode,
} from '@/components/explore/explore-state';
import { HousingCard } from '@/components/housing/housing-card';
import { HousingMap, type MapBounds, type MapHandle } from '@/components/map/housing-map';
import type { MapPoi, MapTrail } from '@/components/map/kakao-map-html';
import { Chip, IconButton, Segmented } from '@/components/ui/controls';
import { ScoreBar, TagStrip, type TagItem } from '@/components/ui/data';
import { PressableScale } from '@/components/ui/press';
import { SnapSheet } from '@/components/ui/sheet';
import { EmptyState, Skeleton } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { DISTRICT_CENTERS, DEFAULT_CAMERA, type District } from '@/constants/districts';
import { PERSONAS, type PersonaKey } from '@/constants/personas';
import { poiCategoryLabel, poiColorForCategoryName, poiIconKeyForCategoryName } from '@/constants/poi';
import {
  Colors,
  FloatingShadow,
  FontFamily,
  FontSize,
  HEAT_SWATCHES,
  MONO,
  Radius,
  Spacing,
  Tint,
} from '@/constants/theme';
import { useDrawer } from '@/contexts/drawer';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDistrictDensity, useDistrictSupply } from '@/hooks/useDistrictDensity';
import { useHousingSearch } from '@/hooks/useHousing';
import { useLifestyleRecommendation } from '@/hooks/useRecommendation';
import { useSavedHousing } from '@/hooks/useSaved';
import type { CategoryWeights } from '@/constants/poi';
import type { HousingSummary, LifestyleRecommendationResult } from '@/shared/schemas';
import { formatMeters, formatWon } from '@/utils/format';
import { walkingMinutes } from '@/utils/geo';

const PEEK = 212;
const SNAP_HIDDEN = 0;
const SNAP_PEEK = 1;
const SNAP_HALF = 2;
const SNAP_FULL = 3;

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { open: openDrawer } = useDrawer();
  const mapRef = useRef<MapHandle>(null);
  const listRef = useRef<FlatList<unknown>>(null);

  const [mode, setMode] = useState<ExploreMode>('criteria');
  const [filters, setFilters] = useState<ExploreFilters>(EMPTY_FILTERS);
  const [weights, setWeights] = useState<CategoryWeights>({});
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS);
  const [activePersona, setActivePersona] = useState<PersonaKey | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [clusterIds, setClusterIds] = useState<number[] | null>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [mapLayer, setMapLayer] = useState<'none' | 'population' | 'amenity'>('none');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sheetIndex, setSheetIndex] = useState(SNAP_HALF);
  const [prefResults, setPrefResults] = useState<LifestyleRecommendationResult[]>([]);
  const requestSeq = useRef(0);

  const halfHeight = Math.max(PEEK + 80, Math.round(screenHeight * 0.52));
  const snapPoints = [0, PEEK, halfHeight, Math.round(screenHeight * 0.9)];
  const maxSheetHeight = snapPoints[snapPoints.length - 1];
  const sheetOffset = useSharedValue(maxSheetHeight - halfHeight);
  const controlsBottom = insets.bottom + Spacing.md;

  const controlsStyle = useAnimatedStyle(() => {
    const visible = maxSheetHeight - sheetOffset.value;
    return {
      transform: [{ translateY: -Math.min(visible, halfHeight) }],
      opacity: interpolate(visible, [halfHeight, halfHeight + 72], [1, 0], Extrapolation.CLAMP),
    };
  });

  const debouncedFilters = useDebouncedValue(filters, 350);
  const criteria = useHousingSearch(toHousingQuery(debouncedFilters));
  const recommend = useLifestyleRecommendation();
  const density = useDistrictDensity(mapLayer !== 'none');
  // Only the amenity layer reads this, and it is the slowest query we make.
  const supply = useDistrictSupply(mapLayer === 'amenity');
  const { isSaved, toggleSaved, isLoggedIn } = useSavedHousing();

  const selectedCategories = Object.keys(weights);
  const liveKey = JSON.stringify([
    weights,
    radiusMeters,
    debouncedFilters.district,
    debouncedFilters.depositMaxManwon,
    debouncedFilters.type,
  ]);
  const recommendReset = recommend.reset;
  const recommendMutate = recommend.mutate;

  useEffect(() => {
    if (mode !== 'preference') return;
    if (selectedCategories.length === 0) {
      requestSeq.current += 1;
      recommendReset();
      setPrefResults([]);
      return;
    }
    const timer = setTimeout(() => {
      // Slider drags outrun the API, and responses can settle out of order, so
      // only the newest request may publish its ranking.
      const seq = requestSeq.current + 1;
      requestSeq.current = seq;
      recommendMutate(
        {
          preferences: selectedCategories.map((categoryName) => ({
            categoryName,
            weight: weights[categoryName],
          })),
          district: debouncedFilters.district || undefined,
          type: debouncedFilters.type || undefined,
          depositMax: positiveNumber(debouncedFilters.depositMaxManwon, 10000),
          radiusMeters,
        },
        {
          onSuccess: (data) => {
            if (seq === requestSeq.current) setPrefResults(data);
          },
        },
      );
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, liveKey, recommendReset, recommendMutate]);

  useEffect(() => {
    const center = filters.district
      ? DISTRICT_CENTERS[filters.district as District]
      : DEFAULT_CAMERA;
    if (center) mapRef.current?.moveTo({ lat: center.latitude, lng: center.longitude }, 7);
  }, [filters.district]);

  const results = mode === 'preference' && prefResults.length > 0 ? prefResults : null;
  const showingResults = results !== null && results.length > 0;
  const baseHousing = criteria.data ?? [];
  const visibleHousing: HousingSummary[] = showingResults
    ? results.map((result) => result.housing)
    : baseHousing;

  const rankById = new Map<number, number>();
  results?.forEach((result, index) => {
    if (index < 3) rankById.set(result.housing.id, index + 1);
  });

  const inViewport = (housing: HousingSummary) => {
    if (housing.lat == null || housing.lng == null) return true;
    if (!bounds) return true;
    return (
      housing.lat >= bounds.swLat &&
      housing.lat <= bounds.neLat &&
      housing.lng >= bounds.swLng &&
      housing.lng <= bounds.neLng
    );
  };
  const inCluster = (housing: HousingSummary) =>
    clusterIds === null || clusterIds.includes(housing.id);

  const listResults = results?.filter(
    (result) => inViewport(result.housing) && inCluster(result.housing),
  );
  const listHousing = results
    ? null
    : baseHousing.filter((housing) => inViewport(housing) && inCluster(housing));
  const listCount = listResults?.length ?? listHousing?.length ?? 0;

  const selectedResult = results?.find((result) => result.housing.id === selectedId) ?? null;

  const pois: MapPoi[] = selectedResult
    ? selectedResult.matches.flatMap((match) =>
        match.pois.map((poi, index): MapPoi => {
          const distance = poi.distanceMeters;
          return {
            id: `${match.categoryName}-${index}`,
            lat: poi.lat,
            lng: poi.lng,
            label: poi.name,
            color: poiColorForCategoryName(match.categoryName),
            icon: poiIconKeyForCategoryName(match.categoryName) ?? 'fallback',
            highlighted: index === 0,
            tooltip:
              index === 0
                ? `${poi.name} · ${formatMeters(distance)} · ${t('units.walkMinutes', {
                    minutes: walkingMinutes(distance),
                  })}`
                : undefined,
          };
        }),
      )
    : [];

  const trails: MapTrail[] = (() => {
    if (!selectedResult) return [];
    const { housing, matches } = selectedResult;
    if (housing.lat == null || housing.lng == null) return [];
    return matches
      .filter((match) => match.pois.length > 0)
      .flatMap((match) =>
        match.pois.map((poi, index) => ({
          id: `${match.categoryName}-${index}`,
          fromLat: housing.lat as number,
          fromLng: housing.lng as number,
          toLat: poi.lat,
          toLng: poi.lng,
          color: poiColorForCategoryName(match.categoryName),
          subtle: index > 0,
        })),
      );
  })();

  const circle =
    selectedResult && selectedResult.housing.lat != null && selectedResult.housing.lng != null
      ? {
          lat: selectedResult.housing.lat,
          lng: selectedResult.housing.lng,
          radiusMeters,
        }
      : null;

  // The amenity layer reuses the same heat canvas with a different value per
  // 동: franchise counts per km² instead of residents. Both endpoints key on
  // emdCode, so geometry comes from one and the metric from the other.
  const amenityByCode = new Map((supply.data ?? []).map((d) => [d.emdCode, d.amenityTotal]));
  const heatRegions =
    mapLayer === 'none' || !density.data
      ? null
      : density.data.map((region) => ({
          centroidLat: region.centroidLat,
          centroidLng: region.centroidLng,
          areaKm2: region.areaKm2,
          densityPerKm2:
            mapLayer === 'amenity'
              ? (amenityByCode.get(region.emdCode) ?? 0) / Math.max(region.areaKm2, 0.0001)
              : region.densityPerKm2,
        }));

  const mapState = {
    pins: visibleHousing
      .filter((housing) => housing.lat != null && housing.lng != null)
      .map((housing) => ({
        id: housing.id,
        lat: housing.lat as number,
        lng: housing.lng as number,
        priceLabel: formatWon(housing.minDeposit, t('card.noData')),
        label: housing.projectName,
        rank: rankById.get(housing.id),
      })),
    pois,
    trails,
    circle,
    selectedId,
    clusterIds,
    density: heatRegions,
    userLocation,
  };

  const activeFilterCount = countActiveFilters(filters, mode, weights);

  const selectPersona = (key: PersonaKey) => {
    const persona = PERSONAS.find((item) => item.key === key);
    if (!persona) return;
    setActivePersona(key);
    setWeights({ ...persona.weights });
    setRadiusMeters(persona.radiusMeters);
  };

  const selectHousing = (id: number, coords?: { lat: number; lng: number }) => {
    setSelectedId(id);
    setSheetIndex(SNAP_PEEK);
    if (coords) mapRef.current?.moveTo(coords, 4);
    const index = showingResults
      ? (listResults ?? []).findIndex((result) => result.housing.id === id)
      : (listHousing ?? []).findIndex((housing) => housing.id === id);
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  };

  const locateMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({});
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation(coords);
      mapRef.current?.moveTo(coords, 4);
    } catch {
      // Permission dismissed, location services off, or the fix timed out:
      // leave the map where it is rather than crashing the screen.
    }
  };

  const matchTags = (result: LifestyleRecommendationResult): TagItem[] =>
    result.matches.map((match) => ({
      label: poiCategoryLabel(match.categoryName, t),
      sublabel:
        match.count > 0
          ? t('units.matchCount', {
              value: match.count,
              meters: Math.round(match.nearestMeters ?? 0),
            })
          : t('units.matchNone'),
      muted: match.count === 0,
    }));

  const fetching = criteria.isFetching || recommend.isPending;
  const bestScore = results?.[0]?.score ?? 0;

  const renderEmpty = () => {
    if (mode === 'preference' && selectedCategories.length === 0) {
      return <EmptyState message={t('explore.prompt')} />;
    }
    if (fetching) {
      return (
        <View style={styles.skeletons}>
          <Skeleton height={132} />
          <Skeleton height={132} />
          <Skeleton height={132} />
        </View>
      );
    }
    if (criteria.isError || recommend.isError) {
      return <EmptyState tone="error" message={t('explore.error')} />;
    }
    return <EmptyState message={mode === 'preference' ? t('explore.emptyResult') : t('explore.empty')} />;
  };

  return (
    <View style={styles.screen}>
      <HousingMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        state={mapState}
        onMarkerPress={(id) => {
          const housing = visibleHousing.find((item) => item.id === id);
          if (selectedId === id) setSelectedId(null);
          else if (housing?.lat != null && housing?.lng != null) {
            selectHousing(id, { lat: housing.lat, lng: housing.lng });
          } else selectHousing(id);
        }}
        onClusterPress={(ids) =>
          setClusterIds((current) =>
            current && current.length === ids.length && ids.every((id) => current.includes(id))
              ? null
              : ids,
          )
        }
        onMapPress={() => {
          setSelectedId(null);
          setClusterIds(null);
        }}
        onBoundsChange={setBounds}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.topRow}>
          <IconButton icon="menu" onPress={openDrawer} floating label={t('menu.open')} />
          <PressableScale onPress={() => router.navigate('/ai')} style={styles.searchPill}>
            <Ionicons name="sparkles" size={16} color={Colors.violet} />
            <Txt style={styles.searchText} numberOfLines={1}>
              {t('explore.searchPlaceholder')}
            </Txt>
          </PressableScale>
        </View>

        <View style={styles.topRow}>
          <Segmented
            value={mode}
            onChange={(next) => {
              setMode(next);
              setSelectedId(null);
            }}
            options={[
              { value: 'criteria', label: t('explore.modeCriteria') },
              { value: 'preference', label: t('explore.modePreference') },
            ]}
            style={styles.segmented}
          />
          <PressableScale onPress={() => setFiltersOpen(true)} style={styles.filterPill}>
            <Ionicons name="options-outline" size={16} color={Colors.plum} />
            <Txt style={styles.filterText}>{t('explore.filters')}</Txt>
            {activeFilterCount > 0 ? (
              <View style={styles.badge}>
                <Txt style={styles.badgeText}>{activeFilterCount}</Txt>
              </View>
            ) : null}
          </PressableScale>
        </View>
      </View>

      <Animated.View
        pointerEvents={sheetIndex === SNAP_FULL ? 'none' : 'auto'}
        style={[styles.sideControls, { bottom: controlsBottom }, controlsStyle]}
      >
        <IconButton icon="locate" onPress={locateMe} floating label={t('explore.locate')} />
        <IconButton
          icon="layers"
          onPress={() => setMapLayer((v) => (v === 'population' ? 'none' : 'population'))}
          floating
          active={mapLayer === 'population'}
          label={t('explore.densityToggle')}
        />
        <IconButton
          icon="storefront"
          onPress={() => setMapLayer((v) => (v === 'amenity' ? 'none' : 'amenity'))}
          floating
          active={mapLayer === 'amenity'}
          label={t('explore.amenityToggle')}
        />
      </Animated.View>

      {mapLayer !== 'none' ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.legend, { bottom: controlsBottom }, controlsStyle]}
        >
          <Txt variant="caption">{t('explore.densityLow')}</Txt>
          {HEAT_SWATCHES.map((color) => (
            <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
          ))}
          <Txt variant="caption">{t('explore.densityHigh')}</Txt>
          <Txt variant="caption" style={styles.legendSource}>
            {t(mapLayer === 'amenity' ? 'explore.amenitySource' : 'explore.densitySource')}
          </Txt>
        </Animated.View>
      ) : null}

      {sheetIndex === SNAP_HIDDEN ? (
        <View style={[styles.restoreWrap, { bottom: controlsBottom }]}>
          <PressableScale onPress={() => setSheetIndex(SNAP_PEEK)} style={styles.restore}>
            <Ionicons name="chevron-up" size={16} color={Colors.lilac} />
            <Txt style={styles.restoreText}>{t('explore.showResults', { value: listCount })}</Txt>
          </PressableScale>
        </View>
      ) : null}

      <SnapSheet
        snapPoints={snapPoints}
        index={sheetIndex}
        onIndexChange={setSheetIndex}
        offset={sheetOffset}
        minTapIndex={SNAP_PEEK}
        header={
          <View style={styles.sheetHeader}>
            <View style={[styles.pulse, fetching && { backgroundColor: Colors.violet }]} />
            <Txt variant="subheading">{t('explore.resultsHeading')}</Txt>
            <Txt variant="mono" style={styles.count}>
              {listCount}
            </Txt>
          </View>
        }
        headerAction={
          <>
            {clusterIds ? (
              <Chip
                label={t('explore.clusterFilter')}
                selected
                onPress={() => setClusterIds(null)}
              />
            ) : null}
            <PressableScale
              onPress={() => setSheetIndex(SNAP_HIDDEN)}
              hitSlop={10}
              accessibilityLabel={t('explore.hideList')}
              style={styles.hideButton}
            >
              <Ionicons name="chevron-down" size={18} color={Colors.slate} />
            </PressableScale>
          </>
        }
      >
        {showingResults ? (
          <FlatList
            ref={listRef as never}
            data={listResults ?? []}
            keyExtractor={(item) => String(item.housing.id)}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxl }]}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => undefined}
            ListEmptyComponent={renderEmpty()}
            renderItem={({ item }) => (
              <HousingCard
                housing={item.housing}
                rank={rankById.get(item.housing.id)}
                selected={item.housing.id === selectedId}
                saved={isSaved(item.housing.id)}
                onPress={() => {
                  if (selectedId === item.housing.id) router.push(`/housing/${item.housing.id}`);
                  else
                    selectHousing(
                      item.housing.id,
                      item.housing.lat != null && item.housing.lng != null
                        ? { lat: item.housing.lat, lng: item.housing.lng }
                        : undefined,
                    );
                }}
                onToggleSave={
                  isLoggedIn ? () => toggleSaved(item.housing.id) : () => router.push('/login')
                }
              >
                <View style={styles.cardExtra}>
                  <ScoreBar score={item.score} best={bestScore} />
                  <TagStrip tags={matchTags(item)} />
                </View>
              </HousingCard>
            )}
          />
        ) : (
          <FlatList
            ref={listRef as never}
            data={listHousing ?? []}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xxl }]}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => undefined}
            ListEmptyComponent={renderEmpty()}
            renderItem={({ item }) => (
              <HousingCard
                housing={item}
                selected={item.id === selectedId}
                saved={isSaved(item.id)}
                onPress={() => {
                  if (selectedId === item.id) router.push(`/housing/${item.id}`);
                  else
                    selectHousing(
                      item.id,
                      item.lat != null && item.lng != null
                        ? { lat: item.lat, lng: item.lng }
                        : undefined,
                    );
                }}
                onToggleSave={isLoggedIn ? () => toggleSaved(item.id) : () => router.push('/login')}
              />
            )}
          />
        )}
      </SnapSheet>

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        mode={mode}
        filters={filters}
        onFiltersChange={setFilters}
        weights={weights}
        onWeightsChange={(next) => {
          setWeights(next);
          setActivePersona(null);
        }}
        radiusMeters={radiusMeters}
        onRadiusChange={setRadiusMeters}
        activePersona={activePersona}
        onPersonaChange={selectPersona}
        resultCount={listCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilacDim },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Tint.floating,
    borderWidth: 1,
    borderColor: Tint.border,
    ...FloatingShadow,
  },
  searchText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.slate,
  },
  segmented: { flex: 1, ...FloatingShadow, backgroundColor: Tint.floating },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Tint.floating,
    borderWidth: 1,
    borderColor: Tint.border,
    ...FloatingShadow,
  },
  filterText: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.plum },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: MONO, fontSize: 10, color: Colors.white },
  sideControls: { position: 'absolute', right: Spacing.md, gap: Spacing.sm },
  legend: {
    position: 'absolute',
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Tint.floating,
    borderWidth: 1,
    borderColor: Tint.border,
    ...FloatingShadow,
  },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendSource: { marginLeft: 4 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  pulse: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    backgroundColor: Tint.borderInput,
  },
  count: { color: Colors.slate },
  hideButton: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.lilacDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  restore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 11,
    borderRadius: Radius.full,
    backgroundColor: Colors.plum,
    ...FloatingShadow,
  },
  restoreText: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.lilac },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
  skeletons: { gap: Spacing.md },
  cardExtra: { marginTop: Spacing.md, gap: Spacing.sm },
});
