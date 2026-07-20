import { POI_ICON_KEYS, type PoiIconKey, POI_ICON_GLYPHS } from "../../lib/poiIcons";
import { useLocale } from "../../lib/i18n/localeContext";

interface PreferenceCategoryBarProps {
  selected: Set<PoiIconKey>;
  onToggle: (key: PoiIconKey) => void;
}

/**
 * Kakao-Maps-mobile-style icon row. Multi-select, no per-category
 * weight/priority UI in v1 — every selected category is submitted at an
 * equal default weight (see Explore.tsx). Only real, data-backed
 * categories are offered — see lib/poiIcons.ts.
 */
export function PreferenceCategoryBar({ selected, onToggle }: PreferenceCategoryBarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {POI_ICON_KEYS.map((key) => {
        const Icon = POI_ICON_GLYPHS[key];
        const isSelected = selected.has(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? "border-terracotta bg-terracotta text-white"
                : "border-slate-light/40 bg-white text-marine hover:border-terracotta/50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t.poiCategoryLabels[key]}
          </button>
        );
      })}
    </div>
  );
}
