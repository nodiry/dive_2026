import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MatchCard, MatchSummaryBar } from '@/components/life-match/match-card';
import { HousingMap, type MapHandle } from '@/components/map/housing-map';
import { ScreenHeader } from '@/components/nav/screen-header';
import { Chip, Stepper } from '@/components/ui/controls';
import { MeterBar } from '@/components/ui/data';
import { SliderRow } from '@/components/ui/slider';
import { Card, EmptyState, Section, Skeleton } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { DISTRICTS } from '@/constants/districts';
import { Colors, FontSize, Radius, Spacing, Tint } from '@/constants/theme';
import {
  DEFAULT_LIFE_PROFILE,
  DEFAULT_WEEKLY_ROUTINE,
  DESTINATIONS,
  DESTINATION_IDS,
  PRESET_KEYS,
  ROUTINE_KEYS,
  ROUTINE_PRESETS,
  buildLifestylePreferences,
  deriveLifeStats,
  type DestinationId,
  type LifeProfile,
  type WeeklyRoutine,
} from '@/features/life-match/model';
import { useLifestyleRecommendation } from '@/hooks/useRecommendation';
import type { LifestyleRecommendationRequest, LifestyleRecommendationResult } from '@/shared/schemas';
import { formatWon } from '@/utils/format';

function buildRequest(profile: LifeProfile, routine: WeeklyRoutine): LifestyleRecommendationRequest {
  const stats = deriveLifeStats(routine);
  const destination = DESTINATIONS[profile.destinationId];
  return {
    preferences: buildLifestylePreferences(profile, routine, stats),
    depositMax: profile.depositMaxManwon * 10000,
    rentMax: profile.rentMaxManwon * 10000,
    minAreaM2: profile.minAreaM2,
    minRoomCount: profile.minRoomCount,
    elevatorRequired: profile.elevatorRequired || undefined,
    parkingRequired: profile.parkingRequired || undefined,
    district: profile.district || undefined,
    type: profile.type || undefined,
    lifeStats: stats,
    routine,
    destinationLat: destination.lat,
    destinationLng: destination.lng,
    destinationFrequency: profile.destinationFrequency,
    radiusMeters: 700,
  };
}

export default function LifeMatchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<LifeProfile>(DEFAULT_LIFE_PROFILE);
  const [routine, setRoutine] = useState<WeeklyRoutine>({ ...DEFAULT_WEEKLY_ROUTINE });
  const [results, setResults] = useState<LifestyleRecommendationResult[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mapRef = useRef<MapHandle>(null);
  const recommendation = useLifestyleRecommendation();
  const mutateRef = useRef(recommendation.mutate);
  const firstRun = useRef(true);
  const sequence = useRef(0);

  useEffect(() => {
    mutateRef.current = recommendation.mutate;
  });

  useEffect(() => {
    const delay = firstRun.current ? 0 : 600;
    firstRun.current = false;
    const timer = setTimeout(() => {
      const seq = sequence.current + 1;
      sequence.current = seq;
      mutateRef.current(buildRequest(profile, routine), {
        onSuccess: (data) => {
          if (seq === sequence.current) setResults(data);
        },
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [profile, routine]);

  const stats = deriveLifeStats(routine);
  const set = <K extends keyof LifeProfile>(key: K, value: LifeProfile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));
  const topResults = results.slice(0, 3);
  const best = topResults[0]?.matchRate ?? 0;

  const pins = topResults
    .filter((result) => result.housing.lat != null && result.housing.lng != null)
    .map((result, index) => ({
      id: result.housing.id,
      lat: result.housing.lat as number,
      lng: result.housing.lng as number,
      priceLabel: formatWon(result.housing.minDeposit, t('card.noData')),
      label: result.housing.projectName,
      rank: index + 1,
    }));
  const activeId = topResults.some((result) => result.housing.id === selectedId)
    ? selectedId
    : (topResults[0]?.housing.id ?? null);

  const selectResult = (id: number) => {
    setSelectedId(id);
    const target = topResults.find((result) => result.housing.id === id)?.housing;
    if (target?.lat != null && target?.lng != null) {
      mapRef.current?.moveTo({ lat: target.lat, lng: target.lng }, 4);
    }
  };

  const pinKey = pins.map((pin) => pin.id).join(',');
  useEffect(() => {
    if (pinKey) mapRef.current?.fit();
  }, [pinKey]);

  const toggles: [keyof LifeProfile, string][] = [
    ['elevatorRequired', t('lifeMatch.elevator')],
    ['parkingRequired', t('lifeMatch.parking')],
    ['hasVehicle', t('lifeMatch.vehicle')],
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('lifeMatch.navLabel')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Txt variant="title">{t('lifeMatch.title')}</Txt>
        <Txt variant="body" color="slate" style={styles.intro}>
          {t('lifeMatch.intro')}
        </Txt>
        <Txt variant="caption">{t('lifeMatch.liveNote')}</Txt>

        <Card style={styles.card}>
          <Section label={t('lifeMatch.routineTitle')}>
            <View style={styles.wrap}>
              {PRESET_KEYS.map((key) => (
                <Chip
                  key={key}
                  label={t(`lifeMatch.presets.${key}`)}
                  onPress={() => setRoutine({ ...ROUTINE_PRESETS[key] })}
                />
              ))}
            </View>
            <View style={styles.steppers}>
              {ROUTINE_KEYS.map((key) => (
                <Stepper
                  key={key}
                  label={t(`lifeMatch.activities.${key}`)}
                  value={routine[key]}
                  onChange={(value) => setRoutine((current) => ({ ...current, [key]: value }))}
                />
              ))}
            </View>
          </Section>
        </Card>

        <Card style={styles.card}>
          <Section label={t('lifeMatch.statsTitle')}>
            <View style={styles.stats}>
              <MeterBar
                label={t('lifeMatch.fun')}
                value={stats.fun}
                max={100}
                labelWidth={48}
                suffix={String(stats.fun)}
              />
              <MeterBar
                label={t('lifeMatch.work')}
                value={stats.work}
                max={100}
                color={Colors.plum}
                labelWidth={48}
                suffix={String(stats.work)}
              />
              <MeterBar
                label={t('lifeMatch.rest')}
                value={stats.rest}
                max={100}
                color={Colors.gold}
                labelWidth={48}
                suffix={String(stats.rest)}
              />
            </View>
          </Section>
        </Card>

        <Card style={styles.card}>
          <Section label={t('lifeMatch.budget')}>
            <View style={styles.sliders}>
              <SliderRow
                label={t('lifeMatch.depositMax')}
                min={500}
                max={10000}
                step={100}
                value={profile.depositMaxManwon}
                display={profile.depositMaxManwon.toLocaleString('ko-KR')}
                onChange={(value) => set('depositMaxManwon', value)}
              />
              <SliderRow
                label={t('lifeMatch.rentMax')}
                min={5}
                max={100}
                step={1}
                value={profile.rentMaxManwon}
                onChange={(value) => set('rentMaxManwon', value)}
              />
            </View>
          </Section>
        </Card>

        <Card style={styles.card}>
          <Section label={t('lifeMatch.home')}>
            <View style={styles.sliders}>
              <SliderRow
                label={t('lifeMatch.minArea')}
                min={10}
                max={85}
                step={1}
                value={profile.minAreaM2}
                display={t('units.area', { value: profile.minAreaM2 })}
                onChange={(value) => set('minAreaM2', value)}
              />
              <SliderRow
                label={t('lifeMatch.minRooms')}
                min={1}
                max={5}
                step={1}
                value={profile.minRoomCount}
                onChange={(value) => set('minRoomCount', value)}
              />
            </View>
            <View style={styles.wrap}>
              {toggles.map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={Boolean(profile[key])}
                  onPress={() => set(key, !profile[key] as never)}
                />
              ))}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.districtRow}
            >
              <Chip
                label={t('explore.districtAll')}
                selected={!profile.district}
                onPress={() => set('district', '')}
              />
              {DISTRICTS.map((district) => (
                <Chip
                  key={district}
                  label={t(`districts.${district}`)}
                  selected={profile.district === district}
                  onPress={() => set('district', district)}
                />
              ))}
            </ScrollView>
          </Section>
        </Card>

        <Card style={styles.card}>
          <Section label={t('lifeMatch.location')}>
            <View style={styles.wrap}>
              {DESTINATION_IDS.map((id: DestinationId) => (
                <Chip
                  key={id}
                  label={t(`lifeMatch.destinationOptions.${id}`)}
                  selected={profile.destinationId === id}
                  onPress={() => set('destinationId', id)}
                />
              ))}
            </View>
            <View style={styles.sliders}>
              <SliderRow
                label={t('lifeMatch.destinationFrequency')}
                min={0}
                max={7}
                step={1}
                value={profile.destinationFrequency}
                display={t('lifeMatch.perWeek', { value: profile.destinationFrequency })}
                onChange={(value) => set('destinationFrequency', value)}
              />
            </View>
            <Txt variant="caption">{t('lifeMatch.destinationNote')}</Txt>
          </Section>
        </Card>

        <View style={styles.resultsHead}>
          <Txt variant="heading">{t('lifeMatch.resultTitle')}</Txt>
        </View>
        <MatchSummaryBar
          count={results.length}
          top={best}
          pending={recommendation.isPending}
        />

        {pins.length > 0 ? (
          <View style={styles.mapCard}>
            <HousingMap
              ref={mapRef}
              fitOnLoad
              center={{ lat: pins[0].lat, lng: pins[0].lng }}
              style={StyleSheet.absoluteFill}
              state={{ pins, selectedId: activeId }}
              onMarkerPress={selectResult}
            />
          </View>
        ) : recommendation.isPending ? (
          <Skeleton height={200} />
        ) : (
          <EmptyState message={t('detail.noCoords')} />
        )}

        {recommendation.isError ? (
          <EmptyState tone="error" message={t('lifeMatch.error')} />
        ) : topResults.length === 0 ? (
          recommendation.isPending ? (
            <View style={styles.skeletons}>
              <Skeleton height={210} />
              <Skeleton height={210} />
            </View>
          ) : (
            <EmptyState message={t('lifeMatch.noResults')} />
          )
        ) : (
          <View style={styles.results}>
            {topResults.map((result, index) => (
              <MatchCard
                key={result.housing.id}
                result={result}
                rank={index + 1}
                best={best}
                selected={result.housing.id === activeId}
                onSelect={() => selectResult(result.housing.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilac },
  content: { padding: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.md },
  intro: { fontSize: FontSize.sm },
  card: { gap: Spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  steppers: { marginTop: Spacing.md },
  stats: { gap: Spacing.sm },
  sliders: { gap: Spacing.md },
  districtRow: { gap: Spacing.sm, paddingVertical: 2 },
  resultsHead: { marginTop: Spacing.xl },
  results: { gap: Spacing.md },
  mapCard: {
    height: 200,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    backgroundColor: Colors.lilacDim,
    overflow: 'hidden',
  },
  skeletons: { gap: Spacing.md },
});
