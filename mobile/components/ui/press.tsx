import * as Haptics from 'expo-haptics';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}

export function PressableScale({
  style,
  children,
  haptic,
  onPress,
  ...rest
}: PressableScaleProps) {
  return (
    <Pressable
      style={({ pressed }) => [style, pressed && { opacity: 0.6 }]}
      onPress={(event) => {
        if (haptic && Platform.OS !== 'web') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(event);
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
