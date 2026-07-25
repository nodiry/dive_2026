import { motion } from 'motion/react';
import type { ExploreMode } from '@type/explore';
import { cn } from '@utils/cn';

interface ModeToggleProps {
  mode: ExploreMode;
  onChange: (mode: ExploreMode) => void;
  criteriaLabel: string;
  preferenceLabel: string;
  className?: string;
}

/**
 * A two-state scale, not two independent buttons: pressing one side always
 * turns the other off. The active pill slides between sides (shared
 * layoutId). `aria-pressed` reflects the mutual exclusivity.
 */
export function ModeToggle({
  mode,
  onChange,
  criteriaLabel,
  preferenceLabel,
  className,
}: ModeToggleProps) {
  const sides: { value: ExploreMode; label: string }[] = [
    { value: 'criteria', label: criteriaLabel },
    { value: 'preference', label: preferenceLabel },
  ];

  return (
    <div className={cn('flex items-center gap-1 rounded-full bg-lilac-dim p-1', className)}>
      {sides.map((side) => {
        const isActive = mode === side.value;
        return (
          <button
            key={side.value}
            type='button'
            aria-pressed={isActive}
            onClick={() => onChange(side.value)}
            className={cn(
              'relative flex-1 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
              isActive ? 'text-lilac' : 'text-plum/70 hover:bg-plum/10',
            )}
          >
            {isActive && (
              <motion.span
                layoutId='mode-toggle-indicator'
                transition={{ type: 'spring', bounce: 0.18, duration: 0.4 }}
                className='absolute inset-0 rounded-full bg-plum'
              />
            )}
            <span className='relative z-10'>{side.label}</span>
          </button>
        );
      })}
    </div>
  );
}
