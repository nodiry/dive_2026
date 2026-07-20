import { useEffect, useState, type ReactNode } from "react";
import { SavedHousingContext } from "./savedHousingContext";

const STORAGE_KEY = "dive2026-saved-housing";

function readInitialIds(): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "number") : [];
  } catch {
    return [];
  }
}

export function SavedHousingProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<number[]>(readInitialIds);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds));
  }, [savedIds]);

  function toggleSaved(id: number) {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function isSaved(id: number) {
    return savedIds.includes(id);
  }

  return (
    <SavedHousingContext.Provider value={{ savedIds, isSaved, toggleSaved }}>{children}</SavedHousingContext.Provider>
  );
}
