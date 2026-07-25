import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { PressableScale } from '@/components/ui/press';
import { Txt } from '@/components/ui/txt';
import { Colors, FontFamily, FontSize, MONO, Radius, Spacing, Tint } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tone =
    variant === 'primary' ? Colors.white : variant === 'ghost' ? Colors.violetDark : Colors.plum;
  return (
    <PressableScale
      haptic
      onPress={disabled || loading ? undefined : onPress}
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={tone} /> : null}
          <Txt style={[styles.buttonLabel, { color: tone }]}>{label}</Txt>
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({
  icon,
  onPress,
  size = 20,
  color = Colors.plum,
  floating,
  active,
  label,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  floating?: boolean;
  active?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.iconButton, floating && styles.iconButtonFloating, active && styles.iconButtonActive, style]}
    >
      <Ionicons name={icon} size={size} color={active ? Colors.lilac : color} />
    </PressableScale>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  iconColor,
  tone = 'outline',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  iconColor?: string;
  tone?: 'outline' | 'solid' | 'dashed';
}) {
  const selectedColor = tone === 'solid' ? Colors.lilac : Colors.violetDark;
  const restColor = tone === 'solid' ? Colors.plum : Colors.slate;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        tone === 'dashed' && styles.chipDashed,
        selected
          ? tone === 'solid'
            ? styles.chipSolidOn
            : styles.chipOn
          : tone === 'solid'
            ? styles.chipSolidOff
            : styles.chipOff,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={selected ? selectedColor : (iconColor ?? restColor)}
        />
      ) : null}
      <Txt style={[styles.chipLabel, { color: selected ? selectedColor : restColor }]}>{label}</Txt>
    </PressableScale>
  );
}

export const Input = forwardRef<TextInput, TextInputProps>(function Input({ style, ...rest }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={Colors.slateLight}
      style={[styles.input, style]}
      {...rest}
    />
  );
});

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Txt style={[styles.segmentLabel, active && { color: Colors.lilac }]} numberOfLines={1}>
              {option.label}
            </Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function Stepper({
  label,
  value,
  min = 0,
  max = 7,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  return (
    <View style={styles.stepperRow}>
      <Txt style={styles.stepperLabel} numberOfLines={1}>
        {label}
      </Txt>
      <View style={styles.stepperControls}>
        <PressableScale onPress={() => step(-1)} hitSlop={6} style={styles.stepperButton}>
          <Ionicons name="remove" size={15} color={value <= min ? Colors.slateLight : Colors.plum} />
        </PressableScale>
        <Txt variant="mono" style={styles.stepperValue}>
          {value}
        </Txt>
        <PressableScale onPress={() => step(1)} hitSlop={6} style={styles.stepperButton}>
          <Ionicons name="add" size={15} color={value >= max ? Colors.slateLight : Colors.plum} />
        </PressableScale>
      </View>
    </View>
  );
}

export function NumberField({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Txt variant="label">{label}</Txt>
      <Input
        value={value}
        onChangeText={(next) => onChangeText(next.replace(/[^0-9]/g, ''))}
        placeholder={placeholder}
        keyboardType="number-pad"
        returnKeyType="done"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.mono, focused && { borderColor: Tint.borderViolet }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: 20,
    minHeight: 46,
  },
  buttonPrimary: { backgroundColor: Colors.violet },
  buttonSecondary: { borderWidth: 1, borderColor: Tint.borderInput, backgroundColor: Colors.white },
  buttonLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.base },
  disabled: { opacity: 0.4 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonFloating: {
    backgroundColor: Tint.floating,
    borderWidth: 1,
    borderColor: Tint.border,
  },
  iconButtonActive: { backgroundColor: Colors.plum, borderColor: Colors.plum },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipDashed: { borderStyle: 'dashed' },
  chipOff: { backgroundColor: Colors.white, borderColor: Tint.borderInput },
  chipOn: { backgroundColor: Tint.violet, borderColor: Tint.borderViolet },
  chipSolidOff: { backgroundColor: Tint.plumFaint, borderColor: 'transparent' },
  chipSolidOn: { backgroundColor: Colors.plum, borderColor: Colors.plum },
  chipLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm },
  input: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.borderInput,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 11,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.plum,
  },
  mono: { fontFamily: MONO, fontSize: FontSize.base },
  field: { flex: 1, gap: 6 },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.lilacDim,
    padding: 3,
  },
  segment: {
    flex: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: Colors.plum },
  segmentLabel: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, color: Colors.slate },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 5 },
  stepperLabel: {
    flex: 1,
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.plum,
  },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Tint.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  stepperValue: { width: 18, textAlign: 'center', fontSize: FontSize.sm },
});
