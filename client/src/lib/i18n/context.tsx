import { useEffect, useState, type ReactNode } from "react";
import { LocaleContext } from "./localeContext";
import { en, ko, type Locale, type Translations } from "./translations";

const STORAGE_KEY = "dive2026-locale";
const dict: Record<Locale, Translations> = { ko, en };

function readInitialLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "ko";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t: dict[locale] }}>{children}</LocaleContext.Provider>;
}
