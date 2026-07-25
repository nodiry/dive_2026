import { Minus, Plus } from "lucide-react";
import type { Translations } from "../../lib/i18n/translations";
import {
  ROUTINE_KEYS,
  ROUTINE_PRESETS,
  type LifeStats,
  type RoutineKey,
  type WeeklyRoutine,
} from "./model";

interface WeeklyRoutineStepProps {
  routine: WeeklyRoutine;
  stats: LifeStats;
  onChange: (routine: WeeklyRoutine) => void;
  t: Translations;
}

const PRESET_KEYS = ["balanced", "work", "active", "home"] as const;

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-mono text-sm">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-mist-dim">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
export function WeeklyRoutineStep({ routine, stats, onChange, t }: WeeklyRoutineStepProps) {
  const copy = t.lifeMatch;
  const updateActivity = (key: RoutineKey, delta: number) => {
    onChange({ ...routine, [key]: Math.max(0, Math.min(7, routine[key] + delta)) });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-3xl border border-slate-light/30 bg-white/70 p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-extrabold text-marine">{copy.routineTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate">{copy.routineDescription}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {PRESET_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...ROUTINE_PRESETS[key] })}
              className="rounded-full border border-slate-light/40 bg-white px-4 py-2 text-sm font-medium text-marine transition hover:border-terracotta hover:text-terracotta-dark"
            >
              {copy.presets[key]}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ROUTINE_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between rounded-2xl border border-slate-light/25 bg-mist/60 p-4">
              <div>
                <p className="font-medium text-marine">{copy.activities[key]}</p>
                <p className="mt-1 font-mono text-xs text-slate">
                  {copy.perWeek} {routine[key]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`${copy.activities[key]} -1`}
                  onClick={() => updateActivity(key, -1)}
                  className="rounded-full border border-slate-light/40 bg-white p-2 text-slate transition hover:text-terracotta"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-5 text-center font-mono font-bold text-marine">{routine[key]}</span>
                <button
                  type="button"
                  aria-label={`${copy.activities[key]} +1`}
                  onClick={() => updateActivity(key, 1)}
                  className="rounded-full border border-slate-light/40 bg-white p-2 text-slate transition hover:text-terracotta"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-slate-light/30 bg-white/80 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-marine">{copy.statsTitle}</h3>
        <div className="mt-6 space-y-6">
          <StatBar label={copy.fun} value={stats.fun} color="bg-terracotta" />
          <StatBar label={copy.work} value={stats.work} color="bg-marine" />
          <StatBar label={copy.rest} value={stats.rest} color="bg-gold" />
        </div>
        <p className="mt-6 text-xs leading-5 text-slate">FUN + WORK + REST = 100</p>
      </aside>
    </div>
  );
}
