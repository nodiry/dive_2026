import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/press';
import { Txt } from '@/components/ui/txt';
import { Colors, Radius, SheetShadow, Spacing, Spring, Tint } from '@/constants/theme';

export function Grabber({ dark }: { dark?: boolean }) {
  return <View style={[styles.grabber, dark && { backgroundColor: Tint.onDarkStrong }]} />;
}

interface SheetModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  heightRatio?: number;
  footer?: ReactNode;
  children: ReactNode;
}

export function SheetModal({
  visible,
  onClose,
  title,
  heightRatio = 0.88,
  footer,
  children,
}: SheetModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.round(screenHeight * heightRatio);
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(sheetHeight);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withSpring(0, Spring);
    } else if (mounted) {
      translateY.value = withTiming(sheetHeight, { duration: 200 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, mounted, sheetHeight, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > sheetHeight * 0.25 || event.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, Spring);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, translateY.value / sheetHeight),
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.modalSheet, { height: sheetHeight }, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.modalHead}>
              <Grabber />
              {title ? (
                <View style={styles.modalTitleRow}>
                  <Txt variant="heading">{title}</Txt>
                  <PressableScale onPress={onClose} hitSlop={12}>
                    <Ionicons name="close" size={22} color={Colors.slate} />
                  </PressableScale>
                </View>
              ) : null}
            </View>
          </GestureDetector>

          <View style={styles.modalBody}>{children}</View>

          {footer ? (
            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

interface SnapSheetProps {
  snapPoints: number[];
  index: number;
  onIndexChange: (index: number) => void;
  header: ReactNode;
  /** Interactive controls, kept outside the drag handle so taps reach them. */
  headerAction?: ReactNode;
  children: ReactNode;
  dark?: boolean;
  /** Shared with the screen so map controls can ride along with the sheet. */
  offset?: SharedValue<number>;
  /** Snap indexes the header tap cycles through; drag still reaches every point. */
  minTapIndex?: number;
}

export function SnapSheet({
  snapPoints,
  index,
  onIndexChange,
  header,
  headerAction,
  children,
  dark,
  offset,
  minTapIndex = 0,
}: SnapSheetProps) {
  const maxHeight = snapPoints[snapPoints.length - 1];
  const offsets = snapPoints.map((point) => maxHeight - point);
  const internalOffset = useSharedValue(offsets[index] ?? 0);
  const translateY = offset ?? internalOffset;
  const start = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(offsets[index] ?? 0, Spring);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, maxHeight]);

  const settle = (next: number) => {
    if (next !== index) onIndexChange(next);
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      start.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.min(
        Math.max(start.value + event.translationY, 0),
        offsets[0],
      );
    })
    .onEnd((event) => {
      const projected = translateY.value + event.velocityY * 0.1;
      let best = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < offsets.length; i += 1) {
        const distance = Math.abs(offsets[i] - projected);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      }
      translateY.value = withSpring(offsets[best], Spring);
      runOnJS(settle)(best);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(settle)(index >= snapPoints.length - 1 ? minTapIndex : index + 1);
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View
      style={[styles.snapSheet, dark && styles.snapSheetDark, { height: maxHeight }, sheetStyle]}
    >
      <View style={styles.snapHeadWrap}>
        <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
          <View style={styles.snapHead}>
            <Grabber dark={dark} />
            {header}
          </View>
        </GestureDetector>
        {headerAction ? <View style={styles.snapHeadAction}>{headerAction}</View> : null}
      </View>
      <View style={styles.snapBody}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Tint.borderInput,
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: Tint.scrim },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.lilac,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    ...SheetShadow,
  },
  modalHead: { paddingTop: Spacing.md, paddingHorizontal: Spacing.lg },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
  },
  modalBody: { flex: 1, minHeight: 0 },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Tint.border,
  },
  snapSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.lilac,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    ...SheetShadow,
  },
  snapSheetDark: { backgroundColor: Colors.plum },
  snapHeadWrap: { position: 'relative' },
  snapHead: { paddingTop: Spacing.md, paddingHorizontal: Spacing.lg },
  snapHeadAction: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  snapBody: { flex: 1, minHeight: 0 },
});
