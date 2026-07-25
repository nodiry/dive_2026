import { Building2, CircleParking, Database, MapPin, MoveUp, TriangleAlert } from "lucide-react";
import type { HousingSummary, HousingType } from '@shared';
import { useMemo } from "react";
import { useLocale } from "../lib/i18n/localeContext";
import { useHousingSearch } from '@hooks/useHousing';

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function yearOf(housing: HousingSummary) {
  const year = Number(housing.builtDate?.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function Policy() {
  const { t } = useLocale();
  const housing = useHousingSearch({}, true);
  const metrics = useMemo(() => {
    const rows = housing.data ?? [];
    const byType = rows.reduce<Record<HousingType, number>>(
      (counts, row) => ({ ...counts, [row.type]: counts[row.type] + 1 }),
      { purchased: 0, redevelopment: 0, integrated: 0, happy: 0 },
    );
    return {
      rows,
      byType,
      geocoded: rows.filter((row) => row.lat != null && row.lng != null).length,
      elevatorGap: rows.filter((row) => row.hasElevator !== true).length,
      parkingGap: rows.filter((row) => (row.parkingSpots ?? 0) <= 0).length,
      olderStock: rows.filter((row) => {
        const year = yearOf(row);
        return year != null && year < 2000;
      }).length,
    };
  }, [housing.data]);

  if (housing.isPending) return <p className="mx-auto max-w-5xl px-6 py-16 text-slate">{t.policy.loading}</p>;
  if (housing.isError) return <p className="mx-auto max-w-5xl px-6 py-16 text-terracotta-dark">{t.policy.error}</p>;

  const total = metrics.rows.length;
  const cards = [
    [t.policy.totalProjects, total, Database],
    [t.policy.geocodedCoverage, `${percent(metrics.geocoded, total)}%`, MapPin],
    [t.policy.elevatorGap, metrics.elevatorGap, MoveUp],
    [t.policy.parkingGap, metrics.parkingGap, CircleParking],
  ] as const;
  const readiness = [
    [t.policy.missingLocation, total - metrics.geocoded, "bg-terracotta"],
    [t.policy.noElevator, metrics.elevatorGap, "bg-gold"],
    [t.policy.noParking, metrics.parkingGap, "bg-marine-light"],
    [t.policy.olderStock, metrics.olderStock, "bg-slate"],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-black tracking-tight text-marine sm:text-5xl">{t.policy.title}</h1>
        <p className="mt-4 text-base leading-7 text-slate">{t.policy.intro}</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-light/30 bg-white/65 px-4 py-3 text-xs text-slate">
          <Database className="h-4 w-4 text-terracotta" /> {t.policy.actualDataNote}
        </p>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <article key={label} className="rounded-3xl border border-slate-light/30 bg-white/70 p-6 shadow-sm">
            <Icon className="h-5 w-5 text-terracotta" />
            <strong className="mt-6 block font-mono text-3xl text-marine">{value}</strong>
            <span className="mt-1 block text-sm text-slate">{label}</span>
          </article>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-slate-light/30 bg-white/70 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-terracotta" />
            <h2 className="text-xl font-bold text-marine">{t.policy.stockByType}</h2>
          </div>
          <div className="mt-7 space-y-5">
            {(Object.entries(metrics.byType) as [HousingType, number][]).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-marine">{t.housingType[type]}</span>
                  <strong className="font-mono">{count}</strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist-dim">
                  <div className="h-full rounded-full bg-terracotta" style={{ width: `${percent(count, total)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-marine p-6 text-mist sm:p-8">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-1 h-5 w-5 text-gold" />
            <div>
              <h2 className="text-xl font-bold">{t.policy.readinessTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-mist/65">{t.policy.readinessDescription}</p>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {readiness.map(([label, count, color]) => (
              <div key={label} className="rounded-2xl bg-white/8 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>{label}</span>
                  <strong className="font-mono">{count}</strong>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${percent(count, total)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-3xl border border-slate-light/30 bg-white/70 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-marine">{t.policy.actionTitle}</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {t.policy.actions.map((action, index) => (
            <li key={action} className="rounded-2xl bg-mist p-5 text-sm leading-6 text-slate">
              <span className="mb-3 block font-mono text-xs text-terracotta">0{index + 1}</span>
              {action}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
