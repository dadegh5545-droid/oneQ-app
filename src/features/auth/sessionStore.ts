import { create } from 'zustand';

import type { Account } from '@/domain/models';

// The signed-in account. Cognito (via Amplify) persists the session itself; see ./session.ts.
type SessionState = {
  user: Account | null;
  setUser: (user: Account | null) => void;
};

export const useSession = create<SessionState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
