import { Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { KakaoMap } from '@components/KakaoMap';
import { TagStrip } from '@components/TagStrip';
import { useHousingDetail, useNeighborhood } from '@hooks/useHousing';
import { useSavedHousing } from '@hooks/useSaved';
import { cn } from '@utils/cn';
import { formatWon } from '@utils/money';

function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className='rounded-2xl border border-slate-light/30 bg-white p-4'>
      <div className='text-xs text-slate'>{label}</div>
      <div
        className={cn(
          'mt-1 truncate font-mono text-lg font-bold',
          accent ? 'text-terracotta-dark' : 'text-marine',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function CategoryBar({ label, count, max }: { label: string; count: number; max: number }) {
  const ratio = max > 0 ? Math.max(count / max, 0.04) : 0;
  return (
    <div className='flex items-center gap-3'>
      <span className='w-24 shrink-0 truncate text-xs font-medium text-marine'>{label}</span>
      <div className='h-1.5 flex-1 rounded-full bg-mist-dim'>
        <div
          className='h-1.5 rounded-full bg-terracotta'
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <span className='w-10 shrink-0 text-right font-mono text-xs text-slate'>{count}</span>
    </div>
  );
}

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
          'rounded-2xl border-2 border-dashed border-terracotta/40 bg-mist-dim p-6 text-center text-sm text-terracotta-dark',
          className,
        )}
      >
        {t('detail.neighborhoodError')}
      </div>
    );
  }

  const topCategories = profile.categories.slice(0, 6);
  const maxCount = topCategories[0]?.count ?? 0;

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
    </div>
  );
}

export function Detail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const housingId = Number(id);
  const { data: housing, isLoading, isError } = useHousingDetail(housingId);
  const { isSaved, toggleSaved } = useSavedHousing();

  if (isLoading)
    return <div className='mx-auto max-w-5xl px-6 py-12 text-slate'>{t('detail.loading')}</div>;
  if (isError || !housing) {
    return (
      <div className='mx-auto max-w-5xl px-6 py-12 text-terracotta-dark'>
        {t('detail.notFound')}
      </div>
    );
  }

  const typeLabel = t(`housingType.${housing.type}`);
  const geocoded = housing.lat != null && housing.lng != null;
  const saved = isSaved(housing.id);

  return (
    <div className='mx-auto max-w-5xl px-6 py-10'>
      <Reveal>
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <span className='inline-block rounded-full bg-marine/10 px-2.5 py-0.5 text-xs font-medium text-marine'>
              {typeLabel}
            </span>
            <h1 className='mt-2 text-3xl font-extrabold tracking-tight text-marine'>
              {housing.projectName}
            </h1>
            <p className='mt-1 text-slate'>{housing.address}</p>
          </div>
          <button
            type='button'
            aria-label={saved ? t('saved.unsaveLabel') : t('saved.saveLabel')}
            aria-pressed={saved}
            onClick={() => toggleSaved(housing.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              saved
                ? 'border-terracotta/40 bg-terracotta/10 text-terracotta-dark'
                : 'border-slate-light/40 bg-white text-slate hover:border-terracotta/40',
            )}
          >
            <Heart className={cn('size-4', saved && 'fill-terracotta text-terracotta')} />
            {saved ? t('saved.unsaveLabel') : t('saved.saveLabel')}
          </button>
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
            <h2 className='mb-3 font-medium text-marine'>{t('detail.locationHeading')}</h2>
            <div className='overflow-hidden rounded-2xl border border-slate-light/30'>
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
            </div>
          </div>
        </Reveal>

        <Reveal
          delay={0.15}
          className='lg:relative lg:col-span-2'
        >
          <div className='flex h-full flex-col lg:absolute lg:inset-0'>
            <h2 className='mb-3 shrink-0 font-medium text-marine'>
              {t('detail.neighborhoodHeading')}
            </h2>
            {geocoded ? (
              <NeighborhoodSection
                housingId={housing.id}
                className='min-h-0 flex-1 overflow-y-auto'
              />
            ) : (
              <div className='flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-light/50 bg-mist-dim p-6 text-center text-sm text-slate'>
                {t('detail.nearbyPlaceholder')}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
