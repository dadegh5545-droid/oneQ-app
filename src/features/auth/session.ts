import AsyncStorage from '@react-native-async-storage/async-storage';
import { Hub } from 'aws-amplify/utils';

import { queryClient, repository } from '@/data';
import type { Account } from '@/domain/models';
import { useFavorites } from '@/features/favorites/store';

import { useSession } from './sessionStore';

// Phase 3 kept local accounts (with password hashes), the signed-in user and mock bookings on the device.
const LEGACY_KEYS = ['oneq.accounts', 'oneq.signedIn', 'oneq.bookings'];

const resetUserQueries = () => {
  queryClient.removeQueries({ queryKey: ['bookings'] });
  queryClient.removeQueries({ queryKey: ['booking'] });
};

// Profile (UserProfile) and favorites load in the background; the app never waits on them.
async function refreshAccountData() {
  const [profile] = await Promise.allSettled([repository.getProfile(), useFavorites.getState().loadAccount()]);
  if (profile.status === 'fulfilled' && useSession.getState().user) useSession.getState().setUser(profile.value);
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
}

// App start: Amplify keeps the Cognito tokens; the account comes from the ID token without a network call.
export async function restoreSession() {
  await AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => undefined);
  const account = await repository.currentAccount().catch(() => null);
  if (account) startSession(account);
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
