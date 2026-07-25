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
 * tweak every slider afterwards, or drop/add categories from the full
 * picker), radius reflects how far each group typically walks. Keys
 * intentionally mirror BMC's real supply classes (청년/신혼부부 등,
 * housing_price.segment) — see the pitch framing in docs/REQUIREMENTS.md.
 *
 * Weights are keyed by real category_name (matching the full picker, not
 * just the 6 curated icon keys) — e.g. '치킨' stands in for "food" here.
 * 주유소 (gas station) is deliberately never used as a preset weight: the
 * seeded commercial_poi data has zero rows for it, so it would always
 * silently match nothing.
 */
export const PERSONAS: Persona[] = [
  {
    key: 'youngSingle',
    icon: User,
    weights: { 카페: 1, 편의점: 0.9, 헬스장: 0.8, 치킨: 0.7 },
    radiusMeters: 700,
  },
  {
    key: 'newlyweds',
    icon: Users,
    weights: { '백반/한정식': 0.9, 카페: 0.8, 약국: 0.7, 편의점: 0.6 },
    radiusMeters: 500,
  },
  {
    key: 'family',
    icon: Baby,
    weights: { 약국: 1, '백반/한정식': 0.8, 편의점: 0.7 },
    radiusMeters: 500,
  },
  {
    key: 'senior',
    icon: PersonStanding,
    weights: { 약국: 1, '백반/한정식': 0.7, 편의점: 0.6 },
    radiusMeters: 400,
  },
];
