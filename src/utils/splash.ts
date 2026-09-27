import * as NativeSplash from 'expo-splash-screen';
import { Platform } from 'react-native';

// Hides the launch screen: the native splash, or on the web the boot screen in public/index.html. Both show the
// same wordmark as the first app screen, and the web one fades out.
export function hideSplash() {
  NativeSplash.hide();
  if (Platform.OS !== 'web') return;
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.style.opacity = '0';
  setTimeout(() => boot.remove(), 300);
}
