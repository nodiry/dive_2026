import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Section } from '@components/explore/controls';
import Select from '@components/ui/Select';
import { DISTRICTS } from '@constants/districts';
import { cn } from '@utils/cn';
import { HOUSING_TYPE_VALUES } from '@utils/filters';
import {
  DESTINATIONS,
  ROUTINE_KEYS,
  ROUTINE_PRESETS,
  deriveLifeStats,
  type DestinationId,
  type LifeProfile,
  type RoutineKey,
  type WeeklyRoutine,
} from './model';

interface LifeProfilePanelProps {
  profile: LifeProfile;
  routine: WeeklyRoutine;
  onProfileChange: (profile: LifeProfile) => void;
  onRoutineChange: (routine: WeeklyRoutine) => void;
}

const PRESET_KEYS = ['balanced', 'work', 'active', 'home'] as const;

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: string) => void;
  display?: string;
}) {
  return (
    <label className='block'>
      <span className='flex items-baseline justify-between gap-2'>
        <span className='text-xs font-medium text-plum'>{label}</span>
        <span className='font-mono text-xs text-slate'>{display ?? value}</span>
      </span>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={Number(value) || min}
        onChange={(event) => onChange(event.target.value)}
        className='range mt-1.5 w-full'
      />
    </label>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className='flex items-center gap-3'>
      <span className='w-12 shrink-0 font-mono text-xs text-slate'>{label}</span>
      <div className='h-1.5 flex-1 rounded-full bg-lilac-dim'>
        <div
          className={cn('h-1.5 rounded-full', color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className='w-8 shrink-0 text-right font-mono text-xs text-plum'>{value}</span>
    </div>
  );
}

export function LifeProfilePanel({
  profile,
  routine,
  onProfileChange,
  onRoutineChange,
}: LifeProfilePanelProps) {
  const { t } = useTranslation();
  const stats = deriveLifeStats(routine);
  const set = <K extends keyof LifeProfile>(key: K, value: LifeProfile[K]) =>
    onProfileChange({ ...profile, [key]: value });
  const updateActivity = (key: RoutineKey, delta: number) =>
    onRoutineChange({ ...routine, [key]: Math.max(0, Math.min(7, routine[key] + delta)) });

  return (
    <div className='space-y-5 rounded-2xl border border-slate-light/30 bg-white p-5'>
      <Section label={t('lifeMatch.budget')}>
        <div className='space-y-3'>
          <SliderRow
            label={t('lifeMatch.depositMax')}
            value={profile.depositMaxManwon}
            min={500}
            max={10000}
            step={100}
            onChange={(value) => set('depositMaxManwon', value)}
          />
          <SliderRow
            label={t('lifeMatch.rentMax')}
            value={profile.rentMaxManwon}
            min={5}
            max={100}
            step={1}
            onChange={(value) => set('rentMaxManwon', value)}
          />
        </div>
      </Section>

      <Section label={t('lifeMatch.home')}>
        <div className='space-y-3'>
          <SliderRow
            label={t('lifeMatch.minArea')}
            value={profile.minAreaM2}
            min={10}
            max={85}
            step={1}
            display={`${profile.minAreaM2 || 10}㎡`}
            onChange={(value) => set('minAreaM2', value)}
          />
          <SliderRow
            label={t('lifeMatch.minRooms')}
            value={profile.minRoomCount}
            min={1}
            max={5}
            step={1}
            onChange={(value) => set('minRoomCount', value)}
          />
          <div className='grid grid-cols-2 gap-2.5'>
            <label className='block'>
              <span className='mb-1 block text-xs font-medium text-slate'>
                {t('explore.districtLabel')}
              </span>
              <Select
                value={profile.district}
                onChange={(value) => set('district', value)}
                ariaLabel={t('explore.districtLabel')}
                options={[
                  { value: '', label: t('explore.districtAll') },
                  ...DISTRICTS.map((district) => ({
                    value: district,
                    label: t(`districts.${district}`),
                  })),
                ]}
              />
            </label>
            <label className='block'>
              <span className='mb-1 block text-xs font-medium text-slate'>
                {t('explore.typeLabel')}
              </span>
              <Select
                value={profile.type}
                onChange={(value) => set('type', value as LifeProfile['type'])}
                ariaLabel={t('explore.typeLabel')}
                options={[
                  { value: '', label: t('explore.typeAll') },
                  ...HOUSING_TYPE_VALUES.map((type) => ({
                    value: type,
                    label: t(`housingType.${type}`),
                  })),
                ]}
              />
            </label>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {(
              [
                ['elevatorRequired', t('lifeMatch.elevator')],
                ['parkingRequired', t('lifeMatch.parking')],
                ['hasVehicle', t('lifeMatch.vehicle')],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type='button'
                aria-pressed={profile[key]}
                onClick={() => set(key, !profile[key])}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  profile[key]
                    ? 'border-violet/40 bg-violet/10 text-violet-dark'
                    : 'border-slate-light/40 bg-white text-slate hover:border-violet/40',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section label={t('lifeMatch.location')}>
        <div className='space-y-3'>
          <label className='block'>
            <span className='mb-1 block text-xs font-medium text-slate'>
              {t('lifeMatch.destination')}
            </span>
            <Select
              value={profile.destinationId}
              onChange={(value) => set('destinationId', value)}
              ariaLabel={t('lifeMatch.destination')}
              options={Object.keys(DESTINATIONS).map((id) => ({
                value: id,
                label: t(`lifeMatch.destinationOptions.${id as DestinationId}`),
              }))}
            />
          </label>
          <SliderRow
            label={t('lifeMatch.destinationFrequency')}
            value={profile.destinationFrequency}
            min={0}
            max={7}
            step={1}
            display={t('lifeMatch.perWeekCount', {
              count: Number(profile.destinationFrequency) || 0,
            })}
            onChange={(value) => set('destinationFrequency', value)}
          />
          <p className='text-xs text-slate-light'>{t('lifeMatch.destinationNote')}</p>
        </div>
      </Section>

      <Section label={t('lifeMatch.routineTitle')}>
        <div className='mb-3 flex flex-wrap gap-1.5'>
          {PRESET_KEYS.map((key) => (
            <button
              key={key}
              type='button'
              onClick={() => onRoutineChange({ ...ROUTINE_PRESETS[key] })}
              className='rounded-full border border-slate-light/40 bg-white px-3 py-1.5 text-xs font-medium text-slate transition-colors hover:border-violet/40 hover:text-violet-dark'
            >
              {t(`lifeMatch.presets.${key}`)}
            </button>
          ))}
        </div>
        <div className='space-y-1.5'>
          {ROUTINE_KEYS.map((key) => (
            <div
              key={key}
              className='flex items-center justify-between gap-2'
            >
              <span className='min-w-0 flex-1 truncate text-xs font-medium text-plum'>
                {t(`lifeMatch.activities.${key}`)}
              </span>
              <div className='flex shrink-0 items-center gap-1.5'>
                <button
                  type='button'
                  aria-label={`${t(`lifeMatch.activities.${key}`)} -1`}
                  onClick={() => updateActivity(key, -1)}
                  className='flex size-6 items-center justify-center rounded-full border border-slate-light/40 text-slate transition-colors hover:border-violet/40 hover:text-violet'
                >
                  <Minus className='size-3' />
                </button>
                <span className='w-4 text-center font-mono text-xs font-bold text-plum'>
                  {routine[key]}
                </span>
                <button
                  type='button'
                  aria-label={`${t(`lifeMatch.activities.${key}`)} +1`}
                  onClick={() => updateActivity(key, 1)}
                  className='flex size-6 items-center justify-center rounded-full border border-slate-light/40 text-slate transition-colors hover:border-violet/40 hover:text-violet'
                >
                  <Plus className='size-3' />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section label={t('lifeMatch.statsTitle')}>
        <div className='space-y-2'>
          <StatRow
            label={t('lifeMatch.fun')}
            value={stats.fun}
            color='bg-violet'
          />
          <StatRow
            label={t('lifeMatch.work')}
            value={stats.work}
            color='bg-plum'
          />
          <StatRow
            label={t('lifeMatch.rest')}
            value={stats.rest}
            color='bg-gold'
          />
        </div>
      </Section>
    </div>
  );
}
