import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/txt';
import { Colors, FontFamily, FontSize, MONO, Radius, Spacing, Tint } from '@/constants/theme';

export function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.tile}>
      <Txt variant="caption">{label}</Txt>
      <Txt
        variant="mono"
        numberOfLines={1}
        style={[styles.tileValue, accent && { color: Colors.violetDark }]}
      >
        {value}
      </Txt>
    </View>
  );
}

export function MeterBar({
  label,
  value,
  max,
  color = Colors.violet,
  labelWidth = 96,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  labelWidth?: number;
  suffix?: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(value / max, 0.04)) : 0;
  return (
    <View style={styles.meterRow}>
      <Txt variant="caption" numberOfLines={1} style={{ width: labelWidth, color: Colors.plum }}>
        {label}
      </Txt>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]} />
      </View>
      <Txt variant="mono" style={styles.meterValue}>
        {suffix ?? value}
      </Txt>
    </View>
  );
}

export function ScoreBar({ score, best }: { score: number; best: number }) {
  const ratio = best > 0 ? Math.min(1, Math.max(score / best, 0.04)) : 0;
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
      <Txt variant="mono" style={styles.scoreValue}>
        {score.toFixed(1)}
      </Txt>
    </View>
  );
}

export function RankBadge({ rank, dark }: { rank: number; dark?: boolean }) {
  const isFirst = rank === 1;
  return (
    <View
      style={[
        styles.rank,
        { backgroundColor: isFirst ? Colors.gold : dark ? Tint.onDarkStrong : Colors.plum },
      ]}
    >
      <Txt style={[styles.rankText, isFirst && { color: Colors.plum }]}>{rank}</Txt>
    </View>
  );
}

export interface TagItem {
  label: string;
  sublabel?: string;
  muted?: boolean;
}

export function TagStrip({ tags, dark }: { tags: TagItem[]; dark?: boolean }) {
  return (
    <View style={styles.tagWrap}>
      {tags.map((tag, index) => (
        <View
          key={`${tag.label}-${index}`}
          style={[
            styles.tag,
            tag.muted
              ? dark
                ? styles.tagMutedDark
                : styles.tagMuted
              : dark
                ? styles.tagActiveDark
                : styles.tagActive,
          ]}
        >
          <Txt
            style={[
              styles.tagLabel,
              { color: tag.muted ? (dark ? Tint.onDarkText : Colors.slate) : dark ? Colors.lilac : Colors.violetDark },
            ]}
          >
            {tag.label}
          </Txt>
          {tag.sublabel ? (
            <Txt
              style={[
                styles.tagSublabel,
                { color: tag.muted ? (dark ? Tint.onDarkText : Colors.slate) : dark ? Colors.lilac : Colors.violetDark },
              ]}
            >
              {tag.sublabel}
            </Txt>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function TypeBadge({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <View style={[styles.typeBadge, dark && { backgroundColor: Tint.onDark }]}>
      <Txt style={[styles.typeBadgeText, dark && { color: Colors.lilac }]}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    padding: Spacing.md,
    gap: 3,
  },
  tileValue: { fontSize: FontSize.base },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  track: { flex: 1, height: 6, borderRadius: Radius.full, backgroundColor: Colors.lilacDim },
  fill: { height: 6, borderRadius: Radius.full },
  meterValue: { width: 40, textAlign: 'right', fontSize: FontSize.xs, color: Colors.slate },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  scoreTrack: { flex: 1, height: 4, borderRadius: Radius.full, backgroundColor: Colors.lilacDim },
  scoreFill: { height: 4, borderRadius: Radius.full, backgroundColor: Colors.violet },
  scoreValue: { fontSize: FontSize.xs, color: Colors.slate },
  rank: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontFamily: MONO, fontSize: FontSize.xs, color: Colors.lilac },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagActive: { backgroundColor: Tint.violet, borderColor: Tint.borderViolet },
  tagActiveDark: { backgroundColor: Tint.violetStrong, borderColor: Tint.borderViolet },
  tagMuted: { backgroundColor: Colors.white, borderColor: Tint.border },
  tagMutedDark: { backgroundColor: 'transparent', borderColor: Tint.onDark },
  tagLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs },
  tagSublabel: { fontFamily: MONO, fontSize: 10, opacity: 0.75 },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Tint.plum,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeBadgeText: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, color: Colors.plum },
});
