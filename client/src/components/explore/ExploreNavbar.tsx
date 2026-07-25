import { ArrowRight, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/path';
import { NavActions } from '@layout/NavActions';

/**
 * Single-row header: brand, the AI search pill, and the shared NavActions
 * cluster. Every Explore control — mode, filters — lives on the map surface in
 * the floating FilterPanel, so the input keeps the row's spare width.
 */
export function ExploreNavbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`${ROUTES.AiSearch}?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className='pointer-events-auto relative z-30 flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-slate-light/30 bg-lilac/95 px-4 py-2 shadow-sm backdrop-blur sm:px-6'>
      {/*
        Brand and input share the left cluster so the pill reads as part of the
        brand's side of the row rather than floating in the middle. It still
        flexes with the window, but stops at a deliberate width: this asks one
        question, it is not a full-width omnibox.
      */}
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <Link
          to='/'
          className='shrink-0 text-lg font-extrabold tracking-tight text-plum select-none'
        >
          하루<span className='text-violet'>.</span>
        </Link>

        <form
          onSubmit={handleSubmit}
          className='hidden w-full min-w-0 max-w-sm items-center gap-2 rounded-full border border-slate-light/40 bg-white px-4 py-1.5 text-sm shadow-sm transition-colors focus-within:border-violet/40 md:flex'
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
      </div>

      <NavActions />
    </div>
  );
}
