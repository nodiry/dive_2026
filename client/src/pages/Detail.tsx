import {
  BusFront,
  ExternalLink,
  Heart,
  Minus,
  Share2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { CategoryBar } from '@components/CategoryBar';
import { KakaoMap } from '@components/KakaoMap';
import { Reveal } from '@components/Reveal';
import { Roadview } from '@components/Roadview';
import { StatTile } from '@components/StatTile';
import { TagStrip } from '@components/TagStrip';
import { useHousingDetail, useNeighborhood } from '@hooks/useHousing';
import { useToastStore } from '@stores/useToastStore';
import { useSavedHousing } from '@hooks/useSaved';
import { cn } from '@utils/cn';
import { formatWon } from '@utils/money';

function NeighborhoodSection({ housingId, className }: { housingId: number; className?: string }) {
  const { t } = useTranslation();
  const { data: profile, isLoading, isError } = useNeighborhood(housingId, true);

  if (isLoading) {
    return (
      <div
        className={cn(
          'h-64 animate-pulse rounded-2xl border border-slate-light/20 bg-white/70',
          className,
        )}
      />
    );
  }
  if (isError || !profile) {
    return (
      <div
        className={cn(
          'rounded-2xl border-2 border-dashed border-violet/40 bg-lilac-dim p-6 text-center text-sm text-violet-dark',
          className,
        )}
      >
        {t('detail.neighborhoodError')}
      </div>
    );
  }

  const topCategories = profile.categories.slice(0, 6);
  const maxCount = topCategories[0]?.count ?? 0;
  // show the same window the server's trend label is computed from
  // (newest year vs two years prior — the 2021 cut is under-collected)
  const trendBase =
    profile.storeTrend.length >= 3
      ? profile.storeTrend[profile.storeTrend.length - 3]
      : profile.storeTrend[0];
  const trendLast = profile.storeTrend[profile.storeTrend.length - 1];

  return (
    <div
      className={cn('space-y-5 rounded-2xl border border-slate-light/30 bg-white p-6', className)}
    >
      <div>
        <div className='mb-2.5 flex items-baseline justify-between'>
          <span className='font-mono text-xs tracking-wide text-slate uppercase'>
            {t('detail.poiSectionLabel')}
          </span>
          <span className='font-mono text-xs text-slate'>{profile.poiTotal}</span>
        </div>
        <div className='space-y-2'>
          {topCategories.map((c) => (
            <CategoryBar
              key={c.category}
              label={t(`poiMajorCategories.${c.category}`)}
              count={c.count}
              max={maxCount}
            />
          ))}
        </div>
      </div>

      <div className='border-t border-slate-light/20 pt-4'>
        <span className='mb-2.5 block font-mono text-xs tracking-wide text-slate uppercase'>
          {t('detail.zoneSectionLabel')}
        </span>
        {profile.zones.length === 0 ? (
          <p className='text-sm text-slate'>{t('detail.zonesEmpty')}</p>
        ) : (
          <TagStrip
            tags={profile.zones.map((z) => ({
              label: z.zoneType,
              sublabel: `${Math.max(1, Math.round(z.share * 100))}%`,
            }))}
          />
        )}
      </div>

      {(profile.trendLabel != null || profile.youthShare != null || profile.busStopCells > 0) && (
        <div className='border-t border-slate-light/20 pt-4'>
          <span className='mb-2.5 block font-mono text-xs tracking-wide text-slate uppercase'>
            {t('detail.signalsLabel')}
            {profile.emdName ? ` · ${profile.emdName}` : ''}
          </span>
          <div className='flex flex-wrap items-center gap-2'>
            {profile.trendLabel != null && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-semibold',
                  profile.trendLabel === 'rising' &&
                    'border-violet/40 bg-lilac-dim text-violet-dark',
                  profile.trendLabel === 'declining' && 'border-gold/50 bg-gold/10 text-gold',
                  profile.trendLabel === 'stable' && 'border-slate-light/40 bg-lilac text-slate',
                )}
              >
                {profile.trendLabel === 'rising' && <TrendingUp size={14} />}
                {profile.trendLabel === 'declining' && <TrendingDown size={14} />}
                {profile.trendLabel === 'stable' && <Minus size={14} />}
                {t(`detail.trend.${profile.trendLabel}`)}
                {profile.storeTrend.length >= 2 && trendBase !== trendLast && (
                  <span className='font-mono font-normal text-slate'>
                    {trendBase.year} {trendBase.count.toLocaleString()} → {trendLast.year}{' '}
                    {trendLast.count.toLocaleString()}
                  </span>
                )}
              </span>
            )}
            {profile.youthShare != null && (
              <span className='inline-flex items-center gap-1.5 rounded-full border-2 border-slate-light/40 bg-lilac px-3 py-1 text-xs font-semibold text-plum'>
                {t('detail.youthShare')}
                <span className='font-mono text-violet-dark'>
                  {Math.round(profile.youthShare * 100)}%
                </span>
              </span>
            )}
            {profile.busStopCells > 0 && (
              <span className='inline-flex items-center gap-1.5 rounded-full border-2 border-slate-light/40 bg-lilac px-3 py-1 text-xs font-semibold text-plum'>
                <BusFront
                  size={14}
                  className='text-violet'
                />
                {t('detail.busStopAreas')}
                <span className='font-mono text-violet-dark'>{profile.busStopCells}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Detail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const housingId = Number(id);
  const { data: housing, isLoading, isError } = useHousingDetail(housingId);
  const { isSaved, toggleSaved } = useSavedHousing();
  const [locationView, setLocationView] = useState<'map' | 'roadview'>('map');
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);

  const kakaoMapUrl =
    housing?.lat != null && housing?.lng != null
      ? `https://map.kakao.com/link/map/${encodeURIComponent(housing.projectName)},${housing.lat},${housing.lng}`
      : null;

  async function share() {
    if (!housing) return;
    const pageUrl = window.location.href;
    const lines = [housing.projectName, housing.address, kakaoMapUrl].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: housing.projectName, text: lines, url: pageUrl });
        return;
      } catch {
        // A dismissed share sheet is not a failure, and it must not fall
        // through to the clipboard copy either.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${lines}\n${pageUrl}`);
      showSuccess(t('detail.shareCopied'));
    } catch {
      showError(t('detail.shareFailed'));
    }
  }

  if (isLoading) return <div className='px-6 py-12 text-slate sm:px-8'>{t('detail.loading')}</div>;
  if (isError || !housing) {
    return <div className='px-6 py-12 text-violet-dark sm:px-8'>{t('detail.notFound')}</div>;
  }

  const typeLabel = t(`housingType.${housing.type}`);
  const geocoded = housing.lat != null && housing.lng != null;
  const saved = isSaved(housing.id);

  return (
    <div className='px-6 py-10 sm:px-8'>
      <Reveal>
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <span className='inline-block rounded-full bg-plum/10 px-2.5 py-0.5 text-xs font-medium text-plum'>
              {typeLabel}
            </span>
            <h1 className='mt-2 text-3xl font-extrabold tracking-tight text-plum'>
              {housing.projectName}
            </h1>
            <p className='mt-1 text-slate'>{housing.address}</p>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <button
              type='button'
              aria-label={t('detail.share')}
              onClick={share}
              className='flex shrink-0 items-center gap-1.5 rounded-full border border-slate-light/40 bg-white px-4 py-2 text-sm font-medium text-slate transition-colors hover:border-violet/40 hover:text-violet-dark'
            >
              <Share2 className='size-4' />
              <span className='hidden sm:inline'>{t('detail.share')}</span>
            </button>
            <button
              type='button'
              aria-label={saved ? t('saved.unsaveLabel') : t('saved.saveLabel')}
              aria-pressed={saved}
              onClick={() => toggleSaved(housing.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                saved
                  ? 'border-violet/40 bg-violet/10 text-violet-dark'
                  : 'border-slate-light/40 bg-white text-slate hover:border-violet/40',
              )}
            >
              <Heart className={cn('size-4', saved && 'fill-violet text-violet')} />
              {saved ? t('saved.unsaveLabel') : t('saved.saveLabel')}
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className='mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4'>
          <StatTile
            label={t('detail.specDeposit')}
            value={formatWon(housing.minDeposit)}
            accent
          />
          <StatTile
            label={t('detail.specRent')}
            value={formatWon(housing.minRent)}
          />
          <StatTile
            label={t('detail.specTotalUnits')}
            value={
              housing.totalUnits != null
                ? t('units.totalUnits', { count: housing.totalUnits })
                : t('detail.noData')
            }
          />
          <StatTile
            label={t('detail.specBuiltDate')}
            value={housing.builtDate ?? t('detail.noData')}
          />
        </div>
      </Reveal>

      <div className='mt-8 grid gap-6 lg:grid-cols-5'>
        <Reveal
          delay={0.1}
          className='lg:col-span-3'
        >
          <div>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <h2 className='font-medium text-plum'>{t('detail.locationHeading')}</h2>
              <div className='flex items-center gap-2'>
                {kakaoMapUrl && (
                  <a
                    href={kakaoMapUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='flex items-center gap-1 rounded-full border border-slate-light/40 bg-white px-3 py-1 text-xs font-medium text-violet-dark transition-colors hover:border-violet/40'
                  >
                    {t('detail.openKakaoMap')}
                    <ExternalLink className='size-3' />
                  </a>
                )}
                {geocoded && (
                  <div className='flex rounded-full border border-slate-light/30 bg-white p-0.5'>
                    {(['map', 'roadview'] as const).map((view) => (
                      <button
                        key={view}
                        type='button'
                        aria-pressed={locationView === view}
                        onClick={() => setLocationView(view)}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                          locationView === view
                            ? 'bg-plum text-lilac'
                            : 'text-slate hover:text-plum',
                        )}
                      >
                        {t(view === 'map' ? 'detail.viewMap' : 'detail.viewRoadview')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className='overflow-hidden rounded-2xl border border-slate-light/30'>
              {locationView === 'map' ? (
                <KakaoMap
                  staticView
                  className='aspect-[4/3] w-full'
                  markers={[
                    {
                      kind: 'housing',
                      id: housing.id,
                      lat: housing.lat ?? NaN,
                      lng: housing.lng ?? NaN,
                      label: housing.projectName,
                    },
                  ]}
                />
              ) : (
                <Roadview
                  interactive
                  lat={housing.lat ?? NaN}
                  lng={housing.lng ?? NaN}
                  className='aspect-[4/3] w-full'
                />
              )}
            </div>
          </div>
        </Reveal>

        <Reveal
          delay={0.15}
          className='lg:relative lg:col-span-2'
        >
          <div className='flex h-full flex-col lg:absolute lg:inset-0'>
            <h2 className='mb-3 shrink-0 font-medium text-plum'>
              {t('detail.neighborhoodHeading')}
            </h2>
            {geocoded ? (
              <NeighborhoodSection
                housingId={housing.id}
                className='min-h-0 flex-1 overflow-y-auto'
              />
            ) : (
              <div className='flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-light/50 bg-lilac-dim p-6 text-center text-sm text-slate'>
                {t('detail.nearbyPlaceholder')}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
