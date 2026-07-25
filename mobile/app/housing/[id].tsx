import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HousingMap, RoadviewPanel } from '@/components/map/housing-map';
import { Button, Segmented } from '@/components/ui/controls';
import { MeterBar, StatTile, TagStrip, TypeBadge } from '@/components/ui/data';
import { PressableScale } from '@/components/ui/press';
import { Card, EmptyState, Section, Skeleton } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { Colors, FloatingShadow, Radius, Spacing, Tint } from '@/constants/theme';
import { useHousingDetail, useNeighborhood } from '@/hooks/useHousing';
import { useSavedHousing } from '@/hooks/useSaved';
import { formatArea, formatWon } from '@/utils/format';

export default function HousingDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const { id } = useLocalSearchParams<{ id: string }>();
  const housingId = Number(id);
  const { data: housing, isLoading, isError } = useHousingDetail(housingId);
  const { isSaved, toggleSaved, isLoggedIn } = useSavedHousing();
  const [view, setView] = useState<'map' | 'roadview'>('map');

  const geocoded = housing?.lat != null && housing?.lng != null;
  const neighborhood = useNeighborhood(housingId, Boolean(geocoded));
  const noData = t('card.noData');

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <FloatingBack onPress={goBack} top={insets.top + Spacing.sm} />
        <View style={styles.centered}>
          <Txt variant="body" color="slate">
            {t('detail.loading')}
          </Txt>
        </View>
      </View>
    );
  }

  if (isError || !housing) {
    return (
      <View style={styles.screen}>
        <FloatingBack onPress={goBack} top={insets.top + Spacing.sm} />
        <View style={styles.centered}>
          <EmptyState tone="error" message={t('detail.notFound')} />
        </View>
      </View>
    );
  }

  const saved = isSaved(housing.id);
  const area = formatArea(housing.minAreaM2, housing.maxAreaM2);
  const categories = neighborhood.data?.categories.slice(0, 6) ?? [];
  const maxCount = categories[0]?.count ?? 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {geocoded ? (
            view === 'map' ? (
              <HousingMap
                style={StyleSheet.absoluteFill}
                interactive={false}
                level={4}
                center={{ lat: housing.lat as number, lng: housing.lng as number }}
                fitOnLoad
                state={{
                  pins: [
                    {
                      id: housing.id,
                      lat: housing.lat as number,
                      lng: housing.lng as number,
                      priceLabel: formatWon(housing.minDeposit, noData),
                      label: housing.projectName,
                    },
                  ],
                  selectedId: housing.id,
                }}
              />
            ) : (
              <RoadviewPanel
                lat={housing.lat as number}
                lng={housing.lng as number}
                style={StyleSheet.absoluteFill}
              />
            )
          ) : (
            <View style={styles.heroEmpty}>
              <Txt variant="caption" style={styles.heroEmptyText}>
                {t('detail.noCoords')}
              </Txt>
            </View>
          )}

          {geocoded ? (
            <View style={[styles.viewToggle, { top: insets.top + Spacing.sm }]}>
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: 'map', label: t('detail.viewMap') },
                  { value: 'roadview', label: t('detail.viewRoadview') },
                ]}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <TypeBadge label={t(`housingType.${housing.type}`)} />
          <Txt variant="title" style={styles.name}>
            {housing.projectName}
          </Txt>
          <Txt variant="body" color="slate" style={styles.address}>
            {housing.address}
          </Txt>

          <View style={styles.tiles}>
            <StatTile
              label={t('detail.deposit')}
              value={formatWon(housing.minDeposit, noData)}
              accent
            />
            <StatTile label={t('detail.rent')} value={formatWon(housing.minRent, noData)} />
            <StatTile
              label={t('detail.units')}
              value={
                housing.totalUnits != null
                  ? t('units.totalUnits', { value: housing.totalUnits })
                  : noData
              }
            />
            <StatTile label={t('detail.builtDate')} value={housing.builtDate ?? noData} />
            <StatTile label={t('detail.area')} value={area ?? noData} />
            <StatTile
              label={t('detail.rooms')}
              value={housing.maxRooms != null ? String(housing.maxRooms) : noData}
            />
          </View>

          {geocoded ? (
            <Card style={styles.card}>
              <Section
                label={t('detail.neighborhood')}
                action={
                  neighborhood.data ? (
                    <Txt variant="caption">
                      {t('detail.radiusNote', { meters: neighborhood.data.radiusMeters })}
                    </Txt>
                  ) : null
                }
              >
                {neighborhood.isLoading ? (
                  <Skeleton height={160} />
                ) : neighborhood.isError || !neighborhood.data ? (
                  <EmptyState tone="error" message={t('detail.neighborhoodError')} />
                ) : (
                  <>
                    <View style={styles.sectionRow}>
                      <Txt variant="label">{t('detail.poiSection')}</Txt>
                      <Txt variant="mono">{neighborhood.data.poiTotal}</Txt>
                    </View>
                    <View style={styles.bars}>
                      {categories.map((category) => (
                        <MeterBar
                          key={category.category}
                          label={t(`poiMajorCategories.${category.category}`, {
                            defaultValue: category.category,
                          })}
                          value={category.count}
                          max={maxCount}
                          labelWidth={96}
                        />
                      ))}
                    </View>

                    <View style={styles.zones}>
                      <Txt variant="label" style={styles.zonesLabel}>
                        {t('detail.zoneSection')}
                      </Txt>
                      {neighborhood.data.zones.length === 0 ? (
                        <Txt variant="caption">{t('detail.zonesEmpty')}</Txt>
                      ) : (
                        <TagStrip
                          tags={neighborhood.data.zones.map((zone) => ({
                            label: zone.zoneType,
                            sublabel: `${Math.max(1, Math.round(zone.share * 100))}%`,
                          }))}
                        />
                      )}
                    </View>
                  </>
                )}
              </Section>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <FloatingBack onPress={goBack} top={insets.top + Spacing.sm} />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button
          icon={saved ? 'heart' : 'heart-outline'}
          label={!isLoggedIn ? t('detail.loginToSave') : saved ? t('card.unsave') : t('card.save')}
          variant={saved ? 'secondary' : 'primary'}
          onPress={() => (isLoggedIn ? toggleSaved(housing.id) : router.push('/login'))}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
}

function FloatingBack({ onPress, top }: { onPress: () => void; top: number }) {
  return (
    <PressableScale onPress={onPress} style={[styles.back, { top }]} hitSlop={8}>
      <Ionicons name="chevron-back" size={22} color={Colors.plum} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilac },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  content: { flexGrow: 1 },
  hero: { height: 280, backgroundColor: Colors.lilacDim },
  heroEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  heroEmptyText: { textAlign: 'center' },
  viewToggle: { position: 'absolute', right: Spacing.md, width: 168, ...FloatingShadow },
  back: {
    position: 'absolute',
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Tint.floating,
    borderWidth: 1,
    borderColor: Tint.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...FloatingShadow,
  },
  body: {
    marginTop: -Spacing.xl,
    backgroundColor: Colors.lilac,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: Spacing.lg,
    gap: 3,
  },
  name: { marginTop: Spacing.sm },
  address: { fontSize: 14 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  card: { marginTop: Spacing.lg, gap: Spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  bars: { gap: Spacing.sm, marginTop: Spacing.sm },
  zones: { marginTop: Spacing.lg, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.lilacDim },
  zonesLabel: { marginBottom: Spacing.sm },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Tint.floating,
    borderTopWidth: 1,
    borderTopColor: Tint.border,
  },
  saveButton: { width: '100%' },
});
