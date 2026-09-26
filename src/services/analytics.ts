// Provider-agnostic product analytics. No provider is selected yet; call setAnalyticsProvider at start-up.
// Events carry ids and counts only — never email, phone, names, tokens, search text or other personal data.

export type AnalyticsEvent =
  | { name: 'app_open' }
  | { name: 'search'; resultCount: number }
  | { name: 'view_gym'; gymId: string }
  | { name: 'view_trainer'; trainerId: string }
  | { name: 'favorite_added'; gymId: string }
  | { name: 'favorite_removed'; gymId: string }
  | { name: 'checkout_started'; bookingType: 'membership' | 'session'; gymId: string }
  | { name: 'booking_completed'; bookingType: 'membership' | 'session'; gymId: string; priceQar: number }
  | { name: 'booking_failed'; bookingType: 'membership' | 'session'; errorCode: string }
  | { name: 'language_changed'; language: 'en' | 'ar' };

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
}

const devProvider: AnalyticsProvider = { track: (event) => console.log('[analytics]', event) };
const silentProvider: AnalyticsProvider = { track: () => undefined };

let provider: AnalyticsProvider = __DEV__ ? devProvider : silentProvider;

export const setAnalyticsProvider = (next: AnalyticsProvider) => {
  provider = next;
};

export function track(event: AnalyticsEvent) {
  try {
    provider.track(event);
  } catch {
    // Analytics must never break the app.
  }
}
