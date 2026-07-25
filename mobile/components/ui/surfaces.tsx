import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Txt } from '@/components/ui/txt';
import { Colors, Radius, Spacing, Tint } from '@/constants/theme';

export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

export function Section({
  label,
  action,
  children,
  style,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
  style?: ViewProps['style'];
}) {
  return (
    <View style={style}>
      <View style={styles.sectionHead}>
        <Txt variant="eyebrow">{label}</Txt>
        {action}
      </View>
      {children}
    </View>
  );
}

export function EmptyState({
  message,
  action,
  tone = 'info',
}: {
  message: string;
  action?: ReactNode;
  tone?: 'info' | 'error';
}) {
  return (
    <View style={[styles.empty, tone === 'error' && styles.emptyError]}>
      <Txt
        variant="body"
        style={[styles.emptyText, tone === 'error' && { color: Colors.violetDark }]}
      >
        {message}
      </Txt>
      {action}
    </View>
  );
}

export function Divider({ inset }: { inset?: boolean }) {
  return <View style={[styles.divider, inset && { marginLeft: Spacing.lg }]} />;
}

export function Skeleton({ height, style }: { height: number; style?: ViewProps['style'] }) {
  return <View style={[styles.skeleton, { height }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    padding: Spacing.lg,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  empty: {
    borderRadius: Radius.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Tint.borderInput,
    backgroundColor: Colors.lilacDim,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyError: { borderColor: Tint.borderViolet },
  emptyText: { textAlign: 'center', fontSize: 13, color: Colors.slate },
  divider: { height: 1, backgroundColor: Tint.border },
  skeleton: {
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Tint.border,
    backgroundColor: Colors.white,
    opacity: 0.7,
  },
});
