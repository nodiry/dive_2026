import type { HousingSummary } from '@shared';
import { Heart } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Roadview } from '@components/Roadview';
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

  const geocoded = housing.lat != null && housing.lng != null;

  const body = (
    <>
      {geocoded && (
        <Roadview
          lat={housing.lat ?? NaN}
          lng={housing.lng ?? NaN}
          className={
            variant === 'rail'
              ? '-mx-3.5 -mt-3.5 mb-3 h-24 rounded-t-2xl'
              : '-mx-4 -mt-4 mb-3 h-28 rounded-t-2xl'
          }
        />
      )}
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <span className='inline-block rounded-full bg-plum/10 px-2.5 py-0.5 text-xs font-medium text-plum'>
            {t(`housingType.${housing.type}`)}
          </span>
          <h3 className='mt-2 truncate text-base font-bold text-plum'>{housing.projectName}</h3>
          <p className='mt-0.5 truncate text-sm text-slate'>{housing.address}</p>
          {housing.maxAreaM2 != null || housing.maxRooms != null ? (
            <p className='mt-1 font-mono text-xs text-slate'>
              {housing.maxAreaM2 != null ? `${housing.maxAreaM2}㎡` : ''}
              {housing.maxAreaM2 != null && housing.maxRooms != null ? ' · ' : ''}
              {housing.maxRooms != null ? `${t('explore.roomCountLabel')} ${housing.maxRooms}` : ''}
            </p>
          ) : null}
        </div>
        {onToggleSave && (
          <button
            type='button'
            onClick={handleToggleSave}
            aria-label={saved ? t('saved.unsaveLabel') : t('saved.saveLabel')}
            aria-pressed={saved}
            className='shrink-0 rounded-full p-1 text-slate-light transition-colors hover:text-violet'
          >
            <Heart className={`size-5 ${saved ? 'fill-violet text-violet' : ''}`} />
          </button>
        )}
      </div>

      <div className='mt-3 flex items-baseline gap-3 font-mono text-sm'>
        <span className='min-w-0 truncate text-plum'>
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
            className='ml-auto shrink-0 font-sans text-sm font-medium whitespace-nowrap text-violet-dark hover:underline'
          >
            {t('explore.detailLink')}
          </Link>
        )}
      </div>
      {children}
    </>
  );

  // Selection reads through the border and ring only: the card surface stays
  // opaque white because these also float directly over the map (the AI
  // chat's expanded view), where a translucent tint shows the map through it.
  const className = `block rounded-2xl border bg-white transition-colors ${
    variant === 'rail' ? 'w-[300px] shrink-0 snap-start p-3.5' : 'p-4'
  } ${
    selected
      ? 'border-violet ring-2 ring-violet/25'
      : 'border-slate-light/30 hover:border-violet/40'
  }`;

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
