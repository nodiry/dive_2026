import Ionicons from '@expo/vector-icons/Ionicons';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/press';
import { Txt } from '@/components/ui/txt';
import { Colors, FontFamily, FontSize, Radius, Spacing, Tint } from '@/constants/theme';
import type { AiAction, HousingAlert, NoMatchContext } from '@/shared/schemas';
import { formatWon } from '@/utils/format';

/** The stored criteria, read back as the request the user effectively made. */
export function criteriaChips(criteria: HousingAlert['criteria'], t: TFunction): string[] {
  return [
    criteria.district ?? t('explore.districtAll'),
    criteria.type ? t(`housingType.${criteria.type}`) : null,
    criteria.depositMax != null
      ? t('housingAlerts.criteriaDeposit', { amount: formatWon(criteria.depositMax, '-') })
      : null,
    criteria.builtAfter != null
      ? t('housingAlerts.criteriaBuilt', { year: criteria.builtAfter })
      : null,
    criteria.roomCount != null
      ? t('housingAlerts.criteriaRooms', { count: criteria.roomCount })
      : null,
  ].filter((chip): chip is string => Boolean(chip));
}

function Chips({ labels }: { labels: string[] }) {
  return (
    <View style={styles.chips}>
      {labels.map((label) => (
        <View key={label} style={styles.chip}>
          <Txt style={styles.chipText}>{label}</Txt>
        </View>
      ))}
    </View>
  );
}

/**
 * Offered under an assistant reply whose search found nothing: subscribing
 * records the criteria so BMC sees the unmet demand, and relaxing re-asks the
 * model with looser conditions.
 */
export function AlertActionCard({
  messageId,
  context,
  actions,
  activeAlert,
  subscribing,
  cancelling,
  onSubscribe,
  onCancel,
  onRelax,
}: {
  messageId?: string;
  context: NoMatchContext;
  actions: AiAction[];
  activeAlert?: HousingAlert;
  subscribing: boolean;
  cancelling: boolean;
  onSubscribe: (messageId: string) => void;
  onCancel: (alertId: number) => void;
  onRelax: () => void;
}) {
  const { t } = useTranslation();
  const canSubscribe =
    Boolean(messageId) && actions.some((action) => action.type === 'subscribe_housing_alert');
  const canRelax = actions.some((action) => action.type === 'relax_filters');
  if (!canSubscribe && !canRelax) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Ionicons
            name={activeAlert ? 'checkmark' : 'notifications-outline'}
            size={15}
            color={Colors.white}
          />
        </View>
        <View style={styles.headCopy}>
          <Txt variant="subheading">
            {activeAlert ? t('housingAlerts.subscribed') : t('housingAlerts.cardTitle')}
          </Txt>
          <Txt variant="caption">
            {context.reason === 'district_inventory_empty' && context.criteria.district
              ? t('housingAlerts.districtEmpty', { district: context.criteria.district })
              : t('housingAlerts.criteriaEmpty')}
          </Txt>
        </View>
      </View>

      <Chips labels={criteriaChips(context.criteria, t)} />

      <View style={styles.actions}>
        {activeAlert ? (
          <PressableScale
            haptic
            disabled={cancelling}
            onPress={() => onCancel(activeAlert.id)}
            style={[styles.action, cancelling && styles.disabled]}
          >
            <Ionicons name="trash-outline" size={15} color={Colors.slate} />
            <Txt style={styles.actionText}>{t('housingAlerts.cancel')}</Txt>
          </PressableScale>
        ) : canSubscribe ? (
          <PressableScale
            haptic
            disabled={subscribing}
            onPress={() => messageId && onSubscribe(messageId)}
            style={[styles.action, styles.actionPrimary, subscribing && styles.disabled]}
          >
            <Ionicons name="notifications-outline" size={15} color={Colors.white} />
            <Txt style={[styles.actionText, styles.actionTextPrimary]}>
              {subscribing ? t('housingAlerts.subscribing') : t('housingAlerts.subscribe')}
            </Txt>
          </PressableScale>
        ) : null}

        {canRelax && (
          <PressableScale haptic onPress={onRelax} style={styles.action}>
            <Ionicons name="refresh" size={15} color={Colors.slate} />
            <Txt style={styles.actionText}>{t('housingAlerts.relax')}</Txt>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

/** One subscribed alert on the saved screen. */
export function AlertRow({
  alert,
  cancelling,
  onCancel,
}: {
  alert: HousingAlert;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <Chips labels={criteriaChips(alert.criteria, t)} />
      <View style={styles.rowFoot}>
        <Txt variant="mono" style={styles.date}>
          {new Date(alert.createdAt).toLocaleDateString()}
        </Txt>
        <PressableScale
          haptic
          disabled={cancelling}
          onPress={onCancel}
          accessibilityLabel={t('housingAlerts.cancel')}
          style={[styles.action, cancelling && styles.disabled]}
        >
          <Ionicons name="trash-outline" size={15} color={Colors.slate} />
          <Txt style={styles.actionText}>{t('housingAlerts.cancel')}</Txt>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.borderViolet,
    backgroundColor: Tint.violet,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badge: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headCopy: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderStyle: 'dotted',
    borderColor: Tint.borderInput,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.plum },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.borderInput,
    backgroundColor: Colors.white,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  actionPrimary: { backgroundColor: Colors.violet, borderColor: Colors.violet },
  actionText: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.slate },
  actionTextPrimary: { color: Colors.white },
  disabled: { opacity: 0.5 },
  row: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderStyle: 'dotted',
    borderColor: Tint.borderInput,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  rowFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: FontSize.xs, color: Colors.slateLight },
});
