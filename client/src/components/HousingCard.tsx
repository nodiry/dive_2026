import type { HousingSummary } from '@shared';
import { Heart } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { housingDetailPath } from '@constants/path';
import { formatWon } from '@utils/money';

interface HousingCardProps {
  housing: HousingSummary;
  /** Slot for extra content below the core info — e.g. the match-breakdown tag strip on preference-mode results. */
  children?: ReactNode;
  /** When provided, clicking the card selects it (e.g. on the map) instead of navigating straight to the detail page. */
  onSelect?: () => void;
  selected?: boolean;
  saved?: boolean;
  onToggleSave?: () => void;
  /** 'panel' = vertical list sizing (default); 'rail' = fixed-width card for the bottom horizontal rail. */
  variant?: 'panel' | 'rail';
}

export function HousingCard({
  housing,
  children,
  onSelect,
  selected,
  saved,
  onToggleSave,
  variant = 'panel',
}: HousingCardProps) {
  const { t } = useTranslation();

  function handleToggleSave(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave?.();
  }

  const body = (
    <>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <span className='inline-block rounded-full bg-marine/10 px-2.5 py-0.5 text-xs font-medium text-marine'>
            {t(`housingType.${housing.type}`)}
          </span>
          <h3 className='mt-2 truncate text-base font-bold text-marine'>{housing.projectName}</h3>
          <p className='mt-0.5 truncate text-sm text-slate'>{housing.address}</p>
        </div>
        {onToggleSave && (
          <button
            type='button'
            onClick={handleToggleSave}
            aria-label={saved ? t('saved.unsaveLabel') : t('saved.saveLabel')}
            aria-pressed={saved}
            className='shrink-0 rounded-full p-1 text-slate-light transition-colors hover:text-terracotta'
          >
            <Heart className={`size-5 ${saved ? 'fill-terracotta text-terracotta' : ''}`} />
          </button>
        )}
      </div>

      <div className='mt-3 flex items-baseline gap-3 font-mono text-sm'>
        <span className='min-w-0 truncate text-marine'>
          <span className='mr-1 font-sans text-xs text-slate-light'>
            {t('housingCard.deposit')}
          </span>
          {formatWon(housing.minDeposit)}
        </span>
        <span className='min-w-0 truncate text-slate'>
          <span className='mr-1 font-sans text-xs text-slate-light'>{t('housingCard.rent')}</span>
          {formatWon(housing.minRent)}
        </span>
        {onSelect && (
          <Link
            to={housingDetailPath(housing.id)}
            onClick={(e) => e.stopPropagation()}
            className='ml-auto shrink-0 font-sans text-sm font-medium whitespace-nowrap text-terracotta-dark hover:underline'
          >
            {t('explore.detailLink')}
          </Link>
        )}
      </div>
      {children}
    </>
  );

  const className = `block rounded-2xl border bg-white transition-colors ${
    variant === 'rail' ? 'w-[300px] shrink-0 snap-start p-3.5' : 'p-4'
  } ${selected ? 'border-terracotta/60' : 'border-slate-light/30 hover:border-terracotta/40'}`;

  // The body can contain nested interactive elements (the save button, the
  // detail Link) — the outer wrapper must not be a <button> or <a> itself
  // (invalid HTML: interactive content can't nest inside interactive
  // content), so it's a div with a button role whenever it's clickable.
  if (onSelect || onToggleSave) {
    return (
      <div
        role='button'
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`${className} ${onSelect ? 'cursor-pointer' : ''}`}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      to={housingDetailPath(housing.id)}
      className={className}
    >
      {body}
    </Link>
  );
}
