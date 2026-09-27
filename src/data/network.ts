import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

// On native, React Query learns about connectivity from NetInfo, so screens refetch when the network comes back.
// The web keeps React Query's own online/offline listener: NetInfo's web version only watches
// navigator.connection "change" where it exists, which does not fire when the connection drops or returns.
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)));

  // Stale data refreshes when the app returns to the foreground (the web already uses window focus).
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (status) => setFocused(status === 'active'));
    return () => subscription.remove();
  });
}
