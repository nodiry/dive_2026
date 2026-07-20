import { useLocale } from "../lib/i18n/localeContext";
import type { Locale } from "../lib/i18n/translations";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label={t.languageLabel}
      className={`rounded-full border border-slate-light/40 bg-white px-3 py-1.5 text-sm font-medium text-marine ${className}`}
    >
      <option value="ko">한국어</option>
      <option value="en">English</option>
    </select>
  );
}
