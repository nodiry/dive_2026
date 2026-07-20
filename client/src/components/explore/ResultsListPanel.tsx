import type { ReactNode } from "react";

interface ResultsListPanelProps {
  children: ReactNode;
}

/**
 * The floating left scrollable panel shell — used for both search results
 * and the 찜 list (Explore.tsx swaps what's rendered inside rather than
 * forking this component, same "don't fork the shared shell" rule as
 * HousingCard, see docs/DESIGN.md).
 */
export function ResultsListPanel({ children }: ResultsListPanelProps) {
  return (
    <div className="pointer-events-auto m-4 flex max-h-[calc(100vh-6rem)] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-light/30 bg-mist/95 p-4 shadow-lg backdrop-blur sm:w-96">
      {children}
    </div>
  );
}
