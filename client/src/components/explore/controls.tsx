import { BusFront, ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Select from '@components/ui/Select';
import { usePoiCategories } from '@hooks/usePoiCategories';
import { useExploreStore } from '@stores/useExploreStore';
import { cn } from '@utils/cn';
import { DISTRICTS } from '@constants/districts';
import { PERSONAS } from '@constants/personas';
import { poiCategoryLabel, poiColorForCategoryName, poiIconForCategoryName } from '@constants/poi';

export const inputClass =
  'rounded-full border border-slate-light/40 bg-white px-3.5 py-1.5 text-sm text-plum placeholder:text-slate-light transition-colors hover:border-slate-light/70';

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className='mb-2 block font-mono text-xs tracking-wide text-slate uppercase'>
        {label}
      </span>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className='block'>
      <span className='mb-1 block text-xs font-medium text-slate'>{label}</span>
      {children}
    </label>
  );
}

export function DistrictSelect() {
  const { t } = useTranslation();
  const filters = useExploreStore((s) => s.filters);
  const setFilters = useExploreStore((s) => s.setFilters);

  return (
    <Field label={t('explore.districtLabel')}>
      <Select
        ariaLabel={t('explore.districtLabel')}
        value={filters.district}
        onChange={(district) => setFilters({ ...filters, district })}
        placeholder={t('explore.districtAll')}
        options={[
          { value: '', label: t('explore.districtAll') },
          ...DISTRICTS.map((d) => ({ value: d, label: t(`districts.${d}`) })),
        ]}
      />
    </Field>
  );
}

export function DepositInput() {
  const { t } = useTranslation();
  const filters = useExploreStore((s) => s.filters);
  const setFilters = useExploreStore((s) => s.setFilters);

  return (
    <Field label={t('explore.depositMaxLabel')}>
      <input
        type='number'
        min={0}
        placeholder={t('explore.depositMaxPlaceholder')}
        value={filters.depositMaxManwon}
        onChange={(e) => setFilters({ ...filters, depositMaxManwon: e.target.value })}
        className={cn(inputClass, 'w-full font-mono')}
      />
    </Field>
  );
}

export function PersonaChips() {
  const { t } = useTranslation();
  const activePersona = useExploreStore((s) => s.activePersona);
  const selectPersona = useExploreStore((s) => s.selectPersona);

  return (
    <>
      {PERSONAS.map((persona) => {
        const Icon = persona.icon;
        const isActive = activePersona === persona.key;
        return (
          <button
            key={persona.key}
            type='button'
            aria-pressed={isActive}
            onClick={() => selectPersona(persona.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
              isActive ? 'bg-plum text-lilac shadow-sm' : 'bg-plum/5 text-plum/80 hover:bg-plum/10',
            )}
          >
            <Icon className='size-4' />
            {t(`personas.${persona.key}`)}
          </button>
        );
      })}
    </>
  );
}

// Default-visible slice of the full, popularity-sorted category list — the
// rest fold behind "show more" so 40-odd real categories don't overwhelm
// the panel on first open.
const TOP_CATEGORY_COUNT = 6;

export function CategoryChips() {
  const { t } = useTranslation();
  const weights = useExploreStore((s) => s.weights);
  const toggleCategory = useExploreStore((s) => s.toggleCategory);
  const categoriesQuery = usePoiCategories();
  const [expanded, setExpanded] = useState(false);

  const categories = [...(categoriesQuery.data ?? [])].sort((a, b) => b.count - a.count);
  const visible = expanded ? categories : categories.slice(0, TOP_CATEGORY_COUNT);
  const hiddenCount = categories.length - visible.length;

  return (
    <>
      {visible.map((c) => {
        const Icon = poiIconForCategoryName(c.categoryName);
        const color = poiColorForCategoryName(c.categoryName);
        const isSelected = weights[c.categoryName] !== undefined;
        return (
          <button
            key={c.categoryName}
            type='button'
            aria-pressed={isSelected}
            onClick={() => toggleCategory(c.categoryName)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
              isSelected
                ? 'border-violet/40 bg-violet/10 text-violet-dark shadow-sm'
                : 'border-slate-light/40 bg-white text-slate hover:border-violet/40',
            )}
          >
            <Icon
              className='size-4'
              style={isSelected ? undefined : { color }}
            />
            {poiCategoryLabel(c.categoryName, t)}
          </button>
        );
      })}
      {categories.length > TOP_CATEGORY_COUNT && (
        <button
          type='button'
          onClick={() => setExpanded((v) => !v)}
          className='flex items-center gap-1 rounded-full border border-dashed border-slate-light/40 px-3 py-1.5 text-sm font-medium text-slate hover:border-violet/40 hover:text-violet-dark'
        >
          {expanded ? (
            <>
              {t('explore.showFewerCategories')}
              <ChevronUp className='size-4' />
            </>
          ) : (
            <>
              {t('explore.showMoreCategories', { count: hiddenCount })}
              <ChevronDown className='size-4' />
            </>
          )}
        </button>
      )}
    </>
  );
}

export function WeightSliders() {
  const { t } = useTranslation();
  const weights = useExploreStore((s) => s.weights);
  const setCategoryWeight = useExploreStore((s) => s.setCategoryWeight);
  const selectedNames = Object.keys(weights);

  if (selectedNames.length === 0) return null;

  return (
    <div className='space-y-2.5 rounded-2xl border border-slate-light/30 bg-white p-3.5'>
      <span className='block text-xs font-medium text-slate'>{t('explore.weightHint')}</span>
      {selectedNames.map((categoryName) => {
        const label = poiCategoryLabel(categoryName, t);
        return (
          <div
            key={categoryName}
            className='flex items-center gap-2.5'
          >
            <span
              aria-hidden
              className='size-2 shrink-0 rounded-full'
              style={{ backgroundColor: poiColorForCategoryName(categoryName) }}
            />
            <span className='w-16 shrink-0 truncate text-xs font-medium text-plum'>{label}</span>
            <input
              type='range'
              min={10}
              max={100}
              step={5}
              aria-label={label}
              value={Math.round((weights[categoryName] ?? 1) * 100)}
              onChange={(e) => setCategoryWeight(categoryName, Number(e.target.value) / 100)}
              className='range flex-1'
            />
            <span className='w-9 shrink-0 text-right font-mono text-xs text-slate'>
              {Math.round((weights[categoryName] ?? 1) * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RadiusSlider() {
  const { t } = useTranslation();
  const radiusMeters = useExploreStore((s) => s.radiusMeters);
  const setRadiusMeters = useExploreStore((s) => s.setRadiusMeters);

  return (
    <div>
      <div className='mb-1 flex items-baseline justify-between'>
        <span className='text-xs font-medium text-slate'>{t('explore.radiusLabel')}</span>
        <span className='font-mono text-xs text-slate'>
          {t('units.radiusOption', { meters: radiusMeters })}
        </span>
      </div>
      <input
        type='range'
        min={100}
        max={1000}
        step={50}
        aria-label={t('explore.radiusLabel')}
        value={radiusMeters}
        onChange={(e) => setRadiusMeters(Number(e.target.value))}
        className='range'
      />
    </div>
  );
}

export function PanelCriteriaFields() {
  const { t } = useTranslation();
  const filters = useExploreStore((s) => s.filters);
  const setFilters = useExploreStore((s) => s.setFilters);

  return (
    <div className='grid grid-cols-2 gap-2.5'>
      <DepositInput />
      <DistrictSelect />
      <Field label={t('explore.roomCountLabel')}>
        <input
          type='number'
          min={1}
          placeholder={t('explore.roomCountPlaceholder')}
          value={filters.roomCount}
          onChange={(e) => setFilters({ ...filters, roomCount: e.target.value })}
          className={cn(inputClass, 'w-full font-mono')}
        />
      </Field>
      <Field label={t('explore.builtAfterLabel')}>
        <input
          type='number'
          min={1980}
          max={2026}
          placeholder={t('explore.builtAfterPlaceholder')}
          value={filters.builtAfter}
          onChange={(e) => setFilters({ ...filters, builtAfter: e.target.value })}
          className={cn(inputClass, 'w-full font-mono')}
        />
      </Field>
      <div className='col-span-2'>
        <Field label={t('explore.typeLabel')}>
          <Select
            ariaLabel={t('explore.typeLabel')}
            value={filters.type}
            onChange={(type) => setFilters({ ...filters, type })}
            placeholder={t('explore.typeAll')}
            options={[
              { value: '', label: t('explore.typeAll') },
              ...['purchased', 'redevelopment', 'integrated', 'happy'].map((v) => ({
                value: v,
                label: t(`housingType.${v}`),
              })),
            ]}
          />
        </Field>
      </div>
      <div className='col-span-2'>
        <button
          type='button'
          aria-pressed={filters.busStopNearby}
          onClick={() => setFilters({ ...filters, busStopNearby: !filters.busStopNearby })}
          className={cn(
            'flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
            filters.busStopNearby
              ? 'border-violet/40 bg-violet/10 text-violet-dark'
              : 'border-slate-light/40 bg-white text-slate hover:border-violet/40',
          )}
        >
          <BusFront className='size-4' />
          {t('explore.busStopNearby')}
        </button>
      </div>
    </div>
  );
}
