import { createContext, useContext } from "react";

export interface SavedHousingContextValue {
  savedIds: number[];
  isSaved: (id: number) => boolean;
  toggleSaved: (id: number) => void;
}

export const SavedHousingContext = createContext<SavedHousingContextValue | null>(null);

export function useSavedHousing() {
  const ctx = useContext(SavedHousingContext);
  if (!ctx) throw new Error("useSavedHousing must be used within SavedHousingProvider");
  return ctx;
}
