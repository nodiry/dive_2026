import { NavLink, Outlet } from "react-router";
import { useLocale } from "../lib/i18n/localeContext";
import type { Locale } from "../lib/i18n/translations";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-marine text-mist" : "text-marine/70 hover:bg-marine/10"
  }`;

export function Layout() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-slate-light/30 bg-mist/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <NavLink to="/" className="text-lg font-extrabold tracking-tight text-marine">
            동네탐색<span className="text-terracotta">.</span>
          </NavLink>
          <nav className="flex items-center gap-2">
            <NavLink to="/recommend" className={navLinkClass}>
              {t.nav.recommend}
            </NavLink>
            <NavLink to="/search" className={navLinkClass}>
              {t.nav.search}
            </NavLink>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              aria-label={t.languageLabel}
              className="rounded-full border border-slate-light/40 bg-white px-3 py-1.5 text-sm font-medium text-marine"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-light/30 px-6 py-6 text-center text-xs text-slate">{t.footer}</footer>
    </div>
  );
}
