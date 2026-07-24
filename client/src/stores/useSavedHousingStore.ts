import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SavedHousingStore = {
  savedIds: number[];
  isSaved: (id: number) => boolean;
  toggleSaved: (id: number) => void;
};

export const useSavedHousingStore = create<SavedHousingStore>()(
  persist(
    (set, get) => ({
      savedIds: [],
      isSaved: (id) => get().savedIds.includes(id),
      toggleSaved: (id) =>
        set((state) => ({
          savedIds: state.savedIds.includes(id)
            ? state.savedIds.filter((v) => v !== id)
            : [...state.savedIds, id],
        })),
    }),
    { name: 'dive2026-saved-housing' },
  ),
);
