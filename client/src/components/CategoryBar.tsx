import { cn } from '@utils/cn';

export function CategoryBar({
  label,
  count,
  max,
  barClass = 'bg-violet',
  labelClass = 'w-24',
}: {
  label: string;
  count: number;
  max: number;
  barClass?: string;
  labelClass?: string;
}) {
  const ratio = max > 0 ? Math.max(count / max, 0.04) : 0;
  return (
    <div className='flex items-center gap-3'>
      <span className={cn('shrink-0 truncate text-xs font-medium text-plum', labelClass)}>
        {label}
      </span>
      <div className='h-1.5 flex-1 rounded-full bg-lilac-dim'>
        <div
          className={cn('h-1.5 rounded-full', barClass)}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <span className='w-10 shrink-0 text-right font-mono text-xs text-slate'>{count}</span>
    </div>
  );
}
