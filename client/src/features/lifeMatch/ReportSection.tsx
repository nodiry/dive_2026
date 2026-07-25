import type { ReactNode } from 'react';
import { cn } from '@utils/cn';

/**
 * The report's spine. Life Match used to stack four unrelated cards; the rule
 * and its nodes tie the arcana, the week it inferred, the ranked matches, and
 * the conditions into one reading you scroll top to bottom.
 */
export function ReportSpine({ children }: { children: ReactNode }) {
  return (
    <div className='relative'>
      <span
        aria-hidden
        className='absolute top-3 bottom-3 left-[5px] w-px bg-slate-light/25'
      />
      <div className='space-y-10'>{children}</div>
    </div>
  );
}

const NODE_TONES = {
  arcana: 'bg-gold',
  primary: 'bg-violet',
  quiet: 'bg-slate-light',
} as const;

export function ReportSection({
  eyebrow,
  aside,
  tone = 'primary',
  children,
}: {
  eyebrow: string;
  /** Right-aligned counterpart to the eyebrow: a count, a status, an action. */
  aside?: ReactNode;
  tone?: keyof typeof NODE_TONES;
  children: ReactNode;
}) {
  return (
    <section className='relative pl-6 sm:pl-8'>
      <span
        aria-hidden
        className={cn(
          'absolute top-1.5 left-0 size-2.5 rounded-full ring-3 ring-lilac',
          NODE_TONES[tone],
        )}
      />
      <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
        <h2 className='font-mono text-xs tracking-wide text-slate uppercase'>{eyebrow}</h2>
        {aside}
      </div>
      <div className='mt-3'>{children}</div>
    </section>
  );
}
