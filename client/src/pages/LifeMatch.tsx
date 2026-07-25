import type { LifestyleRecommendationRequest, LifestyleRecommendationResult } from '@shared';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Reveal } from '@components/Reveal';
import { LifeMatchResults } from '@features/lifeMatch/LifeMatchResults';
import { LifeProfilePanel } from '@features/lifeMatch/LifeProfilePanel';
import {
  buildLifestylePreferences,
  DEFAULT_LIFE_PROFILE,
  DEFAULT_WEEKLY_ROUTINE,
  DESTINATIONS,
  deriveLifeStats,
  type LifeProfile,
  type WeeklyRoutine,
} from '@features/lifeMatch/model';
import { useLifestyleRecommendation } from '@hooks/useRecommendation';

const STORAGE_KEY = 'dive2026-life-match-v1';

interface StoredLifeMatch {
  version: 1;
  profile: LifeProfile;
  routine: WeeklyRoutine;
}

function readStoredLifeMatch(): Pick<StoredLifeMatch, 'profile' | 'routine'> | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    ) as StoredLifeMatch | null;
    if (parsed?.version !== 1 || !parsed.profile || !parsed.routine) return null;
    return {
      profile: { ...DEFAULT_LIFE_PROFILE, ...parsed.profile },
      routine: { ...DEFAULT_WEEKLY_ROUTINE, ...parsed.routine },
    };
  } catch {
    return null;
  }
}

function optionalNumber(value: string, multiplier = 1): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed * multiplier : undefined;
}

function buildRequest(
  profile: LifeProfile,
  routine: WeeklyRoutine,
): LifestyleRecommendationRequest {
  const stats = deriveLifeStats(routine);
  const destination = DESTINATIONS[profile.destinationId as keyof typeof DESTINATIONS];
  return {
    preferences: buildLifestylePreferences(profile, routine, stats),
    depositMax: optionalNumber(profile.depositMaxManwon, 10000),
    rentMax: optionalNumber(profile.rentMaxManwon, 10000),
    minAreaM2: optionalNumber(profile.minAreaM2),
    minRoomCount: optionalNumber(profile.minRoomCount),
    elevatorRequired: profile.elevatorRequired || undefined,
    parkingRequired: profile.parkingRequired || undefined,
    district: profile.district || undefined,
    type: profile.type || undefined,
    lifeStats: stats,
    routine,
    destinationLat: destination?.lat,
    destinationLng: destination?.lng,
    destinationFrequency: optionalNumber(profile.destinationFrequency),
    radiusMeters: 700,
  };
}

/**
 * One live screen, same philosophy as Explore: no wizard, no submit button.
 * The profile panel on the left mirrors the FilterPanel; the ranked matches
 * on the right recalculate (debounced) on every adjustment.
 */
export function LifeMatch() {
  const { t } = useTranslation();
  const stored = useState(readStoredLifeMatch)[0];
  const [profile, setProfile] = useState<LifeProfile>(
    () => stored?.profile ?? DEFAULT_LIFE_PROFILE,
  );
  const [routine, setRoutine] = useState<WeeklyRoutine>(
    () => stored?.routine ?? { ...DEFAULT_WEEKLY_ROUTINE },
  );
  const [results, setResults] = useState<LifestyleRecommendationResult[]>([]);
  const recommendation = useLifestyleRecommendation();
  const mutateRef = useRef(recommendation.mutate);
  const firstRunRef = useRef(true);
  // Debounced live recalculation can have two requests in flight (slider
  // drags faster than the API answers) — settle order isn't guaranteed, so
  // only the newest request may write results, or a slow stale response
  // would overwrite a fresher ranking.
  const requestSeqRef = useRef(0);

  useEffect(() => {
    mutateRef.current = recommendation.mutate;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, profile, routine }));
    const delay = firstRunRef.current ? 0 : 600;
    firstRunRef.current = false;
    const timer = setTimeout(() => {
      const seq = ++requestSeqRef.current;
      mutateRef.current(buildRequest(profile, routine), {
        onSuccess: (data) => {
          if (seq === requestSeqRef.current) setResults(data);
        },
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [profile, routine]);

  return (
    <div className='px-6 py-10 sm:px-8'>
      <Reveal>
        <p className='font-mono text-sm tracking-wide text-slate uppercase'>
          {t('lifeMatch.navLabel')}
        </p>
        <h1 className='mt-1 text-3xl font-extrabold tracking-tight text-plum'>
          {t('lifeMatch.title')}
        </h1>
        <p className='mt-2 max-w-2xl text-sm text-slate'>{t('lifeMatch.intro')}</p>
        <p className='mt-1 text-xs text-slate-light'>{t('lifeMatch.liveNote')}</p>
      </Reveal>

      <div className='mt-6 grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]'>
        <Reveal delay={0.05}>
          <LifeProfilePanel
            profile={profile}
            routine={routine}
            onProfileChange={setProfile}
            onRoutineChange={setRoutine}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <LifeMatchResults
            results={results}
            profile={profile}
            pending={recommendation.isPending}
            error={recommendation.isError}
            onProfileChange={setProfile}
          />
        </Reveal>
      </div>
    </div>
  );
}
