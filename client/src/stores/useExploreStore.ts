import { create } from 'zustand';
import type { ExploreMode, PanelView } from '@type/explore';
import { EMPTY_CRITERIA_FILTERS, type CriteriaFilters } from '@utils/filters';
import { PERSONAS, type PersonaKey } from '@constants/personas';
import type { CategoryWeights } from '@constants/poi';

interface ExploreStore {
  mode: ExploreMode;
  panelView: PanelView;
  filters: CriteriaFilters;
  weights: CategoryWeights;
  activePersona: PersonaKey | null;
  radiusMeters: number;
  selectedHousingId: number | null;
  hoveredHousingId: number | null;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  setMode: (mode: ExploreMode) => void;
  setPanelView: (view: PanelView) => void;
  setFilters: (filters: CriteriaFilters) => void;
  resetFilters: () => void;
  toggleCategory: (categoryName: string) => void;
  setCategoryWeight: (categoryName: string, weight: number) => void;
  selectPersona: (key: PersonaKey) => void;
  setRadiusMeters: (meters: number) => void;
  toggleSelectedHousing: (id: number) => void;
  clearSelectedHousing: () => void;
  setHoveredHousing: (id: number | null) => void;
}

export const useExploreStore = create<ExploreStore>((set) => ({
  mode: 'criteria',
  panelView: 'results',
  filters: EMPTY_CRITERIA_FILTERS,
  weights: {},
  activePersona: null,
  radiusMeters: 500,
  selectedHousingId: null,
  hoveredHousingId: null,
  panelOpen: true,

  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setMode: (mode) =>
    set({
      mode,
      selectedHousingId: null,
      hoveredHousingId: null,
      panelView: 'results',
      panelOpen: true,
    }),
  setPanelView: (panelView) => set({ panelView }),
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: EMPTY_CRITERIA_FILTERS }),

  toggleCategory: (key) =>
    set((state) => {
      const weights = { ...state.weights };
      if (weights[key] !== undefined) delete weights[key];
      else weights[key] = 1;
      return { weights, activePersona: null };
    }),

  setCategoryWeight: (key, weight) =>
    set((state) => ({ weights: { ...state.weights, [key]: weight }, activePersona: null })),

  selectPersona: (key) =>
    set((state) => {
      if (state.activePersona === key) return { activePersona: null, weights: {} };
      const persona = PERSONAS.find((p) => p.key === key);
      if (!persona) return state;
      return {
        activePersona: key,
        weights: { ...persona.weights },
        radiusMeters: persona.radiusMeters,
      };
    }),

  setRadiusMeters: (radiusMeters) => set({ radiusMeters, activePersona: null }),

  toggleSelectedHousing: (id) =>
    set((state) => ({ selectedHousingId: state.selectedHousingId === id ? null : id })),
  clearSelectedHousing: () => set({ selectedHousingId: null }),
  setHoveredHousing: (hoveredHousingId) => set({ hoveredHousingId }),
}));
