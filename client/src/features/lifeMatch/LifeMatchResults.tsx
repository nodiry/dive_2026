import type { LifestyleRecommendationResult } from '@shared';
import { CheckCircle2, MapPin, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { KakaoMap, type HousingMarker, type MapFocus } from '@components/KakaoMap';
import { housingDetailPath } from '@constants/path';
import { cn } from '@utils/cn';
import { formatWon } from '@utils/money';
import type { LifeProfile } from './model';

interface LifeMatchResultsProps {
  results: LifestyleRecommendationResult[];
  profile: LifeProfile;
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

function MatchCard({
  result,
  rank,
  best,
  selected,
  onOpen,
  onSelect,
}: {
  result: LifestyleRecommendationResult;
  rank: number;
  best: number;
  selected: boolean;
  onOpen: () => void;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const entries = breakdownEntries(result, t);
  const strongest = entries.reduce((a, b) => (b.value > a.value ? b : a));
  const weakest = entries.reduce((a, b) => (b.value < a.value ? b : a));
  const axes = [
    [t('lifeMatch.fun'), result.lifeAxes.fun, 'bg-violet'],
    [t('lifeMatch.work'), result.lifeAxes.work, 'bg-plum'],
    [t('lifeMatch.rest'), result.lifeAxes.rest, 'bg-gold'],
  ] as const;

  return (
    <article
      onMouseEnter={onSelect}
      onFocusCapture={onSelect}
      className={cn(
        'rounded-2xl border bg-white p-5 transition-colors',
        selected ? 'border-violet/70' : 'border-slate-light/30 hover:border-violet/40',
      )}
    >
      <div className='flex items-center gap-3'>
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs',
            rank === 1 ? 'bg-gold text-plum' : 'bg-plum text-lilac',
          )}
        >
          {rank}
        </span>
        <h3 className='min-w-0 flex-1 truncate text-lg font-bold text-plum'>
          {result.housing.projectName}
        </h3>
        <span className='shrink-0 font-mono text-lg font-bold text-violet-dark'>
          {Math.round(result.matchRate)}%
        </span>
      </div>
      <p className='mt-1 truncate pl-9 text-sm text-slate'>{result.housing.address}</p>
      <div className='mt-2.5 h-1 rounded-full bg-lilac-dim'>
        <div
          className='h-1 rounded-full bg-violet'
          style={{ width: `${best > 0 ? Math.round((result.matchRate / best) * 100) : 0}%` }}
        />
      </div>
      <p className='mt-2.5 font-mono text-sm text-plum'>
        {formatWon(result.housing.minDeposit)} · {formatWon(result.housing.minRent)}
      </p>

      <div className='mt-3 grid grid-cols-3 gap-2'>
        {axes.map(([label, value, color]) => (
          <div key={label}>
            <div className='flex items-baseline justify-between font-mono text-xs'>
              <span className='text-slate'>{label}</span>
              <span className='text-plum'>{Math.round(value)}</span>
            </div>
            <div className='mt-1 h-1 rounded-full bg-lilac-dim'>
              <div
                className={cn('h-1 rounded-full', color)}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className='mt-3 space-y-1 text-xs'>
        <p className='flex items-center gap-1.5 text-violet-dark'>
          <CheckCircle2 className='size-3.5 shrink-0' />
          {t('lifeMatch.strength')}: {strongest.label}{' '}
          <span className='font-mono'>{Math.round(strongest.value)}</span>
        </p>
        <p className='flex items-center gap-1.5 text-slate'>
          <TriangleAlert className='size-3.5 shrink-0 text-gold' />
          {t('lifeMatch.caution')}: {weakest.label}{' '}
          <span className='font-mono'>{Math.round(weakest.value)}</span>
        </p>
      </div>

      <div className='mt-4 grid grid-cols-2 gap-2'>
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
  pending,
  error,
  onProfileChange,
}: LifeMatchResultsProps) {
  const { t } = useTranslation();
  const [openResult, setOpenResult] = useState<LifestyleRecommendationResult | null>(null);
  const [selectedHousingId, setSelectedHousingId] = useState<number | null>(null);
  const topResults = results.slice(0, 3);
  const best = topResults[0]?.matchRate ?? 0;
  const activeSelectedHousingId = topResults.some(
    (result) => result.housing.id === selectedHousingId,
  )
    ? selectedHousingId
    : (topResults[0]?.housing.id ?? null);
  const markers: HousingMarker[] = topResults.map((result) => ({
    kind: 'housing',
    id: result.housing.id,
    lat: result.housing.lat ?? Number.NaN,
    lng: result.housing.lng ?? Number.NaN,
    label: result.housing.projectName,
    selected: result.housing.id === activeSelectedHousingId,
  }));
  const selectedResult = topResults.find((r) => r.housing.id === activeSelectedHousingId);
  const focus: MapFocus | null =
    selectedResult && selectedResult.housing.lat != null && selectedResult.housing.lng != null
      ? {
          lat: selectedResult.housing.lat,
          lng: selectedResult.housing.lng,
          key: selectedResult.housing.id,
        }
      : null;
  const fitKey = topResults
    .map((r) => r.housing.id)
    .sort((a, b) => a - b)
    .join(',');
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

  return (
    <div>
      <div className='flex items-baseline justify-between gap-3'>
        <h2 className='font-medium text-plum'>{t('lifeMatch.resultTitle')}</h2>
        {pending ? (
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
        )}
      </div>

      {error && (
        <p className='mt-3 rounded-2xl border-2 border-dashed border-slate-light/40 bg-lilac-dim p-6 text-center text-sm text-slate'>
          {t('lifeMatch.error')}
        </p>
      )}

      {pending && results.length === 0 && (
        <div className='mt-3 space-y-3'>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className='h-44 animate-pulse rounded-2xl border border-slate-light/20 bg-white/70'
            />
          ))}
        </div>
      )}

      {!pending && !error && results.length === 0 && (
        <div className='mt-3 rounded-2xl border-2 border-dashed border-slate-light/40 bg-lilac-dim p-6 text-center'>
          <p className='text-sm text-slate'>{t('lifeMatch.noResults')}</p>
          <p className='mt-3 text-xs font-medium text-slate'>{t('lifeMatch.quickRelaxTitle')}</p>
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

      {topResults.length > 0 && (
        <div className={cn('mt-3 space-y-4', pending && 'opacity-60 transition-opacity')}>
          <div className='overflow-hidden rounded-2xl border border-slate-light/30 bg-lilac-dim'>
            <KakaoMap
              bounded
              className='aspect-[21/9] w-full'
              markers={markers}
              focus={focus}
              fitKey={fitKey}
              onMarkerClick={(m) => m.kind === 'housing' && setSelectedHousingId(m.id)}
            />
          </div>
          <div className='space-y-3'>
            {topResults.map((result, index) => (
              <MatchCard
                key={result.housing.id}
                result={result}
                rank={index + 1}
                best={best}
                selected={result.housing.id === activeSelectedHousingId}
                onOpen={() => setOpenResult(result)}
                onSelect={() => setSelectedHousingId(result.housing.id)}
              />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {openResult && (
          <HousingMatchModal
            result={openResult}
            onClose={() => setOpenResult(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
