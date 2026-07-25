import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Segmented } from '@/components/ui/controls';
import { PressableScale } from '@/components/ui/press';
import { MeterBar, RankBadge, TagStrip } from '@/components/ui/data';
import { SheetModal } from '@/components/ui/sheet';
import { Card } from '@/components/ui/surfaces';
import { Txt } from '@/components/ui/txt';
import { Colors, FontSize, MONO, Radius, Spacing, Tint } from '@/constants/theme';
import type { LifestyleRecommendationResult } from '@/shared/schemas';
import { formatMeters, formatWon } from '@/utils/format';

type BreakdownKey = keyof LifestyleRecommendationResult['breakdown'];

function useBreakdown(result: LifestyleRecommendationResult) {
  const { t } = useTranslation();
  const labels: Record<BreakdownKey, string> = {
    lifestyle: t('lifeMatch.lifestyle'),
    routine: t('lifeMatch.routine'),
    housing: t('lifeMatch.housing'),
    affordability: t('lifeMatch.affordability'),
  };
  return (Object.entries(result.breakdown) as [BreakdownKey, number][]).map(([key, value]) => ({
    key,
    label: labels[key],
    value,
  }));
}

export function MatchCard({
  result,
  rank,
  best,
  selected,
  onSelect,
}: {
  result: LifestyleRecommendationResult;
  rank: number;
  best: number;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const entries = useBreakdown(result);
  const strongest = entries.reduce((a, b) => (b.value > a.value ? b : a));
  const weakest = entries.reduce((a, b) => (b.value < a.value ? b : a));
  const axes = [
    { label: t('lifeMatch.fun'), value: result.lifeAxes.fun, color: Colors.violet },
    { label: t('lifeMatch.work'), value: result.lifeAxes.work, color: Colors.plum },
    { label: t('lifeMatch.rest'), value: result.lifeAxes.rest, color: Colors.gold },
  ];
  const ratio = best > 0 ? Math.min(1, result.matchRate / best) : 0;

  return (
    <>
      <Card style={[styles.card, selected && styles.cardSelected]}>
        <PressableScale onPress={onSelect} disabled={!onSelect}>
          <View style={styles.head}>
            <RankBadge rank={rank} />
            <Txt variant="subheading" numberOfLines={1} style={styles.name}>
              {result.housing.projectName}
            </Txt>
            <Txt style={styles.match}>{Math.round(result.matchRate)}%</Txt>
          </View>
          <Txt variant="caption" numberOfLines={1}>
            {result.housing.address}
          </Txt>
        </PressableScale>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
        </View>

        <Txt variant="mono" style={styles.price}>
          {`${formatWon(result.housing.minDeposit, t('card.noData'))} · ${formatWon(
            result.housing.minRent,
            t('card.noData'),
          )}`}
        </Txt>

        <View style={styles.axes}>
          {axes.map((axis) => (
            <View key={axis.label} style={styles.axis}>
              <View style={styles.axisHead}>
                <Txt variant="mono" style={styles.axisLabel}>
                  {axis.label}
                </Txt>
                <Txt variant="mono" style={styles.axisValue}>
                  {Math.round(axis.value)}
                </Txt>
              </View>
              <View style={styles.axisTrack}>
                <View
                  style={[styles.axisFill, { width: `${axis.value}%`, backgroundColor: axis.color }]}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.notes}>
          <View style={styles.noteRow}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.violetDark} />
            <Txt variant="caption" style={{ color: Colors.violetDark }}>
              {`${t('lifeMatch.strength')} · ${strongest.label} ${Math.round(strongest.value)}`}
            </Txt>
          </View>
          <View style={styles.noteRow}>
            <Ionicons name="alert-circle" size={14} color={Colors.gold} />
            <Txt variant="caption" style={{ color: Colors.slate }}>
              {`${t('lifeMatch.caution')} · ${weakest.label} ${Math.round(weakest.value)}`}
            </Txt>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label={t('lifeMatch.openDetail')}
            variant="secondary"
            onPress={() => setOpen(true)}
            style={styles.action}
          />
          <Button
            label={t('explore.detailLink')}
            variant="secondary"
            onPress={() => router.push(`/housing/${result.housing.id}`)}
            style={styles.action}
          />
        </View>
      </Card>

      <ResumeSheet visible={open} onClose={() => setOpen(false)} result={result} />
    </>
  );
}

type Tab = 'resume' | 'week' | 'data';

function ResumeSheet({
  visible,
  onClose,
  result,
}: {
  visible: boolean;
  onClose: () => void;
  result: LifestyleRecommendationResult;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('resume');
  const housing = result.housing;
  const noData = t('card.noData');

  const rows: [string, string][] = [
    [t('detail.deposit'), formatWon(housing.minDeposit, noData)],
    [t('detail.rent'), formatWon(housing.minRent, noData)],
    [t('detail.builtDate'), housing.builtDate ?? noData],
    [
      t('detail.area'),
      housing.maxAreaM2 != null ? t('units.area', { value: housing.maxAreaM2 }) : noData,
    ],
    [t('detail.rooms'), housing.maxRooms != null ? String(housing.maxRooms) : noData],
    [
      t('detail.elevator'),
      housing.hasElevator == null ? noData : housing.hasElevator ? t('detail.yes') : t('detail.no'),
    ],
    [t('detail.parking'), housing.parkingSpots != null ? String(housing.parkingSpots) : noData],
  ];

  const zones: [string, number | null][] = [
    [t('lifeMatch.residentialArea'), result.neighborhood.residentialRatio],
    [t('lifeMatch.commercialArea'), result.neighborhood.commercialRatio],
    [t('lifeMatch.greenArea'), result.neighborhood.greenRatio],
  ];

  return (
    <SheetModal visible={visible} onClose={onClose} title={housing.projectName} heightRatio={0.84}>
      <View style={styles.sheetTabs}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'resume', label: t('lifeMatch.houseResume') },
            { value: 'week', label: t('lifeMatch.weekAtHome') },
            { value: 'data', label: t('lifeMatch.dataBasis') },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
        {tab === 'resume' ? (
          <View style={styles.grid}>
            {rows.map(([label, value]) => (
              <View key={label} style={styles.gridCell}>
                <Txt variant="caption">{label}</Txt>
                <Txt variant="mono" style={styles.gridValue}>
                  {value}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'week' ? (
          <View style={styles.weekList}>
            {result.routineDetails.map((detail) => (
              <View key={detail.activity} style={styles.weekRow}>
                <View style={styles.weekHead}>
                  <Txt variant="label" style={{ color: Colors.plum }}>
                    {t(`lifeMatch.activities.${detail.activity}`)}
                  </Txt>
                  <Txt variant="mono" style={styles.weekScore}>
                    {`${Math.round(detail.score)} / 100`}
                  </Txt>
                </View>
                <View style={styles.axisTrack}>
                  <View
                    style={[
                      styles.axisFill,
                      { width: `${detail.score}%`, backgroundColor: Colors.violet },
                    ]}
                  />
                </View>
                <Txt variant="caption">
                  {`${t('lifeMatch.perWeek', { value: detail.requested })} · ${t(
                    `lifeMatch.evidenceLabels.${detail.evidence}`,
                  )}`}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'data' ? (
          <View style={styles.dataList}>
            <View style={styles.grid}>
              {zones.map(([label, value]) => (
                <View key={label} style={styles.gridCell}>
                  <Txt variant="caption">{label}</Txt>
                  <Txt variant="mono" style={styles.gridValue}>
                    {value == null ? '-' : `${Math.round(value * 100)}%`}
                  </Txt>
                </View>
              ))}
            </View>

            {result.destinationDistanceMeters != null ? (
              <View style={styles.dataNote}>
                <Ionicons name="navigate-outline" size={15} color={Colors.violet} />
                <Txt variant="caption" style={styles.dataNoteText}>
                  {`${formatMeters(result.destinationDistanceMeters)} · ${t('lifeMatch.straightLineNote')}`}
                </Txt>
              </View>
            ) : null}

            <TagStrip
              tags={result.matches.map((match) => ({
                label: match.categoryName,
                sublabel:
                  match.count > 0
                    ? t('units.matchCount', {
                        value: match.count,
                        meters: Math.round(match.nearestMeters ?? 0),
                      })
                    : t('units.matchNone'),
                muted: match.count === 0,
              }))}
            />

            {result.neighborhood.source === 'unavailable' ? (
              <Txt variant="caption">{t('lifeMatch.zoningUnavailable')}</Txt>
            ) : null}
            <Txt variant="caption">{t('lifeMatch.demoWeightNote')}</Txt>
          </View>
        ) : null}
      </ScrollView>
    </SheetModal>
  );
}

export function MatchSummaryBar({
  count,
  top,
  pending,
}: {
  count: number;
  top: number;
  pending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.summary}>
      <MeterBar label={t('lifeMatch.matchLabel')} value={top} max={100} labelWidth={54} suffix={`${Math.round(top)}%`} />
      <Txt variant="caption">
        {pending
          ? t('lifeMatch.recalculating')
          : t('lifeMatch.candidateSummary', { value: count, top: Math.round(top) })}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 3 },
  cardSelected: { borderColor: Colors.violet },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { flex: 1 },
  match: { fontFamily: MONO, fontSize: FontSize.lg, color: Colors.violetDark },
  track: {
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.lilacDim,
    marginTop: Spacing.sm,
  },
  fill: { height: 4, borderRadius: Radius.full, backgroundColor: Colors.violet },
  price: { marginTop: Spacing.sm, fontSize: FontSize.sm },
  axes: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  axis: { flex: 1, gap: 4 },
  axisHead: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontSize: 10, color: Colors.slate },
  axisValue: { fontSize: 10, color: Colors.plum },
  axisTrack: { height: 4, borderRadius: Radius.full, backgroundColor: Colors.lilacDim },
  axisFill: { height: 4, borderRadius: Radius.full },
  notes: { marginTop: Spacing.md, gap: 4 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  action: { flex: 1 },
  sheetTabs: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sheetBody: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCell: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    padding: Spacing.md,
    gap: 2,
  },
  gridValue: { fontSize: FontSize.sm },
  weekList: { gap: Spacing.md },
  weekRow: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    padding: Spacing.md,
    gap: 6,
  },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekScore: { fontSize: FontSize.xs, color: Colors.violetDark },
  dataList: { gap: Spacing.lg },
  dataNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    padding: Spacing.md,
  },
  dataNoteText: { flex: 1 },
  summary: { gap: 6 },
});
