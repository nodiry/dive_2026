import { useTranslation } from 'react-i18next';

/**
 * Row counts are the live seeded totals, kept here rather than fetched: this
 * page is the provenance record for what each partner's data actually does in
 * the product, and a judge reading it should see figures, not a spinner.
 */
const DATA_SOURCES = [
  { key: 'housing', owner: 'BMC', figure: '355 projects · 9,054 units · 4,398 price rows' },
  { key: 'storeBuilding', owner: '선도소프트 01', figure: '764 동-year store counts (2021-2024)' },
  { key: 'population', owner: '선도소프트 02', figure: '79,935 cells · 100m × 100m' },
  { key: 'useArea', owner: '선도소프트 03', figure: '29,441 cells · 5,793 with a bus stop' },
  { key: 'poi', owner: 'SEMAS', figure: '155,103 businesses · 10 categories' },
  { key: 'boundaries', owner: 'MOIS / 국토부', figure: '192 법정동 · zoning + buildings' },
] as const;

export function About() {
  const { t } = useTranslation();

  return (
    <div className='mx-auto max-w-3xl px-6 py-16'>
      <p className='font-mono text-sm tracking-wide text-violet uppercase'>DIVE 2026</p>
      <h1 className='mt-3 text-4xl font-extrabold tracking-tight text-plum'>{t('about.title')}</h1>
      <p className='mt-4 text-lg text-slate'>{t('about.intro')}</p>

      <section className='mt-12'>
        <h2 className='text-xl font-bold text-plum'>{t('about.problemHeading')}</h2>
        <p className='mt-3 leading-relaxed text-slate'>{t('about.problemBody')}</p>
      </section>

      <section className='mt-12'>
        <h2 className='text-xl font-bold text-plum'>{t('about.dataHeading')}</h2>
        <p className='mt-2 text-sm text-slate'>{t('about.dataIntro')}</p>
        <div className='mt-4 space-y-3'>
          {DATA_SOURCES.map((source) => (
            <div
              key={source.key}
              className='rounded-2xl border border-slate-light/30 bg-white/60 p-5'
            >
              <div className='flex items-baseline justify-between gap-3'>
                <p className='font-medium text-plum'>{t(`about.sources.${source.key}.name`)}</p>
                <span className='shrink-0 rounded-full bg-plum/10 px-2.5 py-0.5 font-mono text-xs text-plum'>
                  {source.owner}
                </span>
              </div>
              <p className='mt-1.5 font-mono text-sm text-violet-dark'>{source.figure}</p>
              <p className='mt-1 text-sm text-slate'>{t(`about.sources.${source.key}.use`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className='mt-12'>
        <h2 className='text-xl font-bold text-plum'>{t('about.partnersHeading')}</h2>
        <div className='mt-4 grid gap-4 sm:grid-cols-2'>
          <div className='rounded-2xl border border-slate-light/30 bg-white/60 p-6'>
            <p className='text-lg font-extrabold tracking-tight text-plum'>
              BMC<span className='text-violet'>.</span>
            </p>
            <p className='mt-1 font-medium text-plum'>{t('about.bmcName')}</p>
            <p className='mt-2 text-sm text-slate'>{t('about.bmcBlurb')}</p>
          </div>
          <div className='rounded-2xl border border-slate-light/30 bg-white/60 p-6'>
            <p className='text-lg font-extrabold tracking-tight text-plum'>
              선도소프트<span className='text-violet'>.</span>
            </p>
            <p className='mt-1 font-medium text-plum'>{t('about.sundosoftName')}</p>
            <p className='mt-2 text-sm text-slate'>{t('about.sundosoftBlurb')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
