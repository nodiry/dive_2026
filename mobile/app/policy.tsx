import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HOUSING_QUERY_LIMIT } from '@/components/explore/explore-state';
import { ScreenHeader } from '@/components/nav/screen-header';
import { MeterBar, StatTile } from '@/components/ui/data';
import { Card, EmptyState, Section } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { Colors, FontFamily, FontSize, MONO, Radius, Spacing, Tint } from '@/constants/theme';
import { useDistrictSupply } from '@/hooks/useDistrictDensity';
import { useHousingSearch } from '@/hooks/useHousing';
import type { DistrictSupply, HousingSummary, HousingType } from '@/shared/schemas';

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function builtYear(housing: HousingSummary) {
  const year = Number(housing.builtDate?.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export default function PolicyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const housing = useHousingSearch({ limit: HOUSING_QUERY_LIMIT });
  const supply = useDistrictSupply();

  const metrics = useMemo(() => {
    const rows = housing.data ?? [];
    const byType = rows.reduce<Record<HousingType, number>>(
      (counts, row) => ({ ...counts, [row.type]: counts[row.type] + 1 }),
      { purchased: 0, redevelopment: 0, integrated: 0, happy: 0 },
    );
    return {
      rows,
      byType,
      geocoded: rows.filter((row) => row.lat != null && row.lng != null).length,
      elevatorGap: rows.filter((row) => row.hasElevator !== true).length,
      parkingGap: rows.filter((row) => (row.parkingSpots ?? 0) <= 0).length,
      olderStock: rows.filter((row) => {
        const year = builtYear(row);
        return year != null && year < 2000;
      }).length,
    };
  }, [housing.data]);

  const total = metrics.rows.length;

  if (housing.isPending || housing.isError) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('policy.navLabel')} />
        <View style={styles.padded}>
          <EmptyState
            tone={housing.isError ? 'error' : 'info'}
            message={housing.isError ? t('policy.error') : t('policy.loading')}
          />
        </View>
      </View>
    );
  }

  const readiness: { label: string; count: number; color: string }[] = [
    { label: t('policy.missingLocation'), count: total - metrics.geocoded, color: Colors.violet },
    { label: t('policy.noElevator'), count: metrics.elevatorGap, color: Colors.gold },
    { label: t('policy.noParking'), count: metrics.parkingGap, color: Colors.plumLight },
    { label: t('policy.olderStock'), count: metrics.olderStock, color: Colors.slate },
  ];
  const actions = [t('policy.action1'), t('policy.action2'), t('policy.action3')];

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('policy.navLabel')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Txt variant="title">{t('policy.title')}</Txt>
        <Txt variant="body" color="slate" style={styles.intro}>
          {t('policy.intro')}
        </Txt>
        <View style={styles.note}>
          <Ionicons name="server-outline" size={15} color={Colors.violet} />
          <Txt variant="caption" style={styles.noteText}>
            {t('policy.actualDataNote')}
          </Txt>
        </View>

        <View style={styles.tiles}>
          <StatTile label={t('policy.totalProjects')} value={String(total)} />
          <StatTile
            label={t('policy.geocodedCoverage')}
            value={`${percent(metrics.geocoded, total)}%`}
            accent
          />
          <StatTile label={t('policy.elevatorGap')} value={String(metrics.elevatorGap)} />
          <StatTile label={t('policy.parkingGap')} value={String(metrics.parkingGap)} />
        </View>

        {supply.data && supply.data.length > 0 ? (
          <SupplyGap districts={supply.data} />
        ) : null}

        <Card style={styles.card}>
          <Section label={t('policy.stockByType')}>
            <View style={styles.bars}>
              {(Object.entries(metrics.byType) as [HousingType, number][]).map(([type, count]) => (
                <MeterBar
                  key={type}
                  label={t(`housingType.${type}`)}
                  value={count}
                  max={total}
                  labelWidth={104}
                />
              ))}
            </View>
          </Section>
        </Card>

        <Card style={styles.card}>
          <Section label={t('policy.readinessTitle')}>
            <Txt variant="caption" style={styles.cardIntro}>
              {t('policy.readinessDescription')}
            </Txt>
            <View style={styles.bars}>
              {readiness.map((row) => (
                <MeterBar
                  key={row.label}
                  label={row.label}
                  value={row.count}
                  max={total}
                  color={row.color}
                  labelWidth={128}
                />
              ))}
            </View>
          </Section>
        </Card>

        <Card style={styles.card}>
          <Section label={t('policy.actionTitle')}>
            <View style={styles.actions}>
              {actions.map((action, index) => (
                <View key={action} style={styles.action}>
                  <Txt style={styles.actionIndex}>{`0${index + 1}`}</Txt>
                  <Txt variant="body" color="slate" style={styles.actionText}>
                    {action}
                  </Txt>
                </View>
              ))}
            </View>
          </Section>
        </Card>
      </ScrollView>
    </View>
  );
}

function SupplyGap({ districts }: { districts: DistrictSupply[] }) {
  const { t } = useTranslation();
  const worst = districts.slice(0, 6);
  const worstGap = worst[0]?.underservedResidents ?? 1;
  const zeroSupply = districts.filter(
    (district) => district.units === 0 && district.population >= 10000,
  );

  return (
    <>
      <Card style={styles.card}>
        <Section label={t('policy.gapTitle')}>
          <Txt variant="caption" style={styles.cardIntro}>
            {t('policy.gapDescription')}
          </Txt>
          <View style={styles.bars}>
            {worst.map((district) => (
              <View key={district.emdCode} style={styles.gapRow}>
                <View style={styles.gapHead}>
                  <Txt variant="label" style={{ color: Colors.plum }}>
                    {district.emdName}
                  </Txt>
                  <Txt variant="mono" style={styles.gapValue}>
                    {district.underservedResidents.toLocaleString()}
                  </Txt>
                </View>
                <View style={styles.gapTrack}>
                  <View
                    style={[
                      styles.gapFill,
                      { width: `${Math.round((district.underservedResidents / worstGap) * 100)}%` },
                    ]}
                  />
                </View>
                <Txt variant="caption">
                  {t('policy.gapRow', {
                    population: district.population.toLocaleString(),
                    units: district.units.toLocaleString(),
                  })}
                </Txt>
              </View>
            ))}
          </View>
        </Section>
      </Card>

      <Card style={[styles.card, styles.zeroCard]}>
        <Section label={t('policy.zeroSupplyTitle')}>
          <Txt style={styles.zeroCount}>{zeroSupply.length}</Txt>
          <Txt variant="caption" style={styles.cardIntro}>
            {t('policy.zeroSupplyDescription')}
          </Txt>
          <View style={styles.zeroWrap}>
            {zeroSupply.slice(0, 6).map((district) => (
              <View key={district.emdCode} style={styles.zeroChip}>
                <Txt style={styles.zeroChipText}>{district.emdName}</Txt>
                <Txt style={styles.zeroChipCount}>
                  {`${Math.round(district.population / 1000)}k`}
                </Txt>
              </View>
            ))}
          </View>
        </Section>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lilac },
  padded: { padding: Spacing.lg },
  content: { padding: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.md },
  intro: { fontSize: FontSize.sm },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Tint.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  noteText: { flexShrink: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  card: { gap: Spacing.sm },
  cardIntro: { marginTop: -Spacing.xs, marginBottom: Spacing.sm },
  bars: { gap: Spacing.sm },
  actions: { gap: Spacing.sm },
  action: {
    backgroundColor: Colors.lilac,
    borderRadius: Radius.card,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  actionIndex: { fontFamily: MONO, fontSize: FontSize.xs, color: Colors.violet },
  actionText: { fontSize: FontSize.sm },
  gapRow: { gap: 4 },
  gapHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  gapValue: { fontSize: FontSize.xs, color: Colors.violetDark },
  gapTrack: { height: 6, borderRadius: Radius.full, backgroundColor: Colors.lilacDim },
  gapFill: { height: 6, borderRadius: Radius.full, backgroundColor: Colors.violet },
  zeroCard: { borderColor: Tint.borderViolet, backgroundColor: Tint.violet },
  zeroCount: { fontFamily: MONO, fontSize: 28, color: Colors.violetDark },
  zeroWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  zeroChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.borderViolet,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  zeroChipText: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, color: Colors.violetDark },
  zeroChipCount: { fontFamily: MONO, fontSize: 10, color: Colors.slate },
});
