import type { HousingAlert } from '@shared';
import type { TFunction } from 'i18next';
import { MapPinned, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatWon } from '@utils/money';

/** The stored criteria, read back as the sentence the user effectively asked for. */
function criteriaChips(alert: HousingAlert, t: TFunction): string[] {
  const { criteria } = alert;
  return [
    criteria.district ?? t('explore.districtAll'),
    criteria.type ? t(`housingType.${criteria.type}`) : null,
    criteria.depositMax != null
      ? t('housingAlerts.criteriaDeposit', { amount: formatWon(criteria.depositMax) })
      : null,
    criteria.builtAfter != null
      ? t('housingAlerts.criteriaBuilt', { year: criteria.builtAfter })
      : null,
    criteria.roomCount != null
      ? t('housingAlerts.criteriaRooms', { count: criteria.roomCount })
      : null,
  ].filter((chip): chip is string => Boolean(chip));
}

/**
 * The alerts a user subscribed to from the AI chat, shown on the map screen
 * where they can act on them: every alert is a search that found nothing, so
 * the useful verb is "run it on the map", not just "delete it".
 */
export function AlertRow({
  alert,
  cancelling,
  onApply,
  onCancel,
}: {
  alert: HousingAlert;
  cancelling: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const chips = criteriaChips(alert, t);

  return (
    /*
      Dotted rather than solid: an alert is a standing request for housing that
      does not exist yet, so a provisional edge reads truer than the solid card
      a real listing gets. Higher alpha than the solid borders elsewhere because
      only part of a dotted perimeter is inked, so it lands lighter.
    */
    <article className='rounded-2xl border border-dotted border-slate-light/50 bg-white p-4'>
      <div className='flex flex-wrap gap-1.5'>
        {chips.map((chip) => (
          <span
            key={chip}
            className='rounded-full border border-dotted border-slate-light/50 bg-lilac px-2.5 py-1 text-xs text-plum'
          >
            {chip}
          </span>
        ))}
      </div>
      <div className='mt-3 flex items-center justify-between gap-2'>
        <span className='font-mono text-xs text-slate-light'>
          {new Date(alert.createdAt).toLocaleDateString()}
        </span>
        <div className='flex items-center gap-1.5'>
          <button
            type='button'
            onClick={onApply}
            className='flex items-center gap-1.5 rounded-full border border-slate-light/40 px-3 py-1.5 text-xs font-medium text-plum transition-colors hover:border-violet/40 hover:text-violet-dark'
          >
            <MapPinned className='size-3.5' />
            {t('housingAlerts.applyFilters')}
          </button>
          <button
            type='button'
            aria-label={t('housingAlerts.cancel')}
            title={t('housingAlerts.cancel')}
            disabled={cancelling}
            onClick={onCancel}
            className='rounded-full p-1.5 text-slate-light transition-colors hover:text-violet disabled:opacity-40'
          >
            <Trash2 className='size-4' />
          </button>
        </div>
      </div>
    </article>
  );
}
