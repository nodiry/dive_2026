import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Txt } from '@/components/ui/txt';
import { Colors, Radius, Spacing } from '@/constants/theme';

const THUMB = 20;

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  color?: string;
}

export function Slider({ value, min, max, step = 1, onChange, color = Colors.violet }: SliderProps) {
  const width = useSharedValue(0);
  const progress = useSharedValue((value - min) / (max - min || 1));
  const dragging = useSharedValue(false);
  const latest = useRef(value);

  latest.current = value;

  useEffect(() => {
    if (!dragging.value) progress.value = (value - min) / (max - min || 1);
  }, [value, min, max, dragging, progress]);

  const commit = (ratio: number) => {
    const stepped = Math.round((min + ratio * (max - min)) / step) * step;
    const next = Math.min(max, Math.max(min, stepped));
    if (next !== latest.current) {
      latest.current = next;
      onChange(next);
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      dragging.value = true;
      progress.value = Math.min(1, Math.max(0, event.x / Math.max(width.value, 1)));
      runOnJS(commit)(progress.value);
    })
    .onUpdate((event) => {
      progress.value = Math.min(1, Math.max(0, event.x / Math.max(width.value, 1)));
      runOnJS(commit)(progress.value);
    })
    .onFinalize(() => {
      dragging.value = false;
    });

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({ left: `${progress.value * 100}%` }));

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.hit}
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
        }}
      >
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
        </View>
        <Animated.View style={[styles.thumb, { borderColor: color }, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

export function SliderRow({
  label,
  display,
  dotColor,
  ...slider
}: SliderProps & { label: string; display?: string; dotColor?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <View style={styles.labelWrap}>
          {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
          <Txt variant="label" numberOfLines={1} style={{ color: Colors.plum }}>
            {label}
          </Txt>
        </View>
        <Txt variant="mono" style={styles.value}>
          {display ?? slider.value}
        </Txt>
      </View>
      <Slider {...slider} />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 34, justifyContent: 'center' },
  track: { height: 6, borderRadius: Radius.full, backgroundColor: Colors.lilacDim },
  fill: { height: 6, borderRadius: Radius.full },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    borderRadius: Radius.full,
    borderWidth: 3,
    backgroundColor: Colors.white,
  },
  row: { gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: Radius.full },
  value: { fontSize: 12, color: Colors.slate },
});
