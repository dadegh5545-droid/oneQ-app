import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { repository } from '@/data';
import { useSession } from '@/features/auth/sessionStore';
import { track } from '@/services/analytics';

type FavoritesState = {
  // Signed out: kept on this device. Merged into the account on the next sign-in.
  guestIds: string[];
  // Signed in: mirrors the user's Favorite records in AWS.
  accountIds: string[];
  pending: string[];
  toggle: (gymId: string) => Promise<void>;
  loadAccount: () => Promise<void>;
  clearAccount: () => void;
};

const toggled = (ids: string[], gymId: string) => (ids.includes(gymId) ? ids.filter((id) => id !== gymId) : [...ids, gymId]);

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      guestIds: [],
      accountIds: [],
      pending: [],
      toggle: async (gymId) => {
        if (!useSession.getState().user) {
          const saved = get().guestIds.includes(gymId);
          set((s) => ({ guestIds: toggled(s.guestIds, gymId) }));
          track({ name: saved ? 'favorite_removed' : 'favorite_added', gymId });
          return;
        }
        if (get().pending.includes(gymId)) return;
        const wasSaved = get().accountIds.includes(gymId);
        // Optimistic; reverted if the backend call fails.
        set((s) => ({ accountIds: toggled(s.accountIds, gymId), pending: [...s.pending, gymId] }));
        try {
          await (wasSaved ? repository.removeFavorite(gymId) : repository.addFavorite(gymId));
          track({ name: wasSaved ? 'favorite_removed' : 'favorite_added', gymId });
        } catch (e) {
          set((s) => ({ accountIds: wasSaved ? [...s.accountIds, gymId] : s.accountIds.filter((id) => id !== gymId) }));
          throw e;
        } finally {
          set((s) => ({ pending: s.pending.filter((id) => id !== gymId) }));
        }
      },
      loadAccount: async () => {
        const { guestIds } = get();
        await Promise.all(guestIds.map((id) => repository.addFavorite(id)));
        set({ guestIds: [], accountIds: await repository.listFavorites() });
      },
      clearAccount: () => set({ accountIds: [], pending: [] }),
    }),
    {
      name: 'oneq.favorites',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ guestIds: s.guestIds }),
      version: 1,
      // v0 (Phase 3) stored every favorite locally as `ids`.
      migrate: (persisted, version) => (version === 0 ? { guestIds: (persisted as { ids?: string[] }).ids ?? [] } : persisted) as FavoritesState,
    },
  ),
);

export const useFavoriteIds = () => {
  const signedIn = useSession((s) => s.user !== null);
  return useFavorites((s) => (signedIn ? s.accountIds : s.guestIds));
};

export const useIsFavorite = (gymId: string) => useFavoriteIds().includes(gymId);
