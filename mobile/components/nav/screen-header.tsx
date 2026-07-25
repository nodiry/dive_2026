import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/press';
import { Txt } from '@/components/ui/txt';
import { Colors, Spacing, Tint } from '@/constants/theme';
import { useDrawer } from '@/contexts/drawer';

export function ScreenHeader({
  title,
  action,
  border,
}: {
  title?: string;
  action?: ReactNode;
  border?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { open } = useDrawer();

  return (
    <View
      style={[styles.header, border && styles.headerBorder, { paddingTop: insets.top + Spacing.sm }]}
    >
      <PressableScale onPress={open} hitSlop={10} style={styles.menuButton}>
        <Ionicons name="menu" size={24} color={Colors.plum} />
      </PressableScale>
      <View style={styles.titleWrap}>
        {title ? (
          <Txt variant="subheading" numberOfLines={1}>
            {title}
          </Txt>
        ) : null}
      </View>
      <View style={styles.action}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.lilac,
  },
  headerBorder: { borderBottomWidth: 1, borderBottomColor: Tint.border },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  titleWrap: { flex: 1 },
  action: { minWidth: 40, alignItems: 'flex-end' },
});
