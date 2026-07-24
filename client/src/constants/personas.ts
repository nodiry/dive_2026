import { Baby, PersonStanding, User, Users, type LucideIcon } from 'lucide-react';
import type { CategoryWeights } from '@constants/poi';

export type PersonaKey = 'youngSingle' | 'newlyweds' | 'family' | 'senior';

export interface Persona {
  key: PersonaKey;
  icon: LucideIcon;
  weights: CategoryWeights;
  radiusMeters: number;
}

/**
 * One-tap lifestyle presets. Weights are editorial starting points (users can
 * tweak every slider afterwards), radius reflects how far each group
 * typically walks. Keys intentionally mirror BMC's real supply classes
 * (청년/신혼부부 등, housing_price.segment) — see the pitch framing in
 * docs/REQUIREMENTS.md.
 */
export const PERSONAS: Persona[] = [
  {
    key: 'youngSingle',
    icon: User,
    weights: { cafe: 1, convenienceStore: 0.9, gym: 0.8, food: 0.7 },
    radiusMeters: 700,
  },
  {
    key: 'newlyweds',
    icon: Users,
    weights: { food: 0.9, cafe: 0.8, pharmacy: 0.7, convenienceStore: 0.6 },
    radiusMeters: 500,
  },
  {
    key: 'family',
    icon: Baby,
    weights: { pharmacy: 1, food: 0.8, convenienceStore: 0.7, gasStation: 0.5 },
    radiusMeters: 500,
  },
  {
    key: 'senior',
    icon: PersonStanding,
    weights: { pharmacy: 1, food: 0.7, convenienceStore: 0.6 },
    radiusMeters: 400,
  },
];
