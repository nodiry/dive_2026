import { Heart, Info, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ModeToggle } from '@components/explore/ModeToggle';
import { LanguageMenu } from '@layout/LanguageMenu';
import { UserMenu } from '@layout/UserMenu';
import { useExploreStore } from '@stores/useExploreStore';
import { cn } from '@utils/cn';

/**
 * Single-row header: brand, mode toggle, the center search pill (which
 * becomes the natural-language input in a later phase), and utilities.
 * All filter controls live in the floating FilterPanel, not here.
 */
export function ExploreNavbar() {
  const { t } = useTranslation();
  const mode = useExploreStore((s) => s.mode);
  const setMode = useExploreStore((s) => s.setMode);
  const panelView = useExploreStore((s) => s.panelView);
  const setPanelView = useExploreStore((s) => s.setPanelView);

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

      {/* Inert for now — reserved for the upcoming AI prompt-to-filters feature. */}
      <div className='hidden min-w-0 max-w-sm flex-1 items-center gap-2.5 rounded-full border border-slate-light/40 bg-white px-4 py-1.5 text-sm shadow-sm md:flex'>
        <Search className='size-4 shrink-0 text-terracotta' />
        <span className='truncate text-slate-light'>{t('explore.searchPillPlaceholder')}</span>
      </div>

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
