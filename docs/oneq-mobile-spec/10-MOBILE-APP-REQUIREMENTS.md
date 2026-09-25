# 10 — Mobile App Requirements

## 1. Platforms & targets
- iOS 15+ (iPhone; iPad runs in compatibility or centered-width layout), Android 8.0+ (API 26+).
- Portrait only (matches `orientation: portrait-primary`).
- App name: **OneQ**. Bundle IDs (proposal): `qa.oneq.app` (iOS) / `qa.oneq.app` (Android).
- Store assets: burgundy app icon with cream "Q" monogram; splash burgundy with "OneQ" wordmark.

## 2. Recommended stack
- **React Native + Expo (SDK latest) + TypeScript**, **Expo Router** (file-based navigation), **TanStack Query** (server state + offline cache), **Zustand** (booking draft & UI state), **react-hook-form + zod** (forms), **i18next** (EN/AR), **expo-font** with `@expo-google-fonts/playfair-display` & `@expo-google-fonts/outfit`, **expo-image** (caching), **react-native-reanimated** + **gesture-handler** (animations/carousels), **expo-haptics**, **expo-calendar**, **expo-notifications**, **expo-location**, **expo-secure-store**, **react-native-mmkv** (local cache).
- Backend: **AWS Amplify Gen 2** (Cognito auth, AppSync GraphQL + DynamoDB, Lambda for payments/availability, S3 for images, Pinpoint/SNS for push & SMS). See 11.
- Alternative: Flutter (the original web app is Flutter — Riverpod + go_router), if the team prefers Dart.

## 3. Mobile adaptations (web → native)

| Web behaviour | Mobile implementation |
|---|---|
| Hash routes | Expo Router stack + tabs; deep links `oneq://` and universal links |
| Forced RTL with English text | LTR by default; RTL only for Arabic via `I18nManager` |
| Fixed-width cards stretching on desktop | Responsive widths: featured card = 72 % of screen width, snap carousel |
| Back arrow in custom app bar | Native header back + iOS swipe-back + Android system back |
| Sticky bottom CTA | `SafeAreaView` bottom bar with blur/hairline, keyboard-aware |
| Snackbars | Toast (e.g. `burnt` or custom) positioned above tab bar |
| Web keyboard | Correct `keyboardType`, `textContentType`, `autoComplete`, `returnKeyType`; `KeyboardAvoidingView` |
| Image carousel with dots | Paged `FlatList`/`react-native-pager-view` + full-screen gallery on tap |
| "Near You" static | GPS distance sorting with permission primer |
| Add to Calendar placeholder | `expo-calendar` event creation (with permission) |
| Simulated payment | Native Apple Pay / Google Pay + card sheet via provider SDK |
| Sign-in mock | Cognito auth, Sign in with Apple (required on iOS if Google offered), Google, phone OTP |
| No notifications | Push + local reminders |
| Pull to refresh (none) | Pull-to-refresh on Home, Bookings, Favorites |

## 4. Screen-level mobile UX rules
- Home: large title that collapses; search sticks under the header when scrolling.
- Gym detail: parallax hero, sticky mini header after scrolling past hero, bottom action bar with two CTAs ("Membership" / "Book a Trainer").
- Selections (chips, plans, dates, times, payment): light haptic.
- Success: success haptic, prevent back navigation to checkout.
- Lists: `FlashList` for performance; skeletons on first load; cached data shown instantly afterwards.
- Empty and error states use the shared EmptyState component with retry.
- All tap targets ≥ 44 × 44 pt; dynamic type up to 130 % without truncating CTAs.

## 5. Accessibility
- Every icon button has an accessibility label (Back, Add to favorites / Remove from favorites, Show password…).
- Cards expose a single combined label ("Power House, West Bay, Doha, rated 4.9, 128 reviews, QAR 299 per month").
- Color contrast AA (primary on cream passes; muted text ≥ 4.5:1 — darken `textSecondary` if needed).
- Disabled/unavailable time slots announce "unavailable".
- Support screen readers in both LTR and RTL.

## 6. Localisation
- Languages: English (default), Arabic.
- All strings in `locales/en.json` and `locales/ar.json` (keys listed per screen in 02/06).
- Numbers: Latin digits; currency "QAR 1,399" / "1,399 ر.ق" in Arabic.
- Dates: `date-fns` with `enGB`/`arSA` locales; timezone **Asia/Qatar** for all booking times.
- Week: Qatar weekend Friday–Saturday; business rule "Sunday closed" is a mock rule — make it configurable per trainer/gym.

## 7. Offline & performance
- Cache gyms, trainers, plans, bookings (TanStack Query persist to MMKV). Show cached data offline with an "You're offline" banner; disable Pay offline.
- Image caching via expo-image; serve images as WebP at 2× device widths (thumbnail 200, card 800, hero 1400).
- Cold start < 2.5 s on mid-range Android; list scroll at 60 fps.

## 8. Security & privacy
- Tokens in SecureStore/Keychain; no card data on device (provider tokenisation).
- Qatar PDPPL (Personal Data Privacy Protection Law) compliance: consent, data access/deletion (in-app "Delete account").
- iOS privacy manifest + App Tracking Transparency only if tracking is added.
- Certificate pinning optional; jailbreak/root detection optional.

## 9. Permissions
| Permission | When requested | Purpose |
|---|---|---|
| Location (when in use) | First time user opens Home "Near You" (after primer) | Nearby gyms |
| Notifications | After first successful booking | Confirmations & reminders |
| Calendar | On "Add to Calendar" | Create event |
| Camera/Photos | Edit profile avatar (optional) | Avatar |

## 10. Notifications (content)
| Trigger | Title | Body |
|---|---|---|
| Booking confirmed | You're booked! | Your session with {trainerFirst} on {d MMM} at {time} is confirmed. / Your {plan} membership at {gym} is confirmed. |
| 24 h reminder | Tomorrow at {time} | Session with {trainerFirst} at {gym}. |
| 1 h reminder | Starting soon | Your session at {gym} starts at {time}. |
| Membership expiring | Your membership ends soon | {gym} membership ends on {date}. Renew in OneQ. |
| Cancelled by gym | Booking update | Your booking on {date} was cancelled. A refund is on its way. |
| Review request | How was your session? | Rate {trainerFirst} and help others choose. |

## 11. Quality
- Unit tests: pricing formula, slot availability, upcoming/past classification, validators, phone normalisation.
- Component tests: React Native Testing Library for forms and selection components.
- E2E: Maestro (or Detox) flows UF-05, UF-06, UF-07, UF-09.
- Crash & performance: Sentry. Analytics: Amplify Analytics / PostHog / Firebase.
- CI/CD: EAS Build + EAS Submit, OTA updates via EAS Update, environments dev/staging/prod.

## 12. Definition of done (per screen)
Matches 02 spec (copy, layout, states) · LTR+RTL verified · light haptics · a11y labels · loading/empty/error states · analytics event · tests.
