import type { CategoryWeights } from '@/constants/poi';

export type PersonaKey = 'youngSingle' | 'newlyweds' | 'family' | 'senior';

export interface Persona {
  key: PersonaKey;
  icon: string;
  weights: CategoryWeights;
  radiusMeters: number;
}

export const PERSONAS: Persona[] = [
  {
    key: 'youngSingle',
    icon: 'person-outline',
    weights: { 카페: 1, 편의점: 0.9, 헬스장: 0.8, 치킨: 0.7 },
    radiusMeters: 700,
  },
  {
    key: 'newlyweds',
    icon: 'people-outline',
    weights: { '백반/한정식': 0.9, 카페: 0.8, 약국: 0.7, 편의점: 0.6 },
    radiusMeters: 500,
  },
  {
    key: 'family',
    icon: 'happy-outline',
    weights: { 약국: 1, '백반/한정식': 0.8, 편의점: 0.7 },
    radiusMeters: 500,
  },
  {
    key: 'senior',
    icon: 'walk-outline',
    weights: { 약국: 1, '백반/한정식': 0.7, 편의점: 0.6 },
    radiusMeters: 400,
  },
];
