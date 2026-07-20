import type { HousingSummary } from "@dive2026/shared";
import { Heart } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router";
import { formatWon } from "../lib/format";
import { useLocale } from "../lib/i18n/localeContext";

interface HousingCardProps {
  housing: HousingSummary;
  /** Slot for extra content below the core info — e.g. the match-breakdown tag strip on preference-mode results. */
  children?: ReactNode;
  /** When provided, clicking the card selects it (e.g. on the map) instead of navigating straight to the detail page. */
  onSelect?: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
}

export function HousingCard({ housing, children, onSelect, saved, onToggleSave }: HousingCardProps) {
  const { t } = useLocale();

  function handleToggleSave(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave?.();
  }

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-marine/10 px-2.5 py-0.5 text-xs font-medium text-marine">
            {t.housingType[housing.type]}
          </span>
          <h3 className="mt-2 truncate text-lg font-bold text-marine">{housing.projectName}</h3>
          <p className="truncate text-sm text-slate">{housing.address}</p>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          <div className="text-right font-mono text-sm">
            <div className="text-marine">
              {t.housingCard.deposit} {formatWon(housing.minDeposit)}
            </div>
            <div className="text-slate">
              {t.housingCard.rent} {formatWon(housing.minRent)}
            </div>
          </div>
          {onToggleSave && (
            <button
              type="button"
              onClick={handleToggleSave}
              aria-label={saved ? t.saved.unsaveLabel : t.saved.saveLabel}
              aria-pressed={saved}
              className="shrink-0 rounded-full p-1 text-slate-light transition-colors hover:text-terracotta"
            >
              <Heart className={`h-5 w-5 ${saved ? "fill-terracotta text-terracotta" : ""}`} />
            </button>
          )}
        </div>
      </div>
      {children}
      {onSelect && (
        <Link
          to={`/housing/${housing.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-block text-sm font-medium text-terracotta-dark hover:underline"
        >
          {t.explore.detailLink}
        </Link>
      )}
    </>
  );

  const className = "block rounded-2xl border border-slate-light/30 bg-white/60 p-5 transition-shadow hover:shadow-md";

  // The body can contain nested interactive elements (the save button, the
  // detail Link) — the outer wrapper must not be a <button> or <a> itself
  // (invalid HTML: interactive content can't nest inside interactive
  // content), so it's a div with a button role whenever it's clickable.
  if (onSelect || onToggleSave) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (onSelect && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`${className} ${onSelect ? "cursor-pointer" : ""}`}
      >
        {body}
      </div>
    );
  }

  return (
    <Link to={`/housing/${housing.id}`} className={className}>
      {body}
    </Link>
  );
}
