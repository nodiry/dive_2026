import { BarChart3, Bot, Heart, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/path';
import { UserMenu } from '@layout/UserMenu';
import { useExploreStore } from '@stores/useExploreStore';
import { cn } from '@utils/cn';

/** Icon-only ghost nav link with a styled hover/focus tooltip beneath it. */
function IconNavLink({
  to,
  label,
  children,
  className,
}: {
  to: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative rounded-full p-1.5 select-none transition-colors sm:p-2',
        active ? 'text-violet' : 'text-slate-light hover:text-violet',
        className,
      )}
    >
      {children}
      <span
        role='tooltip'
        className='pointer-events-none absolute top-full left-1/2 z-50 mt-1 -translate-x-1/2 rounded-full bg-plum px-2.5 py-1 text-xs whitespace-nowrap text-lilac opacity-0 shadow-lg transition-opacity delay-75 group-hover:opacity-100 group-focus-visible:opacity-100'
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * The shared right-side navbar cluster (찜, Life Match, AI, Policy, and the
 * user menu that holds About and language) — used by both ExploreNavbar and
 * PageShell so the two headers can't drift apart. 찜 toggles the list panel on the map screen;
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
    <div className='flex min-w-0 shrink items-center gap-0.5 sm:shrink-0 sm:gap-2'>
      <button
        type='button'
        aria-pressed={savedActive}
        onClick={handleSaved}
        className={cn(
          'flex items-center gap-1.5 rounded-full p-2 text-sm font-medium transition-colors sm:px-3 sm:py-1.5',
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
          'flex items-center gap-1.5 rounded-full p-2 text-sm font-medium select-none transition-colors sm:px-3 sm:py-1.5',
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
      <IconNavLink
        to={ROUTES.AiSearch}
        label={t('aiSearch.title')}
      >
        <Bot className='size-5' />
      </IconNavLink>
      <IconNavLink
        to={ROUTES.Policy}
        label={t('policy.navLabel')}
      >
        <BarChart3 className='size-5' />
      </IconNavLink>
      {/* About and the language choice now live inside UserMenu. */}
      <UserMenu />
    </div>
  );
}
