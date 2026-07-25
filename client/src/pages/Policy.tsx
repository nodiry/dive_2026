import type { DistrictSupply, HousingSummary, HousingType } from '@shared';
import { Database, MapPin, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryBar } from '@components/CategoryBar';
import { Reveal } from '@components/Reveal';
import { StatTile } from '@components/StatTile';
import { useDistrictSupply } from '@hooks/useDistrictDensity';
import { useHousingSearch } from '@hooks/useHousing';
import { HOUSING_QUERY_LIMIT } from '@utils/filters';

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function yearOf(housing: HousingSummary) {
  const year = Number(housing.builtDate?.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

/**
 * Where BMC supply falls short of where people actually live. Demand comes
 * from the 선도소프트 인구-5대업종 grid (100m cells interpolated onto 법정동),
 * supply from BMC's own stock, and the gap is the residents a 동 would house
 * if it matched the citywide rate.
 */
function SupplyGapSection({ districts }: { districts: DistrictSupply[] }) {
  const { t } = useTranslation();
  const worst = districts.slice(0, 8);
  const worstGap = worst[0]?.underservedResidents ?? 1;
  const zeroSupply = districts.filter((d) => d.units === 0 && d.population >= 10000);

  return (
    <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
      <div className='rounded-2xl border border-slate-light/30 bg-white p-6'>
        <div className='mb-1 flex items-baseline justify-between gap-3'>
          <span className='font-mono text-xs tracking-wide text-slate uppercase'>
            {t('policy.gapTitle')}
          </span>
          <span className='font-mono text-xs text-slate'>{t('policy.gapUnit')}</span>
        </div>
        <p className='mb-4 text-xs text-slate-light'>{t('policy.gapDescription')}</p>
        <div className='space-y-3'>
          {worst.map((district) => (
            <div key={district.emdCode}>
              <div className='flex items-baseline justify-between gap-3 text-sm'>
                <span className='font-medium text-plum'>{district.emdName}</span>
                <span className='font-mono text-xs text-slate'>
                  {t('policy.gapRow', {
                    population: district.population.toLocaleString(),
                    units: district.units.toLocaleString(),
                  })}
                </span>
              </div>
              <div className='mt-1 flex items-center gap-2'>
                <div className='h-1.5 flex-1 rounded-full bg-lilac-dim'>
                  <div
                    className='h-1.5 rounded-full bg-violet'
                    style={{
                      width: `${Math.round((district.underservedResidents / worstGap) * 100)}%`,
                    }}
                  />
                </div>
                <span className='w-24 shrink-0 text-right font-mono text-xs text-violet-dark'>
                  {district.underservedResidents.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='space-y-3'>
        <div className='rounded-2xl border border-violet/30 bg-violet/5 p-5'>
          <TriangleAlert className='size-5 text-violet-dark' />
          <p className='mt-2 font-mono text-2xl font-bold text-violet-dark'>{zeroSupply.length}</p>
          <p className='mt-1 text-sm font-medium text-plum'>{t('policy.zeroSupplyTitle')}</p>
          <p className='mt-1 text-xs text-slate'>{t('policy.zeroSupplyDescription')}</p>
          <div className='mt-3 flex flex-wrap gap-1.5'>
            {zeroSupply.slice(0, 6).map((district) => (
              <span
                key={district.emdCode}
                className='rounded-full border border-violet/30 bg-white px-2.5 py-1 text-xs font-medium text-violet-dark'
              >
                {district.emdName}
                <span className='ml-1 font-mono opacity-70'>
                  {Math.round(district.population / 1000)}k
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className='rounded-2xl border border-slate-light/30 bg-white p-5'>
          <MapPin className='size-5 text-violet' />
          <p className='mt-2 text-sm font-medium text-plum'>{t('policy.amenityTitle')}</p>
          <p className='mt-1 text-xs text-slate'>{t('policy.amenityDescription')}</p>
          <div className='mt-3 space-y-2'>
            {worst.slice(0, 4).map((district) => (
              <div
                key={district.emdCode}
                className='flex items-baseline justify-between gap-2 text-xs'
              >
                <span className='truncate text-plum'>{district.emdName}</span>
                <span className='shrink-0 font-mono text-slate'>
                  {t('policy.amenityRow', {
                    count: district.amenityTotal.toLocaleString(),
                    per: district.amenitiesPerThousand.toFixed(1),
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Policy() {
  const { t } = useTranslation();
  const housing = useHousingSearch({ limit: HOUSING_QUERY_LIMIT }, true);
  const supply = useDistrictSupply();
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

      {supply.data && supply.data.length > 0 && (
        <Reveal delay={0.08}>
          <SupplyGapSection districts={supply.data} />
        </Reveal>
      )}

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
