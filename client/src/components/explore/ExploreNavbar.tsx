import { ArrowRight, BarChart3, Heart, Info, Search, Sparkles } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ModeToggle } from '@components/explore/ModeToggle';
import { ROUTES } from '@constants/path';
import { LanguageMenu } from '@layout/LanguageMenu';
import { UserMenu } from '@layout/UserMenu';
import { useExploreStore } from '@stores/useExploreStore';
import { cn } from '@utils/cn';

/**
 * Single-row header: brand, mode toggle, the center AI search pill, and
 * utilities. All filter controls live in the floating FilterPanel, not here.
 */
export function ExploreNavbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mode = useExploreStore((s) => s.mode);
  const setMode = useExploreStore((s) => s.setMode);
  const panelView = useExploreStore((s) => s.panelView);
  const setPanelView = useExploreStore((s) => s.setPanelView);
  const [query, setQuery] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`${ROUTES.AiSearch}?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className='pointer-events-auto flex items-center justify-between gap-3 border-b border-slate-light/30 bg-mist/95 px-4 py-2 shadow-sm backdrop-blur sm:px-6'>
      <div className='flex min-w-0 shrink-0 items-center gap-3'>
        <Link
          to='/'
          className='shrink-0 text-lg font-extrabold tracking-tight text-marine'
        >
          동네탐색<span className='text-terracotta'>.</span>
        </Link>
        <ModeToggle
          mode={mode}
          onChange={setMode}
          criteriaLabel={t('explore.modeCriteria')}
          preferenceLabel={t('explore.modePreference')}
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className='hidden min-w-0 max-w-sm flex-1 items-center gap-2 rounded-full border border-slate-light/40 bg-white px-4 py-1.5 text-sm shadow-sm transition-colors focus-within:border-terracotta/40 md:flex'
      >
        <Search className='size-4 shrink-0 text-terracotta' />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('explore.searchPillPlaceholder')}
          aria-label={t('explore.searchPillPlaceholder')}
          className='min-w-0 flex-1 bg-transparent text-marine placeholder:text-slate-light focus:outline-none'
        />
        {query.trim() && (
          <button
            type='submit'
            aria-label={t('explore.searchSubmit')}
            className='shrink-0 rounded-full bg-terracotta p-1 text-white transition-colors hover:bg-terracotta-dark'
          >
            <ArrowRight className='size-3.5' />
          </button>
        )}
      </form>

      <div className='flex shrink-0 items-center gap-2'>
        <button
          type='button'
          aria-pressed={panelView === 'saved'}
          onClick={() => setPanelView(panelView === 'saved' ? 'results' : 'saved')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            panelView === 'saved' ? 'bg-marine text-mist' : 'text-marine/70 hover:bg-marine/10',
          )}
        >
          <Heart className={cn('size-4', panelView === 'saved' && 'fill-mist')} />
          <span className='hidden sm:inline'>{t('nav.savedLabel')}</span>
        </button>
        <Link
          to='/life-match'
          className='flex items-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-1.5 text-sm font-semibold text-terracotta-dark transition-colors hover:bg-terracotta/20'
        >
          <Sparkles className='size-4' />
          <span className='hidden lg:inline'>{t('lifeMatch.navLabel')}</span>
        </Link>
        <Link
          to='/policy'
          className='flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-marine/70 transition-colors hover:bg-marine/10'
        >
          <BarChart3 className='size-4' />
          <span className='hidden xl:inline'>{t('policy.navLabel')}</span>
        </Link>
        <Link
          to='/about'
          className='flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-marine/70 transition-colors hover:bg-marine/10'
        >
          <Info className='size-4' />
          <span className='hidden sm:inline'>{t('nav.aboutLabel')}</span>
        </Link>
        <UserMenu />
        <LanguageMenu />
      </div>
    </div>
  );
}
