import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@utils/cn';

export type SelectOption = {
  value: string;
  label: string;
};

/**
 * The listbox renders in a body portal with fixed positioning — an
 * absolutely-positioned menu would be clipped by any scrollable ancestor
 * (e.g. the filter panel's overflow-y-auto).
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onScrollOrResize = (e: Event) => {
      if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  const pick = (option: SelectOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setMenuRect({ top: rect.bottom + 6, left: rect.left, width: rect.width });
      setHighlight(
        Math.max(
          0,
          options.findIndex((o) => o.value === value),
        ),
      );
    }
    setOpen((v) => !v);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleOpen();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const option = options[highlight];
      if (option) pick(option);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type='button'
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup='listbox'
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-full border border-slate-light/40 bg-white px-3.5 py-1.5 text-sm transition-colors hover:border-slate-light/70 disabled:pointer-events-none disabled:opacity-40',
          selected ? 'text-plum' : 'text-slate-light',
        )}
      >
        <span className='truncate'>{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-slate-light transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && menuRect && (
            <motion.ul
              ref={listRef}
              role='listbox'
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
              className='fixed z-50 max-h-64 min-w-32 overflow-y-auto rounded-2xl border border-slate-light/30 bg-white p-1.5 shadow-lg'
            >
              {options.map((option, i) => (
                <li key={option.value}>
                  <button
                    type='button'
                    role='option'
                    aria-selected={option.value === value}
                    onClick={() => pick(option)}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      'w-full rounded-full px-3 py-1.5 text-left text-sm transition-colors',
                      option.value === value
                        ? 'bg-violet/10 font-medium text-violet-dark'
                        : 'text-plum',
                      i === highlight && option.value !== value && 'bg-lilac',
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
