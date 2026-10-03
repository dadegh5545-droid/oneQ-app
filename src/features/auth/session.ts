import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Hub } from 'aws-amplify/utils';

import { queryClient, repository } from '@/data';
import { RepositoryError } from '@/data/repository';
import type { Account } from '@/domain/models';
import { useFavorites } from '@/features/favorites/store';
import { clearAccountReminders } from '@/services/notifications';

import { useSession } from './sessionStore';

// Phase 3 kept local accounts (with password hashes), the signed-in user and mock bookings on the device.
const LEGACY_KEYS = ['oneq.accounts', 'oneq.signedIn', 'oneq.bookings'];

const resetUserQueries = () => {
  queryClient.removeQueries({ queryKey: ['bookings'] });
  queryClient.removeQueries({ queryKey: ['booking'] });
  queryClient.removeQueries({ queryKey: ['dash'] });
};

// Profile (UserProfile) and favorites load in the background; the app never waits on them.
async function refreshAccountData() {
  const [profile] = await Promise.allSettled([repository.getProfile(), useFavorites.getState().loadAccount()]);
  const current = useSession.getState().user;
  // The admin and owner flags come from the Cognito token, not from UserProfile.
  if (profile.status === 'fulfilled' && current) useSession.getState().setUser({ ...profile.value, isAdmin: current.isAdmin, isOwner: current.isOwner });
}

// After a successful sign-in, sign-up confirmation or session restore.
export function startSession(account: Account) {
  useSession.getState().setUser(account);
  resetUserQueries();
  void refreshAccountData();
}

function endSession() {
  useSession.getState().setUser(null);
  useFavorites.getState().clearAccount();
  resetUserQueries();
  void clearAccountReminders();
}

// App start: Amplify keeps the Cognito tokens; the account comes from the ID token without a network call.
export async function restoreSession() {
  await AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => undefined);
  try {
    const account = await repository.currentAccount();
    if (account) startSession(account);
  } catch (e) {
    // Offline start with an expired access token: the stored session is kept; restore once online.
    if (e instanceof RepositoryError && e.code === 'NETWORK') restoreWhenOnline();
  }
}

function restoreWhenOnline() {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (!state.isConnected) return;
    unsubscribe();
    void restoreSession();
  });
}

export async function signOut() {
  // Local tokens are cleared even if revoking them on the server fails (e.g. offline).
  await repository.signOut().catch(() => undefined);
  endSession();
}

// The refresh token expired or was revoked: drop to signed-out. Offline refresh failures are ignored.
export function listenForSessionExpiry(onExpired: () => void) {
  return Hub.listen('auth', ({ payload }) => {
    if (payload.event !== 'tokenRefresh_failure' || !useSession.getState().user) return;
    const error = 'data' in payload ? (payload.data as { error?: Error } | undefined)?.error : undefined;
    if (error?.name === 'NetworkError') return;
    endSession();
    onExpired();
  });
}
