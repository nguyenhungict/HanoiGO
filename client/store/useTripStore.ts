import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Landmark {
  id: string;
  name: string;
  image: string;
  rating: number;
  category: string;
  description: string;
  lat: number;
  lng: number;
  district?: string;
  gallery?: string[];
  alwaysOpen?: boolean;
  openDays?: number[];
  openTimeStart?: string | null;
  openTimeEnd?: string | null;
}

interface TripConfig {
  numDays: number;
  startTime: string;
  endTime: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  // When false, the planner uses each place's suggested duration (per category).
  // When true, `visitDuration` overrides every place with a single value.
  customVisitDuration: boolean;
  visitDuration: number;
  travelDate: string;
}

interface TripStore {
  selectedPlaces: Record<string, Landmark>;
  addPlace: (landmark: Landmark) => void;
  removePlace: (id: string) => void;
  clearPlaces: () => void;

  config: TripConfig;
  setConfig: (config: Partial<TripConfig>) => void;
  resetConfig: () => void;
}

const DEFAULT_CONFIG: TripConfig = {
  numDays: 1,
  startTime: '08:00',
  endTime: '18:00',
  lunchBreakStart: '11:00',
  lunchBreakEnd: '13:00',
  customVisitDuration: false,
  visitDuration: 60,
  travelDate: new Date().toISOString().split('T')[0],
};

export const useTripStore = create<TripStore>()(
  persist(
    (set) => ({
      selectedPlaces: {},

      addPlace: (landmark) =>
        set((state) => ({
          selectedPlaces: { ...state.selectedPlaces, [landmark.id]: landmark },
        })),

      removePlace: (id) =>
        set((state) => {
          const next = { ...state.selectedPlaces };
          delete next[id];
          return { selectedPlaces: next };
        }),

      clearPlaces: () => set({ selectedPlaces: {} }),

      config: { ...DEFAULT_CONFIG },

      setConfig: (partial) =>
        set((state) => ({
          config: { ...state.config, ...partial },
        })),

      resetConfig: () => set({ config: { ...DEFAULT_CONFIG } }),
    }),
    {
      name: 'hanoigo-trip-basket',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
