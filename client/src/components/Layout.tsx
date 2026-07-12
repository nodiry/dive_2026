import { NavLink, Outlet } from "react-router";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-marine text-mist" : "text-marine/70 hover:bg-marine/10"
  }`;

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-slate-light/30 bg-mist/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <NavLink to="/" className="text-lg font-extrabold tracking-tight text-marine">
            동네탐색<span className="text-terracotta">.</span>
          </NavLink>
          <nav className="flex gap-2">
            <NavLink to="/recommend" className={navLinkClass}>
              취향으로 찾기
            </NavLink>
            <NavLink to="/search" className={navLinkClass}>
              조건으로 찾기
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-light/30 px-6 py-6 text-center text-xs text-slate">
        DIVE 2026 · 부산도시공사 × 선도소프트 · 상권·취향 기반 공공임대주택 추천 서비스
      </footer>
    </div>
  );
}
