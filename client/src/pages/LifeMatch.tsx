import type { LifestyleRecommendationRequest, LifestyleRecommendationResult } from '@shared';
import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils/cn';
import { Reveal } from '@components/Reveal';
import { LifeDeck, LifeDeckSummary } from '@features/lifeMatch/LifeDeck';
import { LifeMatchResults } from '@features/lifeMatch/LifeMatchResults';
import { LifeProfilePanel } from '@features/lifeMatch/LifeProfilePanel';
import { ReportSection, ReportSpine } from '@features/lifeMatch/ReportSection';
import type { LifeDeckResult } from '@features/lifeMatch/lifeDeckModel';
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
  version: 1 | 2;
  profile: LifeProfile;
  routine: WeeklyRoutine;
  discovery?: LifeDeckResult;
}

function readStoredLifeMatch(): StoredLifeMatch | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    ) as StoredLifeMatch | null;
    if ((parsed?.version !== 1 && parsed?.version !== 2) || !parsed.profile || !parsed.routine) {
      return null;
    }
    return {
      version: parsed.version,
      profile: { ...DEFAULT_LIFE_PROFILE, ...parsed.profile },
      routine: { ...DEFAULT_WEEKLY_ROUTINE, ...parsed.routine },
      discovery: parsed.discovery,
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
  lifeStats?: LifeDeckResult['lifeStats'],
): LifestyleRecommendationRequest {
  const stats = lifeStats ?? deriveLifeStats(routine);
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
 * The Life Deck discovers a starting routine, then hands it to the existing
 * live recommendation screen. Detailed adjustments recalculate the ranked
 * matches with the same debounced behavior as Explore.
 */
export function LifeMatch() {
  const { t } = useTranslation();
  const stored = useState(readStoredLifeMatch)[0];
  const [stage, setStage] = useState<'deck' | 'results'>(() =>
    stored?.discovery ? 'results' : 'deck',
  );
  const [profile, setProfile] = useState<LifeProfile>(
    () => stored?.profile ?? DEFAULT_LIFE_PROFILE,
  );
  const [routine, setRoutine] = useState<WeeklyRoutine>(
    () => stored?.routine ?? { ...DEFAULT_WEEKLY_ROUTINE },
  );
  const [discovery, setDiscovery] = useState<LifeDeckResult | null>(
    () => stored?.discovery ?? null,
  );
  const [results, setResults] = useState<LifestyleRecommendationResult[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
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
    if (stage !== 'results') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, profile, routine, discovery }));
    const delay = firstRunRef.current ? 0 : 600;
    firstRunRef.current = false;
    const timer = setTimeout(() => {
      const seq = ++requestSeqRef.current;
      mutateRef.current(buildRequest(profile, routine, discovery?.lifeStats), {
        onSuccess: (data) => {
          if (seq === requestSeqRef.current) setResults(data);
        },
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [discovery, profile, routine, stage]);

  if (stage === 'deck') {
    return (
      <LifeDeck
        initialProfile={profile}
        onComplete={(nextDiscovery, nextProfile) => {
          requestSeqRef.current += 1;
          recommendation.reset();
          setResults([]);
          setDiscovery(nextDiscovery);
          setProfile(nextProfile);
          setRoutine(nextDiscovery.routine);
          firstRunRef.current = true;
          setStage('results');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  const updateRoutine = (nextRoutine: WeeklyRoutine) => {
    setRoutine(nextRoutine);
    setDiscovery((current) =>
      current
        ? {
            ...current,
            routine: nextRoutine,
            lifeStats: deriveLifeStats(nextRoutine),
          }
        : current,
    );
  };

  return (
    /*
      One reading, top to bottom: what the cards decided, the week they
      inferred, the homes that answer it, and only then the controls. The
      previous two-column layout opened on a wall of sliders and left the
      matches competing with them for attention. Container matches About's
      measure exactly (padding inside the same capped element, not outside it)
      so the two report-shaped pages line up.

      w-full is load-bearing: PageShell's <main> is a column flex container, and
      auto cross-axis margins beat the default stretch, so without it the column
      is shrink-to-fit and visibly widens as the matches arrive.
    */
    <div className='mx-auto w-full max-w-3xl px-6 py-16'>
      <Reveal>
        <p className='font-mono text-sm tracking-wide text-slate uppercase'>
          {t('lifeMatch.navLabel')}
        </p>
        <h1 className='mt-1 text-3xl font-extrabold tracking-tight text-plum'>
          {t('lifeMatch.title')}
        </h1>
        <p className='mt-2 text-sm text-slate'>{t('lifeMatch.intro')}</p>
        <p className='mt-1 text-xs text-slate-light'>{t('lifeMatch.liveNote')}</p>
      </Reveal>

      <div className='mt-8'>
        <ReportSpine>
          {discovery && (
            <ReportSection
              eyebrow={t('lifeMatch.reportArcana')}
              tone='arcana'
            >
              <LifeDeckSummary
                result={discovery}
                onRetake={() => {
                  requestSeqRef.current += 1;
                  recommendation.reset();
                  setResults([]);
                  setStage('deck');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </ReportSection>
          )}

          <LifeMatchResults
            results={results}
            profile={profile}
            routine={routine}
            pending={recommendation.isPending}
            error={recommendation.isError}
            onProfileChange={setProfile}
          />

          {/*
              Last on purpose. The cards already answered these questions, so
              the panel is for the minority who want to argue with the result.
            */}
          <ReportSection
            eyebrow={t('lifeMatch.reportConditions')}
            tone='quiet'
            aside={
              <button
                type='button'
                aria-expanded={panelOpen}
                onClick={() => setPanelOpen((open) => !open)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  panelOpen
                    ? 'border-violet/40 bg-violet/10 text-violet-dark'
                    : 'border-slate-light/40 bg-white text-slate hover:border-violet/40 hover:text-violet-dark',
                )}
              >
                <SlidersHorizontal className='size-4' />
                {t(panelOpen ? 'lifeMatch.hideConditions' : 'lifeMatch.showConditions')}
              </button>
            }
          >
            {panelOpen ? (
              <LifeProfilePanel
                profile={profile}
                routine={routine}
                onProfileChange={setProfile}
                onRoutineChange={updateRoutine}
              />
            ) : (
              <p className='text-sm text-slate'>{t('lifeMatch.conditionsHint')}</p>
            )}
          </ReportSection>
        </ReportSpine>
      </div>
    </div>
  );
}
