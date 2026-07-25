import type { LifeDeckResult } from '@/features/life-match/deck-model';
import type { LifeProfile, WeeklyRoutine } from '@/features/life-match/model';

export interface LifeMatchSession {
  profile: LifeProfile;
  routine: WeeklyRoutine;
  discovery: LifeDeckResult;
}

/**
 * Module state rather than storage: expo-router unmounts the screen when you
 * open another tab, and re-dealing the deck on every return would throw away
 * the archetype. It deliberately does not outlive the app process.
 */
let session: LifeMatchSession | null = null;

export function readLifeMatchSession(): LifeMatchSession | null {
  return session;
}

export function writeLifeMatchSession(next: LifeMatchSession): void {
  session = next;
}
