import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type FavoritesState = {
  ids: string[];
  toggle: (gymId: string) => void;
};

export const useFavorites = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (gymId) =>
        set((s) => ({ ids: s.ids.includes(gymId) ? s.ids.filter((id) => id !== gymId) : [...s.ids, gymId] })),
    }),
    { name: 'oneq.favorites', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const useIsFavorite = (gymId: string) => useFavorites((s) => s.ids.includes(gymId));
