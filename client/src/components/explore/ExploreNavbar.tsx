import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ModeToggle } from '@components/explore/ModeToggle';
import { NavActions } from '@layout/NavActions';
import { useExploreStore } from '@stores/useExploreStore';

/**
 * Single-row header: brand, mode toggle, the center search pill (which
 * becomes the natural-language input in a later phase), and the shared
 * NavActions cluster. All filter controls live in the floating
 * FilterPanel, not here.
 */
export function ExploreNavbar() {
  const { t } = useTranslation();
  const mode = useExploreStore((s) => s.mode);
  const setMode = useExploreStore((s) => s.setMode);

  return (
    <div className='pointer-events-auto flex items-center justify-between gap-3 border-b border-slate-light/30 bg-lilac/95 px-4 py-2 shadow-sm backdrop-blur sm:px-6'>
      <div className='flex min-w-0 shrink-0 items-center gap-3'>
        <Link
          to='/'
          className='shrink-0 text-lg font-extrabold tracking-tight text-plum'
        >
          동네탐색<span className='text-violet'>.</span>
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
        <Search className='size-4 shrink-0 text-violet' />
        <span className='truncate text-slate-light'>{t('explore.searchPillPlaceholder')}</span>
      </div>

      <NavActions />
    </div>
  );
}
