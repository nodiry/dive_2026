import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@utils/cn';

interface ListPanelProps {
  heading: string;
  count?: number;
  /** Shows a pulsing dot while a search is in flight. */
  fetching?: boolean;
  /** Label + clear action shown while a map cluster filters the list. */
  clusterLabel?: string | null;
  onClearCluster?: () => void;
  children: ReactNode;
}

/**
 * The right-side vertical list — always visible, synced to the map
 * viewport, and narrowed further when a cluster bubble is clicked.
 */
export function ListPanel({
  heading,
  count,
  fetching,
  clusterLabel,
  onClearCluster,
  children,
}: ListPanelProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className='pointer-events-auto absolute top-3 right-3 bottom-3 z-10 flex w-[360px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-light/30 bg-lilac/95 shadow-lg backdrop-blur'
    >
      <header className='flex items-center gap-2 border-b border-slate-light/20 px-4 py-2.5'>
        <span
          aria-hidden
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            fetching ? 'animate-pulse bg-violet' : 'bg-slate-light/60',
          )}
        />
        <h2 className='text-sm font-bold text-plum'>{heading}</h2>
        {count !== undefined && <span className='font-mono text-xs text-slate'>{count}</span>}
        {clusterLabel && (
          <button
            type='button'
            onClick={onClearCluster}
            className='ml-auto flex items-center gap-1 rounded-full border border-violet/40 bg-violet/10 px-2.5 py-1 text-xs font-medium text-violet-dark transition-colors hover:bg-violet/20'
          >
            {clusterLabel}
            <X className='size-3' />
          </button>
        )}
      </header>
      <div className='min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3'>
        <AnimatePresence mode='popLayout'>{children}</AnimatePresence>
      </div>
    </motion.aside>
  );
}

interface ListItemProps {
  index: number;
  /** When it becomes true (pin click), the panel scrolls this card into view. */
  active?: boolean;
  children: ReactNode;
}

/**
 * Keeping the active card in view is not a one-shot scroll: selecting a pin
 * pans the map, the pan changes the viewport, and the re-filtered list then
 * springs to its new layout — which slides the card away from wherever the
 * first scroll left it. So it re-scrolls on reorder and again once the layout
 * animation settles.
 */
export function ListItem({ index, active, children }: ListItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const reveal = useCallback(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  useEffect(() => {
    if (active) reveal();
  }, [active, index, reveal]);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onLayoutAnimationComplete={() => {
        if (active) reveal();
      }}
      transition={{
        layout: { type: 'spring', bounce: 0.15, duration: 0.45 },
        duration: 0.2,
        delay: Math.min(index * 0.02, 0.15),
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}

export function ListSkeleton() {
  return (
    <div className='space-y-2.5'>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className='h-[108px] animate-pulse rounded-2xl border border-slate-light/20 bg-white/70'
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export function ListMessage({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error';
  children: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center rounded-2xl border-2 border-dashed bg-lilac-dim/90 p-4 text-sm',
        tone === 'error' ? 'border-violet/40 text-violet-dark' : 'border-slate-light/40 text-slate',
      )}
    >
      {children}
    </div>
  );
}
