import type { AiAction, HousingAlert, NoMatchContext } from '@shared';
import { BellRing, Check, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatWon } from '@utils/money';

interface AlertActionCardProps {
  messageId?: string;
  context: NoMatchContext;
  actions: AiAction[];
  activeAlert?: HousingAlert;
  subscribing: boolean;
  cancelling: boolean;
  onSubscribe: (messageId: string) => void;
  onCancel: (alertId: number) => void;
  onRelax: () => void;
}

export function AlertActionCard({
  messageId,
  context,
  actions,
  activeAlert,
  subscribing,
  cancelling,
  onSubscribe,
  onCancel,
  onRelax,
}: AlertActionCardProps) {
  const { t } = useTranslation();
  const canSubscribe =
    !!messageId && actions.some((action) => action.type === 'subscribe_housing_alert');
  const canRelax = actions.some((action) => action.type === 'relax_filters');
  if (!canSubscribe && !canRelax) return null;

  const criteria = context.criteria;
  const labels = [
    criteria.district,
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
  ].filter((label): label is string => !!label);

  return (
    <div className='border-t border-slate-light/20 bg-white/70 px-4 py-4'>
      <div className='flex items-start gap-3'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet-dark'>
          {activeAlert ? <Check className='size-4' /> : <BellRing className='size-4' />}
        </div>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold text-plum'>
            {activeAlert ? t('housingAlerts.subscribed') : t('housingAlerts.cardTitle')}
          </p>
          <p className='mt-1 text-xs leading-5 text-slate'>
            {context.reason === 'district_inventory_empty'
              ? t('housingAlerts.districtEmpty', { district: criteria.district })
              : t('housingAlerts.criteriaEmpty')}
          </p>
          {labels.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-1.5'>
              {labels.map((label) => (
                <span
                  key={label}
                  className='rounded-full bg-lilac px-2.5 py-1 text-xs text-slate'
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          <div className='mt-3 flex flex-wrap gap-2'>
            {activeAlert ? (
              <button
                type='button'
                disabled={cancelling}
                onClick={() => onCancel(activeAlert.id)}
                className='inline-flex items-center gap-1.5 rounded-full border border-slate-light/40 px-3 py-1.5 text-xs font-medium text-slate transition-colors hover:border-violet/40 hover:text-violet-dark disabled:opacity-50'
              >
                <Trash2 className='size-3.5' />
                {t('housingAlerts.cancel')}
              </button>
            ) : (
              canSubscribe &&
              messageId && (
                <button
                  type='button'
                  disabled={subscribing}
                  onClick={() => onSubscribe(messageId)}
                  className='inline-flex items-center gap-1.5 rounded-full bg-violet px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-dark disabled:opacity-50'
                >
                  <BellRing className='size-3.5' />
                  {subscribing ? t('housingAlerts.subscribing') : t('housingAlerts.subscribe')}
                </button>
              )
            )}
            {canRelax && (
              <button
                type='button'
                onClick={onRelax}
                className='inline-flex items-center gap-1.5 rounded-full border border-slate-light/40 px-3 py-1.5 text-xs font-medium text-slate transition-colors hover:border-violet/40 hover:text-violet-dark'
              >
                <RefreshCw className='size-3.5' />
                {t('housingAlerts.relax')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
