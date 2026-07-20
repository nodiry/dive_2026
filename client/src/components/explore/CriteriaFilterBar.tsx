import type { CriteriaFilters } from "../../lib/filters";
import { HOUSING_TYPE_VALUES } from "../../lib/filters";
import { useLocale } from "../../lib/i18n/localeContext";
import { DISTRICTS } from "../../lib/i18n/translations";

interface CriteriaFilterBarProps {
  filters: CriteriaFilters;
  onChange: (filters: CriteriaFilters) => void;
}

const inputClass = "w-24 rounded-lg border border-slate-light/50 bg-white px-2.5 py-1.5 text-sm font-mono";
const selectClass = "rounded-lg border border-slate-light/50 bg-white px-2.5 py-1.5 text-sm";

export function CriteriaFilterBar({ filters, onChange }: CriteriaFilterBarProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={0}
        aria-label={t.explore.depositMaxLabel}
        placeholder={t.explore.depositMaxPlaceholder}
        value={filters.depositMaxManwon}
        onChange={(e) => onChange({ ...filters, depositMaxManwon: e.target.value })}
        className={inputClass}
      />
      <select
        aria-label={t.explore.districtLabel}
        value={filters.district}
        onChange={(e) => onChange({ ...filters, district: e.target.value })}
        className={selectClass}
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
        min={1}
        aria-label={t.explore.roomCountLabel}
        placeholder={t.explore.roomCountPlaceholder}
        value={filters.roomCount}
        onChange={(e) => onChange({ ...filters, roomCount: e.target.value })}
        className={`${inputClass} w-16`}
      />
      <input
        type="number"
        min={1980}
        max={2026}
        aria-label={t.explore.builtAfterLabel}
        placeholder={t.explore.builtAfterPlaceholder}
        value={filters.builtAfter}
        onChange={(e) => onChange({ ...filters, builtAfter: e.target.value })}
        className={`${inputClass} w-20`}
      />
      <select
        aria-label={t.explore.typeLabel}
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value })}
        className={selectClass}
      >
        <option value="">{t.explore.typeLabel}</option>
        {HOUSING_TYPE_VALUES.map((v) => (
          <option key={v} value={v}>
            {t.housingType[v]}
          </option>
        ))}
      </select>
    </div>
  );
}
