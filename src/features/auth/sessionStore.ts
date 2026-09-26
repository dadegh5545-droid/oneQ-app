import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Account } from '@/domain/models';

type SessionState = {
  user: Account | null;
  signIn: (user: Account) => void;
  signOut: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    { name: 'oneq.signedIn', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
