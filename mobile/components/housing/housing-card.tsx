import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { RankBadge, TypeBadge } from '@/components/ui/data';
import { PressableScale } from '@/components/ui/press';
import { Txt } from '@/components/ui/txt';
import { Colors, FontSize, MONO, Radius, Spacing, Tint } from '@/constants/theme';
import type { HousingSummary } from '@/shared/schemas';
import { formatArea, formatWon } from '@/utils/format';

interface HousingCardProps {
  housing: HousingSummary;
  variant?: 'list' | 'rail';
  dark?: boolean;
  selected?: boolean;
  saved?: boolean;
  rank?: number;
  onPress?: () => void;
  onToggleSave?: () => void;
  children?: ReactNode;
}

export function HousingCard({
  housing,
  variant = 'list',
  dark,
  selected,
  saved,
  rank,
  onPress,
  onToggleSave,
  children,
}: HousingCardProps) {
  const { t } = useTranslation();
  const area = formatArea(housing.minAreaM2, housing.maxAreaM2);
  const meta = [housing.address, area].filter(Boolean).join('  ·  ');
  const noData = t('card.noData');

  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.card,
        variant === 'rail' && styles.rail,
        dark && styles.cardDark,
        selected && (dark ? styles.cardSelectedDark : styles.cardSelected),
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.badges}>
          {rank ? <RankBadge rank={rank} dark={dark} /> : null}
          <TypeBadge label={t(`housingType.${housing.type}`)} dark={dark} />
        </View>
        {onToggleSave ? (
          <PressableScale onPress={onToggleSave} hitSlop={14} haptic>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={20}
              color={
                saved
                  ? dark
                    ? Colors.gold
                    : Colors.violet
                  : dark
                    ? Tint.onDarkText
                    : Colors.slateLight
              }
            />
          </PressableScale>
        ) : null}
      </View>

      <Txt variant="subheading" numberOfLines={1} style={[styles.name, dark && styles.textLilac]}>
        {housing.projectName}
      </Txt>
      <Txt variant="caption" numberOfLines={1} style={dark && { color: Tint.onDarkText }}>
        {meta}
      </Txt>

      <View style={styles.priceRow}>
        <View style={styles.priceCell}>
          <Txt variant="caption" style={dark && { color: Tint.onDarkText }}>
            {t('card.deposit')}
          </Txt>
          <Txt numberOfLines={1} style={[styles.deposit, dark && styles.textLilac]}>
            {formatWon(housing.minDeposit, noData)}
          </Txt>
        </View>
        <View style={styles.priceCell}>
          <Txt variant="caption" style={dark && { color: Tint.onDarkText }}>
            {t('card.rent')}
          </Txt>
          <Txt numberOfLines={1} style={[styles.rent, dark && { color: Tint.onDarkText }]}>
            {formatWon(housing.minRent, noData)}
          </Txt>
        </View>
        {housing.maxRooms != null ? (
          <View style={styles.priceCell}>
            <Txt variant="caption" style={dark && { color: Tint.onDarkText }}>
              {t('card.rooms')}
            </Txt>
            <Txt style={[styles.rent, dark && { color: Tint.onDarkText }]}>{housing.maxRooms}</Txt>
          </View>
        ) : null}
      </View>

      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    padding: Spacing.lg,
    gap: 3,
  },
  rail: { width: 268 },
  cardDark: { backgroundColor: Colors.plumLight, borderColor: Tint.onDark },
  cardSelected: { borderColor: Colors.violet, backgroundColor: Colors.white },
  cardSelectedDark: { borderColor: Colors.violet },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { marginTop: 1 },
  textLilac: { color: Colors.lilac },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md, marginTop: Spacing.md },
  priceCell: { flexShrink: 1, gap: 1 },
  deposit: {
    fontFamily: MONO,
    fontSize: FontSize.lg,
    color: Colors.plum,
    letterSpacing: -0.4,
  },
  rent: { fontFamily: MONO, fontSize: FontSize.sm, color: Colors.slate },
});
