import type { LifestyleRecommendationRequest } from '@shared';
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { LifeMatchResults } from "../features/lifeMatch/LifeMatchResults";
import { LifeResumeStep } from "../features/lifeMatch/LifeResumeStep";
import {
  buildLifestylePreferences,
  DEFAULT_LIFE_PROFILE,
  DEFAULT_WEEKLY_ROUTINE,
  DESTINATIONS,
  deriveLifeStats,
  type LifeProfile,
  type WeeklyRoutine,
} from "../features/lifeMatch/model";
import { WeeklyRoutineStep } from "../features/lifeMatch/WeeklyRoutineStep";
import { useLocale } from "../lib/i18n/localeContext";
import { useLifestyleRecommendation } from '@hooks/useRecommendation';

const STORAGE_KEY = "dive2026-life-match-v1";

interface StoredLifeMatch {
  version: 1;
  profile: LifeProfile;
  routine: WeeklyRoutine;
}

function readStoredLifeMatch(): Pick<StoredLifeMatch, "profile" | "routine"> | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as StoredLifeMatch | null;
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

export function LifeMatch() {
  const { t } = useLocale();
  const stored = useState(readStoredLifeMatch)[0];
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [profile, setProfile] = useState<LifeProfile>(() => stored?.profile ?? DEFAULT_LIFE_PROFILE);
  const [routine, setRoutine] = useState<WeeklyRoutine>(() => stored?.routine ?? { ...DEFAULT_WEEKLY_ROUTINE });
  const recommendation = useLifestyleRecommendation();
  const stats = deriveLifeStats(routine);

  useEffect(() => {
    const state: StoredLifeMatch = { version: 1, profile, routine };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [profile, routine]);

  const makeRequest = (nextProfile = profile): LifestyleRecommendationRequest => {
    const destination = DESTINATIONS[nextProfile.destinationId as keyof typeof DESTINATIONS];
    return {
      preferences: buildLifestylePreferences(nextProfile, routine, stats),
      depositMax: optionalNumber(nextProfile.depositMaxManwon, 10000),
      rentMax: optionalNumber(nextProfile.rentMaxManwon, 10000),
      minAreaM2: optionalNumber(nextProfile.minAreaM2),
      minRoomCount: optionalNumber(nextProfile.minRoomCount),
      elevatorRequired: nextProfile.elevatorRequired || undefined,
      parkingRequired: nextProfile.parkingRequired || undefined,
      district: nextProfile.district || undefined,
      type: nextProfile.type || undefined,
      lifeStats: stats,
      routine,
      destinationLat: destination?.lat,
      destinationLng: destination?.lng,
      destinationFrequency: optionalNumber(nextProfile.destinationFrequency),
      radiusMeters: 700,
    };
  };

  const recalculate = (nextProfile = profile) => {
    setProfile(nextProfile);
    recommendation.mutate(makeRequest(nextProfile));
  };

  const calculate = () => {
    recommendation.mutate(makeRequest());
    setStep(2);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 sm:mb-10">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-marine sm:text-5xl">{t.lifeMatch.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate">{t.lifeMatch.intro}</p>
          </div>
          <ol className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-light/30 bg-white/60" aria-label="Progress">
            {t.lifeMatch.steps.map((label, index) => (
              <li
                key={label}
                aria-current={step === index ? "step" : undefined}
                className={`min-w-24 px-3 py-3 text-center text-xs font-semibold sm:min-w-32 ${step === index ? "bg-marine text-mist" : index < step ? "text-terracotta-dark" : "text-slate"}`}
              >
                <span className="mr-1 font-mono">0{index + 1}</span> {label}
              </li>
            ))}
          </ol>
        </div>
      </header>

      {step === 0 ? <LifeResumeStep profile={profile} onChange={setProfile} t={t} /> : null}
      {step === 1 ? <WeeklyRoutineStep routine={routine} stats={stats} onChange={setRoutine} t={t} /> : null}
      {step === 2 ? (
        <LifeMatchResults
          results={recommendation.data ?? []}
          profile={profile}
          pending={recommendation.isPending}
          error={recommendation.isError}
          onProfileChange={setProfile}
          onRecalculate={recalculate}
          t={t}
        />
      ) : null}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1) as 0 | 1 | 2)}
          disabled={step === 0}
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate transition hover:bg-marine/10 disabled:invisible"
        >
          <ArrowLeft className="h-4 w-4" /> {t.lifeMatch.back}
        </button>
        {step === 0 ? (
          <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-sm font-bold text-white transition hover:bg-terracotta-dark">
            {t.lifeMatch.next} <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
        {step === 1 ? (
          <button type="button" onClick={calculate} className="flex items-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-sm font-bold text-white transition hover:bg-terracotta-dark">
            {t.lifeMatch.calculate} <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
