import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HousingCard } from '@/components/housing/housing-card';
import { HousingMap, type MapHandle } from '@/components/map/housing-map';
import type { MapPin } from '@/components/map/kakao-map-html';
import { PressableScale } from '@/components/ui/press';
import { Txt } from '@/components/ui/txt';
import {
  Colors,
  FloatingShadow,
  FontFamily,
  FontSize,
  MONO,
  Radius,
  Spacing,
  Tint,
} from '@/constants/theme';
import { useSavedHousing } from '@/hooks/useSaved';
import type { HousingSummary } from '@/shared/schemas';
import { formatWon } from '@/utils/format';

function toPins(housing: HousingSummary[], noData: string): MapPin[] {
  return housing
    .filter((item) => item.lat != null && item.lng != null)
    .map((item) => ({
      id: item.id,
      lat: item.lat as number,
      lng: item.lng as number,
      priceLabel: formatWon(item.minDeposit, noData),
      label: item.projectName,
    }));
}

function useMapSelection(housing: HousingSummary[]) {
  const mapRef = useRef<MapHandle>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const select = (id: number) => {
    setSelectedId(id);
    const target = housing.find((item) => item.id === id);
    if (target?.lat != null && target?.lng != null) {
      mapRef.current?.moveTo({ lat: target.lat, lng: target.lng }, 4);
    }
  };

  return { mapRef, selectedId, select };
}

export function MapResultCard({
  housing,
  onExpand,
  flush,
}: {
  housing: HousingSummary[];
  onExpand: () => void;
  /** Sits inside a message bubble: square top edge, rounded only at the bottom. */
  flush?: boolean;
}) {
  const { t } = useTranslation();
  const { mapRef, selectedId, select } = useMapSelection(housing);
  const pins = toPins(housing, t('card.noData'));

  if (pins.length === 0) return null;

  return (
    <View style={[styles.card, flush && styles.cardFlush]}>
      <HousingMap
        ref={mapRef}
        fitOnLoad
        center={{ lat: pins[0].lat, lng: pins[0].lng }}
        style={StyleSheet.absoluteFill}
        state={{ pins, selectedId }}
        onMarkerPress={select}
      />

      <PressableScale onPress={onExpand} style={styles.expand}>
        <Ionicons name="expand-outline" size={14} color={Colors.plum} />
        <Txt style={styles.expandLabel}>{t('ai.expandMap')}</Txt>
      </PressableScale>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        style={styles.pillScroll}
      >
        {housing.map((item) => {
          const active = item.id === selectedId;
          return (
            <PressableScale
              key={item.id}
              onPress={() => select(item.id)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Txt numberOfLines={1} style={[styles.pillName, active && styles.pillTextActive]}>
                {item.projectName}
              </Txt>
              <Txt numberOfLines={1} style={[styles.pillPrice, active && styles.pillTextActive]}>
                {formatWon(item.minDeposit, t('card.noData'))}
              </Txt>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function FullscreenMap({
  housing,
  onClose,
}: {
  housing: HousingSummary[] | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSaved, toggleSaved, isLoggedIn } = useSavedHousing();
  const list = housing ?? [];
  const { mapRef, selectedId, select } = useMapSelection(list);
  const pins = toPins(list, t('card.noData'));

  if (!housing) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fullscreen}>
        <HousingMap
          ref={mapRef}
          fitOnLoad
          center={pins.length > 0 ? { lat: pins[0].lat, lng: pins[0].lng } : undefined}
          style={StyleSheet.absoluteFill}
          state={{ pins, selectedId }}
          onMarkerPress={select}
        />

        <PressableScale
          onPress={onClose}
          style={[styles.close, { top: insets.top + Spacing.md }]}
        >
          <Ionicons name="close" size={16} color={Colors.plum} />
          <Txt style={styles.expandLabel}>{t('ai.closeMap')}</Txt>
        </PressableScale>

        <FlatList
          horizontal
          data={list}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          style={[styles.rail, { bottom: insets.bottom + Spacing.lg }]}
          contentContainerStyle={styles.railContent}
          renderItem={({ item }) => (
            <HousingCard
              housing={item}
              variant="rail"
              selected={item.id === selectedId}
              saved={isSaved(item.id)}
              onPress={() => {
                if (item.id !== selectedId) {
                  select(item.id);
                  return;
                }
                // A pushed route renders behind an open Modal, so the modal has
                // to come down before navigating or the tap looks ignored.
                onClose();
                router.push(`/housing/${item.id}`);
              }}
              onToggleSave={
                isLoggedIn
                  ? () => toggleSaved(item.id)
                  : () => {
                      onClose();
                      router.push('/login');
                    }
              }
            />
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 240,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    backgroundColor: Colors.lilacDim,
    overflow: 'hidden',
  },
  cardFlush: {
    borderWidth: 0,
    borderTopWidth: 1,
    borderRadius: 0,
    borderBottomLeftRadius: Radius.card - 1,
    borderBottomRightRadius: Radius.card - 1,
  },
  expand: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Tint.floating,
    borderWidth: 1,
    borderColor: Tint.border,
    ...FloatingShadow,
  },
  expandLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, color: Colors.plum },
  pillScroll: { position: 'absolute', left: 0, right: 0, bottom: Spacing.sm, maxHeight: 44 },
  pillRow: { gap: Spacing.sm, paddingHorizontal: Spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 200,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Tint.floating,
    borderWidth: 1,
    borderColor: Tint.border,
    ...FloatingShadow,
  },
  pillActive: { backgroundColor: Colors.violet, borderColor: Colors.violet },
  pillName: {
    flexShrink: 1,
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.plum,
  },
  pillPrice: { flexShrink: 0, fontFamily: MONO, fontSize: 10, color: Colors.slate },
  pillTextActive: { color: Colors.white },
  fullscreen: { flex: 1, backgroundColor: Colors.lilacDim },
  close: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Tint.floating,
    borderWidth: 1,
    borderColor: Tint.border,
    ...FloatingShadow,
  },
  rail: { position: 'absolute', left: 0, right: 0, flexGrow: 0 },
  railContent: { gap: Spacing.md, paddingHorizontal: Spacing.lg },
});
