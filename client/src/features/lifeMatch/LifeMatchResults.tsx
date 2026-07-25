import type { LifestyleRecommendationResult } from '@shared';
import { CheckCircle2, MapPin, MapPinned, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { KakaoMap } from '@components/KakaoMap';
import { ROUTES, housingDetailPath } from '@constants/path';
import { cn } from '@utils/cn';
import { formatWon } from '@utils/money';
import { ReportSection } from './ReportSection';
import {
  buildLifestylePreferences,
  deriveLifeStats,
  type LifeProfile,
  type WeeklyRoutine,
} from './model';
import { useExploreStore } from '@stores/useExploreStore';
import type { CategoryWeights } from '@constants/poi';

interface LifeMatchResultsProps {
  results: LifestyleRecommendationResult[];
  profile: LifeProfile;
  routine: WeeklyRoutine;
  pending: boolean;
  error: boolean;
  onProfileChange: (profile: LifeProfile) => void;
}

type BreakdownKey = keyof LifestyleRecommendationResult['breakdown'];

function breakdownEntries(result: LifestyleRecommendationResult, t: TFunction) {
  const labels: Record<BreakdownKey, string> = {
    lifestyle: t('lifeMatch.lifestyle'),
    routine: t('lifeMatch.routine'),
    housing: t('lifeMatch.housing'),
    affordability: t('lifeMatch.affordability'),
  };
  return (Object.entries(result.breakdown) as [BreakdownKey, number][]).map(([key, value]) => ({
    key,
    label: labels[key],
    value,
  }));
}

/** Top categories that actually earned the score, newly surfaced on the row. */
const EVIDENCE_CHIPS = 3;

function MatchRow({
  result,
  rank,
  best,
  onOpen,
}: {
  result: LifestyleRecommendationResult;
  rank: number;
  best: number;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const entries = breakdownEntries(result, t);
  const strongest = entries.reduce((a, b) => (b.value > a.value ? b : a));
  const weakest = entries.reduce((a, b) => (b.value < a.value ? b : a));
  const evidence = result.matches
    .filter((match) => match.count > 0)
    .sort((a, b) => (a.nearestMeters ?? Infinity) - (b.nearestMeters ?? Infinity))
    .slice(0, EVIDENCE_CHIPS);
  const geocoded = result.housing.lat != null && result.housing.lng != null;

  return (
    <article className='overflow-hidden rounded-2xl border border-slate-light/30 bg-white transition-colors hover:border-violet/40'>
      <div className='flex flex-col sm:flex-row'>
        {/* A locator per row, so each match is readable on its own rather than
            cross-referenced against one shared map above the list. */}
        <div className='shrink-0 bg-lilac-dim sm:w-60'>
          {geocoded ? (
            <KakaoMap
              staticView
              className='aspect-[16/9] w-full sm:aspect-auto sm:h-full sm:min-h-40'
              markers={[
                {
                  kind: 'housing',
                  id: result.housing.id,
                  lat: result.housing.lat as number,
                  lng: result.housing.lng as number,
                  label: result.housing.projectName,
                },
              ]}
            />
          ) : (
            <div className='flex aspect-[16/9] w-full items-center justify-center p-3 text-center font-mono text-xs text-slate-light sm:aspect-auto sm:h-full sm:min-h-40 sm:w-60'>
              {t('map.noCoordsTitle')}
            </div>
          )}
        </div>

        <div className='min-w-0 flex-1 p-5'>
          <div className='flex items-baseline gap-3'>
            <span className='font-mono text-2xl font-bold text-violet-dark'>
              {Math.round(result.matchRate)}%
            </span>
            <h3 className='min-w-0 flex-1 truncate text-lg font-bold text-plum'>
              {result.housing.projectName}
            </h3>
          </div>
          <div className='mt-2 h-1 rounded-full bg-lilac-dim'>
            <div
              className={cn('h-1 rounded-full', rank === 1 ? 'bg-gold' : 'bg-violet')}
              style={{ width: `${best > 0 ? Math.round((result.matchRate / best) * 100) : 0}%` }}
            />
          </div>
          <p className='mt-2.5 truncate text-sm text-slate'>{result.housing.address}</p>
          <p className='mt-1 font-mono text-sm text-plum'>
            {formatWon(result.housing.minDeposit)} · {formatWon(result.housing.minRent)}
          </p>

          {evidence.length > 0 && (
            <div className='mt-3 flex flex-wrap gap-1.5'>
              {evidence.map((match) => (
                <span
                  key={match.categoryName}
                  className='rounded-full border border-slate-light/30 bg-lilac px-2.5 py-1 text-xs text-plum'
                >
                  {match.categoryName}{' '}
                  <span className='font-mono text-slate'>
                    {t('units.matchCount', {
                      count: match.count,
                      meters: Math.round(match.nearestMeters ?? 0),
                    })}
                  </span>
                </span>
              ))}
            </div>
          )}

          <p className='mt-3 font-mono text-xs text-slate'>
            {t('lifeMatch.fun')} {Math.round(result.lifeAxes.fun)} · {t('lifeMatch.work')}{' '}
            {Math.round(result.lifeAxes.work)} · {t('lifeMatch.rest')}{' '}
            {Math.round(result.lifeAxes.rest)}
          </p>

          <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
            <span className='flex items-center gap-1.5 text-violet-dark'>
              <CheckCircle2 className='size-3.5 shrink-0' />
              {t('lifeMatch.strength')}: {strongest.label}{' '}
              <span className='font-mono'>{Math.round(strongest.value)}</span>
            </span>
            <span className='flex items-center gap-1.5 text-slate'>
              <TriangleAlert className='size-3.5 shrink-0 text-gold' />
              {t('lifeMatch.caution')}: {weakest.label}{' '}
              <span className='font-mono'>{Math.round(weakest.value)}</span>
            </span>
          </div>

          <div className='mt-4 flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={onOpen}
              className='rounded-full border border-slate-light/40 px-5 py-2 text-sm font-medium text-plum transition-colors hover:border-violet/40 hover:text-violet-dark'
            >
              {t('lifeMatch.openDetail')}
            </button>
            <Link
              to={housingDetailPath(result.housing.id)}
              className='rounded-full border border-slate-light/40 px-5 py-2 text-center text-sm font-medium text-plum transition-colors hover:border-violet/40 hover:text-violet-dark'
            >
              {t('explore.detailLink')}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function HousingMatchModal({
  result,
  onClose,
}: {
  result: LifestyleRecommendationResult;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'resume' | 'week' | 'data'>('resume');
  const tabs = [
    ['resume', t('lifeMatch.houseResume')],
    ['week', t('lifeMatch.weekAtHome')],
    ['data', t('lifeMatch.dataBasis')],
  ] as const;
  const housing = result.housing;
  const weightLine = `42% ${t('lifeMatch.lifestyle')} + 28% ${t('lifeMatch.routine')} + 18% ${t('lifeMatch.housing')} + 12% ${t('lifeMatch.affordability')}`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      role='presentation'
      onMouseDown={onClose}
      className='fixed inset-0 z-50 grid place-items-center bg-plum/65 p-4'
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        role='dialog'
        aria-modal='true'
        aria-labelledby='house-match-title'
        onMouseDown={(event) => event.stopPropagation()}
        className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-lilac shadow-lg'
      >
        <header className='flex items-start justify-between border-b border-slate-light/25 p-6'>
          <div>
            <p className='font-mono text-xs text-violet'>
              {Math.round(result.matchRate)}% {t('lifeMatch.matchLabel')}
            </p>
            <h2
              id='house-match-title'
              className='mt-1 text-2xl font-bold text-plum'
            >
              {housing.projectName}
            </h2>
          </div>
          <button
            autoFocus
            type='button'
            onClick={onClose}
            aria-label={t('lifeMatch.close')}
            className='rounded-full p-2 text-slate-light transition-colors hover:text-violet'
          >
            <X className='size-5' />
          </button>
        </header>

        <div className='flex gap-1 overflow-x-auto border-b border-slate-light/25 px-6 pt-3'>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type='button'
              onClick={() => setTab(key)}
              className={cn(
                'border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                tab === key
                  ? 'border-violet text-violet-dark'
                  : 'border-transparent text-slate hover:text-plum',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className='p-6'>
          {tab === 'resume' && (
            <dl className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {[
                [t('detail.specAddress'), housing.address],
                [t('detail.specBuiltDate'), housing.builtDate ?? t('detail.noData')],
                [t('detail.specDeposit'), formatWon(housing.minDeposit)],
                [t('detail.specRent'), formatWon(housing.minRent)],
                [
                  t('lifeMatch.minArea'),
                  housing.maxAreaM2 != null ? `${housing.maxAreaM2}㎡` : t('detail.noData'),
                ],
                [t('lifeMatch.minRooms'), housing.maxRooms?.toString() ?? t('detail.noData')],
                [
                  t('lifeMatch.elevator'),
                  housing.hasElevator == null
                    ? t('detail.noData')
                    : housing.hasElevator
                      ? t('lifeMatch.yes')
                      : t('lifeMatch.no'),
                ],
                [t('lifeMatch.parking'), housing.parkingSpots?.toString() ?? t('detail.noData')],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className='rounded-2xl bg-white p-4'
                >
                  <dt className='text-xs text-slate'>{label}</dt>
                  <dd className='mt-1 font-mono text-sm text-plum'>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab === 'week' && (
            <div className='grid gap-3 sm:grid-cols-2'>
              {result.routineDetails.map((detail) => (
                <div
                  key={detail.activity}
                  className='rounded-2xl bg-white px-4 py-3'
                >
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-sm text-plum'>
                      {t(`lifeMatch.activities.${detail.activity}`)}
                    </span>
                    <span className='font-mono text-sm text-violet-dark'>
                      {Math.round(detail.score)} / 100
                    </span>
                  </div>
                  <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-lilac-dim'>
                    <div
                      className='h-full rounded-full bg-violet'
                      style={{ width: `${detail.score}%` }}
                    />
                  </div>
                  <p className='mt-2 text-xs text-slate-light'>
                    {t('lifeMatch.perWeekCount', { count: detail.requested })} ·{' '}
                    {t(`lifeMatch.evidenceLabels.${detail.evidence}`)}
                  </p>
                </div>
              ))}
              <p className='rounded-2xl bg-plum p-4 text-sm text-lilac sm:col-span-2'>
                {t('lifeMatch.routine')}:{' '}
                <strong className='font-mono'>{Math.round(result.breakdown.routine)} / 100</strong>
              </p>
            </div>
          )}

          {tab === 'data' && (
            <div className='space-y-4 text-sm text-slate'>
              <p className='rounded-2xl bg-white p-4 font-mono text-sm text-plum'>{weightLine}</p>
              <div className='grid gap-3 sm:grid-cols-3'>
                {(
                  [
                    [t('lifeMatch.residentialArea'), result.neighborhood.residentialRatio],
                    [t('lifeMatch.commercialArea'), result.neighborhood.commercialRatio],
                    [t('lifeMatch.greenArea'), result.neighborhood.greenRatio],
                  ] as const
                ).map(([label, ratio]) => (
                  <div
                    key={label}
                    className='rounded-2xl bg-white p-4'
                  >
                    <span className='text-xs text-slate'>{label}</span>
                    <strong className='mt-1 block font-mono text-plum'>
                      {ratio == null ? '-' : `${Math.round(ratio * 100)}%`}
                    </strong>
                  </div>
                ))}
              </div>
              {result.destinationDistanceMeters != null && (
                <p className='flex items-start gap-2 rounded-2xl bg-white p-4 text-plum'>
                  <MapPin className='mt-0.5 size-4 shrink-0 text-violet' />
                  <span>
                    <span className='font-mono'>
                      {Math.round(result.destinationDistanceMeters / 100) / 10}km
                    </span>{' '}
                    · {t('lifeMatch.straightLineNote')}
                  </span>
                </p>
              )}
              {result.neighborhood.source === 'unavailable' && (
                <p className='text-xs text-slate-light'>{t('lifeMatch.zoningUnavailable')}</p>
              )}
              <div className='grid gap-3 sm:grid-cols-2'>
                {result.matches.map((match) => (
                  <div
                    key={match.categoryName}
                    className='rounded-2xl border border-slate-light/25 bg-white p-4'
                  >
                    <strong className='text-plum'>{match.categoryName}</strong>
                    <p className='mt-1 font-mono text-xs'>
                      {match.count} POI ·{' '}
                      {match.nearestMeters == null ? '-' : `${Math.round(match.nearestMeters)}m`}
                    </p>
                  </div>
                ))}
              </div>
              <p className='text-xs text-slate-light'>{t('lifeMatch.demoWeightNote')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function LifeMatchResults({
  results,
  profile,
  routine,
  pending,
  error,
  onProfileChange,
}: LifeMatchResultsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const applyWeights = useExploreStore((s) => s.applyWeights);

  /**
   * The bridge between the two preference surfaces: Life Match is the deep
   * pass (log your week), Explore's 취향 mode is the quick one. Rather than
   * two tools answering the same question, this hands the derived weights to
   * the map so the flow reads as refine-then-see.
   */
  function openOnMap() {
    const stats = deriveLifeStats(routine);
    const weights: CategoryWeights = {};
    for (const preference of buildLifestylePreferences(profile, routine, stats)) {
      weights[preference.categoryName] = Math.min(1, preference.weight * 4);
    }
    applyWeights(weights, 700);
    navigate(ROUTES.Root);
  }
  const [openResult, setOpenResult] = useState<LifestyleRecommendationResult | null>(null);
  const topResults = results.slice(0, 3);
  const best = topResults[0]?.matchRate ?? 0;
  const stats = deriveLifeStats(routine);
  const numeric = (value: string) => Number(value) || 0;
  const relaxChips = [
    {
      label: `${t('lifeMatch.rentMax')} +3`,
      patch: { rentMaxManwon: String(numeric(profile.rentMaxManwon) + 3) },
    },
    {
      label: `${t('lifeMatch.depositMax')} +500`,
      patch: { depositMaxManwon: String(numeric(profile.depositMaxManwon) + 500) },
    },
    {
      label: `${t('lifeMatch.minArea')} -3`,
      patch: { minAreaM2: String(Math.max(10, numeric(profile.minAreaM2) - 3)) },
    },
    ...(profile.elevatorRequired
      ? [{ label: `× ${t('lifeMatch.elevator')}`, patch: { elevatorRequired: false } }]
      : []),
    ...(profile.parkingRequired
      ? [{ label: `× ${t('lifeMatch.parking')}`, patch: { parkingRequired: false } }]
      : []),
  ];

  const axes = [
    [t('lifeMatch.fun'), stats.fun, 'bg-violet'],
    [t('lifeMatch.work'), stats.work, 'bg-plum'],
    [t('lifeMatch.rest'), stats.rest, 'bg-gold'],
  ] as const;

  const status: 'error' | 'loading' | 'empty' | null = error
    ? 'error'
    : results.length > 0
      ? null
      : pending
        ? 'loading'
        : 'empty';

  return (
    <>
      <ReportSection
        eyebrow={t('lifeMatch.reportWeek')}
        aside={
          pending ? (
            <span className='font-mono text-xs text-slate'>{t('lifeMatch.recalculating')}</span>
          ) : (
            results.length > 0 && (
              <span className='font-mono text-xs text-slate'>
                {t('lifeMatch.candidateSummary', {
                  count: results.length,
                  top: Math.round(results[0].matchRate),
                })}
              </span>
            )
          )
        }
      >
        <div className='rounded-2xl border border-slate-light/30 bg-white p-5'>
          <div className='grid gap-4 sm:grid-cols-3'>
            {axes.map(([label, value, color]) => (
              <div key={label}>
                <div className='flex items-baseline justify-between font-mono text-xs'>
                  <span className='tracking-wide text-slate uppercase'>{label}</span>
                  <span className='text-lg font-bold text-plum'>{value}</span>
                </div>
                <div className='mt-1.5 h-1 rounded-full bg-lilac-dim'>
                  <div
                    className={cn('h-1 rounded-full', color)}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {results.length > 0 && (
            <button
              type='button'
              onClick={openOnMap}
              className='mt-5 flex items-center gap-1.5 rounded-full bg-violet px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-dark'
            >
              <MapPinned className='size-4' />
              {t('lifeMatch.openOnMap')}
            </button>
          )}
        </div>
      </ReportSection>

      {/* Error, first load, and no-match are all "no rows to show yet", so
          they share one section rather than three copies of its chrome. */}
      {status !== null && (
        <ReportSection
          eyebrow={t('lifeMatch.reportMatches')}
          tone='quiet'
        >
          {status === 'error' && (
            <p className='rounded-2xl border-2 border-dashed border-slate-light/40 bg-lilac-dim p-6 text-center text-sm text-slate'>
              {t('lifeMatch.error')}
            </p>
          )}

          {status === 'loading' && (
            <div className='space-y-3'>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className='h-44 animate-pulse rounded-2xl border border-slate-light/20 bg-white/70'
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          )}

          {status === 'empty' && (
            <div className='rounded-2xl border-2 border-dashed border-slate-light/40 bg-lilac-dim p-6 text-center'>
              <p className='text-sm text-slate'>{t('lifeMatch.noResults')}</p>
              <p className='mt-3 text-xs font-medium text-slate'>
                {t('lifeMatch.quickRelaxTitle')}
              </p>
              <div className='mt-2 flex flex-wrap justify-center gap-1.5'>
                {relaxChips.map((chip) => (
                  <button
                    key={chip.label}
                    type='button'
                    onClick={() => onProfileChange({ ...profile, ...chip.patch })}
                    className='rounded-full border border-slate-light/40 bg-white px-3 py-1.5 text-xs font-medium text-plum transition-colors hover:border-violet/40 hover:text-violet-dark'
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </ReportSection>
      )}

      {topResults.map((result, index) => (
        <ReportSection
          key={result.housing.id}
          eyebrow={t('lifeMatch.reportMatch', {
            index: String(index + 1).padStart(2, '0'),
          })}
          tone={index === 0 ? 'arcana' : 'primary'}
        >
          <div className={cn(pending && 'opacity-60 transition-opacity')}>
            <MatchRow
              result={result}
              rank={index + 1}
              best={best}
              onOpen={() => setOpenResult(result)}
            />
          </div>
        </ReportSection>
      ))}

      <AnimatePresence>
        {openResult && (
          <HousingMatchModal
            result={openResult}
            onClose={() => setOpenResult(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
