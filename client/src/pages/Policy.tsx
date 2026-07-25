import type { HousingSummary, HousingType } from '@shared';
import { Database } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryBar } from '@components/CategoryBar';
import { Reveal } from '@components/Reveal';
import { StatTile } from '@components/StatTile';
import { useHousingAlertStats } from '@hooks/useAlerts';
import { useHousingSearch } from '@hooks/useHousing';

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function yearOf(housing: HousingSummary) {
  const year = Number(housing.builtDate?.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function Policy() {
  const { t } = useTranslation();
  const housing = useHousingSearch({}, true);
  const alertStats = useHousingAlertStats();
  const metrics = useMemo(() => {
    const rows = housing.data ?? [];
    const byType = rows.reduce<Record<HousingType, number>>(
      (counts, row) => ({ ...counts, [row.type]: counts[row.type] + 1 }),
      { purchased: 0, redevelopment: 0, integrated: 0, happy: 0 },
    );
    return {
      rows,
      byType,
      geocoded: rows.filter((row) => row.lat != null && row.lng != null).length,
      elevatorGap: rows.filter((row) => row.hasElevator !== true).length,
      parkingGap: rows.filter((row) => (row.parkingSpots ?? 0) <= 0).length,
      olderStock: rows.filter((row) => {
        const year = yearOf(row);
        return year != null && year < 2000;
      }).length,
    };
  }, [housing.data]);

  if (housing.isPending || housing.isError) {
    return (
      <div className='px-6 py-10 sm:px-8'>
        <p className='rounded-2xl border-2 border-dashed border-slate-light/40 bg-lilac-dim p-8 text-center text-sm text-slate'>
          {housing.isError ? t('policy.error') : t('policy.loading')}
        </p>
      </div>
    );
  }

  const total = metrics.rows.length;
  const readiness = [
    [t('policy.missingLocation'), total - metrics.geocoded, 'bg-violet'],
    [t('policy.noElevator'), metrics.elevatorGap, 'bg-gold'],
    [t('policy.noParking'), metrics.parkingGap, 'bg-plum-light'],
    [t('policy.olderStock'), metrics.olderStock, 'bg-slate'],
  ] as const;
  const actions = [t('policy.action1'), t('policy.action2'), t('policy.action3')];

  return (
    <div className='px-6 py-10 sm:px-8'>
      <Reveal>
        <p className='font-mono text-sm tracking-wide text-slate uppercase'>
          {t('policy.navLabel')}
        </p>
        <h1 className='mt-1 text-3xl font-extrabold tracking-tight text-plum'>
          {t('policy.title')}
        </h1>
        <p className='mt-2 max-w-2xl text-sm text-slate'>{t('policy.intro')}</p>
        <p className='mt-3 inline-flex items-center gap-2 rounded-full border border-slate-light/30 bg-white px-4 py-2 text-xs text-slate'>
          <Database className='size-4 shrink-0 text-violet' />
          {t('policy.actualDataNote')}
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className='mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4'>
          <StatTile
            label={t('policy.totalProjects')}
            value={String(total)}
          />
          <StatTile
            label={t('policy.geocodedCoverage')}
            value={`${percent(metrics.geocoded, total)}%`}
            accent
          />
          <StatTile
            label={t('policy.elevatorGap')}
            value={String(metrics.elevatorGap)}
          />
          <StatTile
            label={t('policy.parkingGap')}
            value={String(metrics.parkingGap)}
          />
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <section className='mt-6 rounded-2xl border border-slate-light/30 bg-white p-6'>
          <h2 className='font-mono text-xs tracking-wide text-slate uppercase'>
            {t('policy.demandTitle')}
          </h2>
          <p className='mt-1.5 text-xs leading-5 text-slate-light'>
            {t('policy.demandDescription')}
          </p>
          {alertStats.isPending || alertStats.isError ? (
            <p className='mt-4 rounded-2xl bg-lilac p-4 text-sm text-slate'>
              {alertStats.isError ? t('policy.demandError') : t('policy.demandLoading')}
            </p>
          ) : (
            <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4'>
              <StatTile
                label={t('policy.activeAlerts')}
                value={String(alertStats.data.activeAlerts)}
                accent
              />
              <StatTile
                label={t('policy.alertUsers')}
                value={String(alertStats.data.uniqueUsers)}
              />
              <StatTile
                label={t('policy.newLast7Days')}
                value={String(alertStats.data.newLast7Days)}
              />
              <StatTile
                label={t('policy.topDistrict')}
                value={
                  alertStats.data.topDistrict
                    ? `${t(`districts.${alertStats.data.topDistrict}`)} · ${alertStats.data.topDistrictCount}`
                    : t('policy.noTopDistrict')
                }
              />
            </div>
          )}
        </section>
      </Reveal>

      <div className='mt-6 grid gap-6 lg:grid-cols-2'>
        <Reveal delay={0.1}>
          <div className='h-full rounded-2xl border border-slate-light/30 bg-white p-6'>
            <div className='mb-3 flex items-baseline justify-between'>
              <span className='font-mono text-xs tracking-wide text-slate uppercase'>
                {t('policy.stockByType')}
              </span>
              <span className='font-mono text-xs text-slate'>{total}</span>
            </div>
            <div className='space-y-2.5'>
              {(Object.entries(metrics.byType) as [HousingType, number][]).map(([type, count]) => (
                <CategoryBar
                  key={type}
                  label={t(`housingType.${type}`)}
                  count={count}
                  max={total}
                  labelClass='w-28'
                />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className='h-full rounded-2xl border border-slate-light/30 bg-white p-6'>
            <span className='font-mono text-xs tracking-wide text-slate uppercase'>
              {t('policy.readinessTitle')}
            </span>
            <p className='mt-1.5 mb-3 text-xs text-slate-light'>
              {t('policy.readinessDescription')}
            </p>
            <div className='space-y-2.5'>
              {readiness.map(([label, count, color]) => (
                <CategoryBar
                  key={label}
                  label={label}
                  count={count}
                  max={total}
                  barClass={color}
                  labelClass='w-36'
                />
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.2}>
        <div className='mt-6 rounded-2xl border border-slate-light/30 bg-white p-6'>
          <span className='font-mono text-xs tracking-wide text-slate uppercase'>
            {t('policy.actionTitle')}
          </span>
          <ol className='mt-3 grid gap-3 md:grid-cols-3'>
            {actions.map((action, index) => (
              <li
                key={action}
                className='rounded-2xl bg-lilac p-4 text-sm leading-6 text-slate'
              >
                <span className='mb-2 block font-mono text-xs text-violet'>0{index + 1}</span>
                {action}
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </div>
  );
}
