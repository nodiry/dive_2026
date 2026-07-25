import { Info, MapPinned } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';
import { LanguageMenu } from '@layout/LanguageMenu';
import { UserMenu } from '@layout/UserMenu';

/**
 * The centered-column shell for non-map pages (Detail, About). The main
 * explore experience (Home/Search/Recommend, now merged) lives at "/" and
 * owns its own fullscreen MapShell instead of using this — see Explore.tsx.
 */
export function PageShell() {
  const { t } = useTranslation();

  return (
    <div className='flex min-h-svh flex-col'>
      <header className='border-b border-slate-light/30 bg-mist/95 backdrop-blur'>
        <div className='mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-6'>
          <Link
            to='/'
            className='shrink-0 whitespace-nowrap text-lg font-extrabold tracking-tight text-marine'
          >
            동네탐색<span className='text-terracotta'>.</span>
          </Link>
          <nav className='flex items-center gap-2 sm:gap-4'>
            <Link
              to='/'
              aria-label={t('nav.backToExplore')}
              className='flex items-center gap-1 text-sm font-medium text-marine/70 hover:text-marine'
            >
              <MapPinned className='size-4' />
              <span className='hidden sm:inline'>{t('nav.backToExplore')}</span>
            </Link>
            <Link
              to='/about'
              className='flex items-center gap-1 text-sm font-medium text-marine/70 hover:text-marine'
            >
              <Info className='h-4 w-4' />
              <span className='hidden sm:inline'>{t('nav.aboutLabel')}</span>
            </Link>
            <UserMenu />
            <LanguageMenu />
          </nav>
        </div>
      </header>
      <main className='flex-1'>
        <Outlet />
      </main>
      <footer className='border-t border-slate-light/30 px-6 py-6 text-center text-xs text-slate'>
        {t('footer')}
      </footer>
    </div>
  );
}
