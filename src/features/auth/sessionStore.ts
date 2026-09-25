import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type SessionState = {
  signedIn: boolean;
  displayName: string | null;
  signOut: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      signedIn: false,
      displayName: null,
      signOut: () => set({ signedIn: false, displayName: null }),
    }),
    { name: 'oneq.signedIn', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
