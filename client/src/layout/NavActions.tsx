import { BarChart3, Heart, Info, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/path';
import { LanguageMenu } from '@layout/LanguageMenu';
import { UserMenu } from '@layout/UserMenu';
import { useExploreStore } from '@stores/useExploreStore';
import { cn } from '@utils/cn';

/**
 * The shared right-side navbar cluster (찜, Life Match, Policy, About,
 * user, language) — used by both ExploreNavbar and PageShell so the two
 * headers can't drift apart. 찜 toggles the list panel on the map screen;
 * on any other page it jumps back to the map with the saved view open.
 */
export function NavActions() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const onExplore = location.pathname === ROUTES.Root;
  const panelView = useExploreStore((s) => s.panelView);
  const setPanelView = useExploreStore((s) => s.setPanelView);
  const savedActive = onExplore && panelView === 'saved';

  const handleSaved = () => {
    if (onExplore) {
      setPanelView(panelView === 'saved' ? 'results' : 'saved');
    } else {
      setPanelView('saved');
      navigate(ROUTES.Root);
    }
  };

  return (
    <div className='flex shrink-0 items-center gap-2'>
      <button
        type='button'
        aria-pressed={savedActive}
        onClick={handleSaved}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          savedActive ? 'bg-plum text-lilac' : 'text-plum/70 hover:bg-plum/10',
        )}
      >
        <Heart className={cn('size-4', savedActive && 'fill-lilac')} />
        <span className='hidden sm:inline'>{t('nav.savedLabel')}</span>
      </button>
      <Link
        to={ROUTES.LifeMatch}
        aria-current={location.pathname === ROUTES.LifeMatch ? 'page' : undefined}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
          location.pathname === ROUTES.LifeMatch
            ? 'bg-violet/20 text-violet-dark'
            : 'bg-violet/10 text-violet-dark hover:bg-violet/20',
        )}
      >
        <Sparkles className='size-4' />
        <span className='hidden sm:inline'>{t('lifeMatch.navLabel')}</span>
      </Link>
      <div
        aria-hidden
        className='mx-1 hidden h-5 w-px bg-slate-light/30 sm:block'
      />
      <Link
        to={ROUTES.Policy}
        aria-label={t('policy.navLabel')}
        title={t('policy.navLabel')}
        aria-current={location.pathname === ROUTES.Policy ? 'page' : undefined}
        className={cn(
          'rounded-full p-2 transition-colors',
          location.pathname === ROUTES.Policy
            ? 'text-violet'
            : 'text-slate-light hover:text-violet',
        )}
      >
        <BarChart3 className='size-5' />
      </Link>
      <Link
        to={ROUTES.About}
        aria-label={t('nav.aboutLabel')}
        title={t('nav.aboutLabel')}
        aria-current={location.pathname === ROUTES.About ? 'page' : undefined}
        className={cn(
          'rounded-full p-2 transition-colors',
          location.pathname === ROUTES.About ? 'text-violet' : 'text-slate-light hover:text-violet',
        )}
      >
        <Info className='size-5' />
      </Link>
      <UserMenu />
      <LanguageMenu />
    </div>
  );
}
