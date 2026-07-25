import { useTranslation } from 'react-i18next';

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
