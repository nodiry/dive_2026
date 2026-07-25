import { MapPinned } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';
import { NavActions } from '@layout/NavActions';

/**
 * The centered-column shell for non-map pages (Detail, About, LifeMatch,
 * Policy, auth). The header mirrors ExploreNavbar: same surface, brand on
 * the left plus a back-to-map link, and the shared NavActions cluster on
 * the right. The main explore experience lives at "/" and owns its own
 * fullscreen MapShell instead of using this — see Explore.tsx.
 */
export function PageShell() {
  const { t } = useTranslation();

  return (
    <div className='flex min-h-svh flex-col'>
      <header className='relative z-30 flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-slate-light/30 bg-lilac/95 px-4 py-2 backdrop-blur sm:px-6'>
        <div className='flex min-w-0 shrink-0 items-center gap-3'>
          <Link
            to='/'
            className='shrink-0 text-lg font-extrabold tracking-tight text-plum select-none'
          >
            동네탐색<span className='text-violet'>.</span>
          </Link>
          <Link
            to='/'
            className='flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-plum/70 select-none transition-colors hover:bg-plum/10'
          >
            <MapPinned className='size-4' />
            <span className='hidden sm:inline'>{t('nav.backToExplore')}</span>
          </Link>
        </div>
        <NavActions />
      </header>
      <main className='flex min-h-0 flex-1 flex-col'>
        <Outlet />
      </main>
      <footer className='border-t border-slate-light/30 px-6 py-6 text-center text-xs text-slate'>
        {t('footer')}
      </footer>
    </div>
  );
}
