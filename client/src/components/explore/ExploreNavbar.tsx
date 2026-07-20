import { Bookmark, Info, Search } from "lucide-react";
import { Link } from "react-router";
import type { CriteriaFilters } from "../../lib/filters";
import { useLocale } from "../../lib/i18n/localeContext";
import { DISTRICTS } from "../../lib/i18n/translations";
import type { PoiIconKey } from "../../lib/poiIcons";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { CriteriaFilterBar } from "./CriteriaFilterBar";
import { ModeToggle, type ExploreMode } from "./ModeToggle";
import { PreferenceCategoryBar } from "./PreferenceCategoryBar";

const RADIUS_OPTIONS = [300, 500, 1000];

interface ExploreNavbarProps {
  mode: ExploreMode;
  onModeChange: (mode: ExploreMode) => void;
  /** Deposit + district are shared across both modes; criteria mode also reads roomCount/builtAfter/type from the same object. */
  criteriaFilters: CriteriaFilters;
  onCriteriaFiltersChange: (filters: CriteriaFilters) => void;
  selectedCategories: Set<PoiIconKey>;
  onToggleCategory: (key: PoiIconKey) => void;
  radiusMeters: number;
  onRadiusChange: (meters: number) => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
  submitting?: boolean;
  panelView: "results" | "saved";
  onPanelViewChange: (view: "results" | "saved") => void;
}

export function ExploreNavbar({
  mode,
  onModeChange,
  criteriaFilters,
  onCriteriaFiltersChange,
  selectedCategories,
  onToggleCategory,
  radiusMeters,
  onRadiusChange,
  onSubmit,
  submitDisabled,
  submitting,
  panelView,
  onPanelViewChange,
}: ExploreNavbarProps) {
  const { t } = useLocale();

  return (
    <div className="pointer-events-auto border-b border-slate-light/30 bg-mist/95 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="shrink-0 text-lg font-extrabold tracking-tight text-marine">
            동네탐색<span className="text-terracotta">.</span>
          </Link>
          <ModeToggle
            mode={mode}
            onChange={onModeChange}
            criteriaLabel={t.explore.modeCriteria}
            preferenceLabel={t.explore.modePreference}
          />
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          {mode === "criteria" ? (
            <CriteriaFilterBar filters={criteriaFilters} onChange={onCriteriaFiltersChange} />
          ) : (
            <>
              <PreferenceCategoryBar selected={selectedCategories} onToggle={onToggleCategory} />
              <select
                aria-label={t.explore.districtLabel}
                value={criteriaFilters.district}
                onChange={(e) => onCriteriaFiltersChange({ ...criteriaFilters, district: e.target.value })}
                className="rounded-lg border border-slate-light/50 bg-white px-2.5 py-1.5 text-sm"
              >
                <option value="">{t.explore.districtLabel}</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {t.districts[d]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                aria-label={t.explore.depositMaxLabel}
                placeholder={t.explore.depositMaxPlaceholder}
                value={criteriaFilters.depositMaxManwon}
                onChange={(e) => onCriteriaFiltersChange({ ...criteriaFilters, depositMaxManwon: e.target.value })}
                className="w-24 rounded-lg border border-slate-light/50 bg-white px-2.5 py-1.5 text-sm font-mono"
              />
              <select
                aria-label={t.explore.radiusLabel}
                value={radiusMeters}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="rounded-lg border border-slate-light/50 bg-white px-2.5 py-1.5 text-sm"
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {t.units.radiusOption(r)}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-terracotta px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Search className="h-4 w-4" />
            {submitting ? t.explore.submitting : t.explore.submit}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-pressed={panelView === "saved"}
            onClick={() => onPanelViewChange(panelView === "saved" ? "results" : "saved")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              panelView === "saved" ? "bg-marine text-mist" : "text-marine/70 hover:bg-marine/10"
            }`}
          >
            <Bookmark className="h-4 w-4" />
            {t.nav.savedLabel}
          </button>
          <Link
            to="/about"
            className="flex items-center gap-1 text-sm font-medium text-marine/70 hover:text-marine"
          >
            <Info className="h-4 w-4" />
            {t.nav.aboutLabel}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
