import Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Maps the deck's icon vocabulary onto the icon set this app already ships.
 * Shared by the Life Deck and the AI card game, which draw from the same 27
 * keys so a Gemini-authored deck can never ask for an icon we lack.
 */
const DECK_ICONS: Record<string, IconName> = {
  balance: 'swap-horizontal-outline',
  brunch: 'restaurant-outline',
  car: 'car-outline',
  city: 'business-outline',
  clock: 'time-outline',
  cluster: 'grid-outline',
  coffee: 'cafe-outline',
  coin: 'cash-outline',
  compass: 'compass-outline',
  dining: 'restaurant-outline',
  dumbbell: 'barbell-outline',
  expand: 'expand-outline',
  home: 'home-outline',
  leaf: 'leaf-outline',
  longRoad: 'trail-sign-outline',
  moonTree: 'moon-outline',
  park: 'flower-outline',
  pharmacy: 'medkit-outline',
  quiet: 'volume-mute-outline',
  shopAway: 'storefront-outline',
  smallHome: 'home-outline',
  sofa: 'bed-outline',
  sparkleHome: 'sparkles-outline',
  train: 'train-outline',
  transit: 'bus-outline',
  wallet: 'wallet-outline',
  window: 'square-outline',
};

export function deckIcon(key: string): IconName {
  return DECK_ICONS[key] ?? 'compass-outline';
}
