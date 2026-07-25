import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, FontFamily, FontSize, MONO } from '@/constants/theme';

type Variant =
  | 'hero'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'label'
  | 'caption'
  | 'eyebrow'
  | 'mono'
  | 'monoLg';

interface TxtProps extends TextProps {
  variant?: Variant;
  color?: keyof typeof Colors;
}

export function Txt({ variant = 'body', color, style, ...rest }: TxtProps) {
  return (
    <Text style={[styles[variant], color ? { color: Colors[color] } : null, style]} {...rest} />
  );
}

const styles = StyleSheet.create({
  hero: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.hero,
    lineHeight: FontSize.hero * 1.25,
    letterSpacing: -0.8,
    color: Colors.plum,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    lineHeight: FontSize.title * 1.28,
    letterSpacing: -0.6,
    color: Colors.plum,
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * 1.35,
    letterSpacing: -0.3,
    color: Colors.plum,
  },
  subheading: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    lineHeight: FontSize.base * 1.4,
    color: Colors.plum,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: FontSize.base * 1.55,
    color: Colors.plum,
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * 1.4,
    color: Colors.slate,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * 1.5,
    color: Colors.slateLight,
  },
  eyebrow: {
    fontFamily: MONO,
    fontSize: FontSize.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.slate,
  },
  mono: { fontFamily: MONO, fontSize: FontSize.sm, color: Colors.plum },
  monoLg: { fontFamily: MONO, fontSize: FontSize.lg, color: Colors.plum },
});
