import type { HousingSummary } from "@dive2026/shared";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useLocale } from "../lib/i18n/localeContext";
import { formatWon } from "../lib/format";

interface HousingCardProps {
  housing: HousingSummary;
  /** Slot for extra content below the core info — e.g. the match-breakdown tag strip on Recommend results. */
  children?: ReactNode;
}

export function HousingCard({ housing, children }: HousingCardProps) {
  const { t } = useLocale();

  return (
    <Link
      to={`/housing/${housing.id}`}
      className="block rounded-2xl border border-slate-light/30 bg-white/60 p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-marine/10 px-2.5 py-0.5 text-xs font-medium text-marine">
            {t.housingType[housing.type]}
          </span>
          <h3 className="mt-2 truncate text-lg font-bold text-marine">{housing.projectName}</h3>
          <p className="truncate text-sm text-slate">{housing.address}</p>
        </div>
        <div className="shrink-0 text-right font-mono text-sm">
          <div className="text-marine">
            {t.housingCard.deposit} {formatWon(housing.minDeposit)}
          </div>
          <div className="text-slate">
            {t.housingCard.rent} {formatWon(housing.minRent)}
          </div>
        </div>
      </div>
      {children}
    </Link>
  );
}
