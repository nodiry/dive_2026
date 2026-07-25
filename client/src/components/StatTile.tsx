import { cn } from '@utils/cn';

export function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className='rounded-2xl border border-slate-light/30 bg-white p-4'>
      <div className='text-xs text-slate'>{label}</div>
      <div
        className={cn(
          'mt-1 truncate font-mono text-lg font-bold',
          accent ? 'text-violet-dark' : 'text-plum',
        )}
      >
        {value}
      </div>
    </div>
  );
}
