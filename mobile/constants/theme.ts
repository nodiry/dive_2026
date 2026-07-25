import { Platform } from 'react-native';

export const Colors = {
  plum: '#261C3B',
  plumLight: '#38295A',
  lilac: '#F5F3F8',
  lilacDim: '#E9E5F0',
  violet: '#6D4AFF',
  violetDark: '#5636D6',
  gold: '#D9A441',
  slate: '#625C72',
  slateLight: '#948DA6',
  white: '#FFFFFF',
} as const;

export const Tint = {
  border: 'rgba(148, 141, 166, 0.3)',
  borderInput: 'rgba(148, 141, 166, 0.4)',
  borderViolet: 'rgba(109, 74, 255, 0.4)',
  violet: 'rgba(109, 74, 255, 0.1)',
  violetStrong: 'rgba(109, 74, 255, 0.18)',
  gold: 'rgba(217, 164, 65, 0.16)',
  plum: 'rgba(38, 28, 59, 0.1)',
  plumFaint: 'rgba(38, 28, 59, 0.05)',
  scrim: 'rgba(38, 28, 59, 0.55)',
  floating: 'rgba(245, 243, 248, 0.96)',
  onDark: 'rgba(245, 243, 248, 0.14)',
  onDarkText: 'rgba(245, 243, 248, 0.6)',
  onDarkStrong: 'rgba(245, 243, 248, 0.32)',
} as const;

export const Radius = { full: 999, card: 16, sheet: 28 } as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const FontFamily = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const FontSize = { xs: 11, sm: 13, base: 15, lg: 17, xl: 20, title: 26, hero: 32 } as const;

export const FloatingShadow = Platform.select({
  ios: {
    shadowColor: Colors.plum,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  default: { elevation: 6 },
}) as object;

export const SheetShadow = Platform.select({
  ios: {
    shadowColor: Colors.plum,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  default: { elevation: 18 },
}) as object;

export const DrawerShadow = Platform.select({
  ios: {
    shadowColor: Colors.plum,
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  default: { elevation: 20 },
}) as object;

export const Spring = { damping: 22, stiffness: 220, mass: 0.9 } as const;

export const HEAT_SWATCHES = ['#A99BD8', '#8A76C9', '#6D4AFF', '#D9A441', '#C98A1F'] as const;
