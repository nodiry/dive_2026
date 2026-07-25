import { SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  CategoryChips,
  DepositInput,
  DistrictSelect,
  PanelCriteriaFields,
  PersonaChips,
  RadiusSlider,
  Section,
  WeightSliders,
} from '@components/explore/controls';
import { ModeToggle } from '@components/explore/ModeToggle';
import { useExploreStore } from '@stores/useExploreStore';
import { cn } from '@utils/cn';

interface FilterPanelProps {
  activeFilterCount: number;
}

/**
 * The floating, toggleable control card in the map's top-left corner.
 * Everything inside filters live — there is no search button anywhere.
 */
export function FilterPanel({ activeFilterCount }: FilterPanelProps) {
  const { t } = useTranslation();
  const mode = useExploreStore((s) => s.mode);
  const setMode = useExploreStore((s) => s.setMode);
  const open = useExploreStore((s) => s.panelOpen);
  const setOpen = useExploreStore((s) => s.setPanelOpen);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className='pointer-events-none absolute top-3 left-3 z-20 flex max-h-[calc(100%-1.5rem)] flex-col items-start gap-2'
    >
      {/*
        Mode and filters are the same question — "what am I searching for" — so
        they sit together on the map surface. The mode toggle used to live in
        the header, where its ~220px of fixed width squeezed the AI input.
      */}
      <div className='pointer-events-auto flex items-center gap-2'>
        <ModeToggle
          mode={mode}
          onChange={setMode}
          criteriaLabel={t('explore.modeCriteria')}
          preferenceLabel={t('explore.modePreference')}
          className='border border-slate-light/30 bg-lilac/95 shadow-lg backdrop-blur'
        />
        <button
          type='button'
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium shadow-lg backdrop-blur transition-all',
            open
              ? 'border-plum bg-plum text-lilac'
              : 'border-slate-light/30 bg-lilac/95 text-plum hover:border-violet/40',
          )}
        >
          {open ? <X className='size-4' /> : <SlidersHorizontal className='size-4' />}
          {t('explore.filtersLabel')}
          {!open && activeFilterCount > 0 && (
            <span className='flex size-5 items-center justify-center rounded-full bg-violet font-mono text-xs text-white'>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className='pointer-events-auto min-h-0 w-[340px] max-w-[calc(100vw-1.5rem)] space-y-4 overflow-y-auto rounded-2xl border border-slate-light/30 bg-lilac/95 p-4 shadow-lg backdrop-blur'
          >
            {mode === 'criteria' ? (
              <Section label={t('explore.filtersHeading')}>
                <PanelCriteriaFields />
              </Section>
            ) : (
              <>
                <Section label={t('explore.personasHeading')}>
                  <div className='flex flex-wrap gap-1.5'>
                    <PersonaChips />
                  </div>
                </Section>
                <Section label={t('explore.preferencesHeading')}>
                  <div className='flex flex-wrap gap-1.5'>
                    <CategoryChips />
                  </div>
                </Section>
                <WeightSliders />
                <RadiusSlider />
                <div className='grid grid-cols-2 gap-2.5'>
                  <DistrictSelect />
                  <DepositInput />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
