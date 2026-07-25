import { ArrowRight, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ModeToggle } from '@components/explore/ModeToggle';
import { ROUTES } from '@constants/path';
import { NavActions } from '@layout/NavActions';
import { useExploreStore } from '@stores/useExploreStore';

/**
 * Single-row header: brand, mode toggle, the center AI search pill, and the
 * shared NavActions cluster. All filter controls live in the floating
 * FilterPanel, not here.
 */
export function ExploreNavbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mode = useExploreStore((s) => s.mode);
  const setMode = useExploreStore((s) => s.setMode);
  const [query, setQuery] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`${ROUTES.AiSearch}?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className='pointer-events-auto relative z-30 flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-slate-light/30 bg-lilac/95 px-4 py-2 shadow-sm backdrop-blur sm:px-6'>
      <div className='flex min-w-0 shrink-0 items-center gap-3'>
        <Link
          to='/'
          className='shrink-0 text-lg font-extrabold tracking-tight text-plum select-none'
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

      <form
        onSubmit={handleSubmit}
        className='hidden min-w-0 max-w-sm flex-1 items-center gap-2 rounded-full border border-slate-light/40 bg-white px-4 py-1.5 text-sm shadow-sm transition-colors focus-within:border-violet/40 md:flex'
      >
        <Search className='size-4 shrink-0 text-violet' />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('explore.searchPillPlaceholder')}
          aria-label={t('explore.searchPillPlaceholder')}
          className='min-w-0 flex-1 bg-transparent text-plum placeholder:text-slate-light focus:outline-none'
        />
        {query.trim() && (
          <button
            type='submit'
            aria-label={t('explore.searchSubmit')}
            className='shrink-0 rounded-full bg-violet p-1 text-white transition-colors hover:bg-violet-dark'
          >
            <ArrowRight className='size-3.5' />
          </button>
        )}
      </form>

      <NavActions />
    </div>
  );
}
