import { MapPinned } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@constants/path';
import { NavActions } from '@layout/NavActions';
import { cn } from '@utils/cn';

/**
 * The centered-column shell for non-map pages (Detail, About, LifeMatch,
 * Policy, auth). The header mirrors ExploreNavbar: same surface, brand on
 * the left plus a back-to-map link, and the shared NavActions cluster on
 * the right. The main explore experience lives at "/" and owns its own
 * fullscreen MapShell instead of using this — see Explore.tsx.
 *
 * Chat is the one page that fills the viewport rather than growing the
 * document: `min-h-svh` lets the page itself scroll, which leaves the
 * history sidebar and the transcript as tall as their content so neither
 * can scroll on its own.
 */
export function PageShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const fills = location.pathname === ROUTES.AiSearch;

  return (
    <div className={cn('flex flex-col', fills ? 'h-svh overflow-hidden' : 'min-h-svh')}>
      <header className='relative z-30 flex min-h-[3.25rem] shrink-0 items-center justify-between gap-3 border-b border-slate-light/30 bg-lilac/95 px-4 py-2 backdrop-blur sm:px-6'>
        <div className='flex min-w-0 shrink-0 items-center gap-3'>
          <Link
            to='/'
            className='shrink-0 text-lg font-extrabold tracking-tight text-plum select-none'
          >
            하루<span className='text-violet'>.</span>
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
      <main className={cn('flex min-h-0 flex-1 flex-col', fills && 'overflow-hidden')}>
        <Outlet />
      </main>
      {!fills && (
        <footer className='shrink-0 border-t border-slate-light/30 px-6 py-6 text-center text-xs text-slate'>
          {t('footer')}
        </footer>
      )}
    </div>
  );
}
