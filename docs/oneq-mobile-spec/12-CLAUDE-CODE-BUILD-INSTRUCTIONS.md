# 12 — Claude Code Implementation Brief: OneQ Mobile

> **Read this file first, then 01 → 11.** This folder is the complete specification of the OneQ web app (https://oneq-green.vercel.app), reverse-engineered screen by screen. Your job is to rebuild it as a production **iOS + Android** app, keeping its information architecture, copy and visual language, adapting it to native mobile patterns, and fixing the defects listed in `01-PROJECT-OVERVIEW.md §5`.

## 0. Ground rules
1. **Copy is verbatim.** Use the exact strings from 02/06 (put them in `locales/en.json`). Do not invent marketing copy.
2. **LTR for English.** The live site's RTL rendering of English is a bug. Implement proper i18n: `en` (LTR) and `ar` (RTL).
3. **Do not replicate these bugs:** lost time slot after Continue (04 §4), sign-in loop on the guest screen, "Create Account" opening sign-in, weak phone validation, missing Arabic glyphs.
4. **Build mock-first, then backend.** Phase 1 must run fully offline on seed data (09) through a repository interface; Phase 2 swaps in the Amplify backend without UI changes.
5. TypeScript strict, no `any`. Every screen implements loading / empty / error states from 02.
6. Commit after each milestone with a clear message.

## 1. Stack
- Expo (latest SDK) + React Native + TypeScript, **Expo Router**.
- State: **TanStack Query** (server/cache), **Zustand** (booking draft, session, favorites-local).
- Forms: react-hook-form + zod. i18n: i18next + react-i18next + expo-localization.
- UI: custom components on the tokens in 07 (no heavy UI kit). Icons: `@expo/vector-icons` (MaterialIcons/MaterialCommunityIcons).
- Fonts: `@expo-google-fonts/playfair-display`, `@expo-google-fonts/outfit`, plus `@expo-google-fonts/ibm-plex-sans-arabic` for Arabic.
- Media/UX: expo-image, react-native-reanimated, react-native-gesture-handler, react-native-pager-view, @shopify/flash-list, expo-haptics, expo-calendar, expo-location, expo-notifications, expo-secure-store, react-native-mmkv, date-fns (+ date-fns-tz, Asia/Qatar).
- Backend (Phase 2): AWS Amplify Gen 2 (`amplify/` folder): auth (Cognito), data (AppSync + DynamoDB), functions (payments, availability, scheduler), storage (S3).
- Testing: Jest + React Native Testing Library; Maestro E2E flows.

## 2. Project structure
```
oneq/
  app/                         # Expo Router (see 03-NAVIGATION §7)
  src/
    theme/ (colors.ts, typography.ts, spacing.ts, index.ts)
    components/
      buttons/ PrimaryButton, OutlinedButton, TextButton, IconCircleButton
      inputs/ SearchField, TextField, PhoneField, PasswordField
      selection/ Chip, ChipRow, SegmentedControl, RadioOptionCard, PlanCard, PaymentMethodRow, DateTile, DateStrip, TimePill, TimeGrid
      cards/ GymCardFeatured, GymCardCompact, GymListCard, TrainerCard, BookingCard, ReviewCard, PathCard, SummaryCard, StatRow
      feedback/ EmptyState, Skeleton, Toast, LoadingOverlay
      layout/ Screen, StickyFooter, SectionHeader, SectionLabel, InfoRow, PageDots, HeroCarousel
      misc/ RatingInline, StatusChip, DateBadge, FacilityChip, Wordmark
    features/
      gyms/ (api.ts, hooks.ts, search.ts)
      trainers/ (api.ts, hooks.ts, filters.ts)
      plans/ (pricing.ts)
      availability/ (slots.ts)
      booking/ (draftStore.ts, total.ts, classify.ts)
      auth/ (sessionStore.ts, cognito.ts)
      favorites/ (store.ts, sync.ts)
      payments/ (provider.ts)
      notifications/, calendar/
    data/
      repository.ts           # interface
      mock/ (gyms.ts, trainers.ts, reviews.ts, mockRepository.ts)   # exact seed data from 09
      amplify/ amplifyRepository.ts
    i18n/ (index.ts, en.json, ar.json)
    utils/ (format.ts — currency "QAR 1,399", dates, phone normalisation)
  amplify/                     # Phase 2
  e2e/ (maestro flows)
```

## 3. Domain logic to implement exactly (unit-test all)
```ts
// plans/pricing.ts
export const buildPlans = (gymId: string, m: number) => [
  { id: `${gymId}-monthly`, name: 'Monthly',  price: m,                        description: 'Full gym access, billed every month.',              badge: null },
  { id: `${gymId}-3m`,      name: '3 Months', price: Math.round(m * 3 * 0.9),  description: 'A calmer commitment with a quieter monthly rate.',  badge: 'Save 10%' },
  { id: `${gymId}-6m`,      name: '6 Months', price: Math.round(m * 6 * 0.78), description: 'The most considered way to settle into a routine.', badge: 'Most Popular' },
];
// expect buildPlans('power-house', 299).map(p=>p.price) → [299, 807, 1399]

// availability/slots.ts  (mock rule; server replaces it in Phase 2)
export const SLOT_MINUTES = [540, 630, 720, 960, 1110, 1200];
export const isClosed = (d: Date) => d.getDay() === 0;              // Sunday
export const isSlotAvailable = (d: Date, i: number) => {
  const wd = d.getDay();                                             // 5 = Fri, 6 = Sat
  return (wd === 5 || wd === 6) ? (i !== 0 && i !== 3) : i !== 2;
};
export const slotLabel = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${ap}`;
};
export const next14Days = (today: Date) => [...Array(14)].map((_, i) => addDays(startOfDay(today), i));
// also: disable slots earlier than now + 60 min for today (new rule)

// booking/classify.ts
export const isUpcoming = (b: Booking, now = new Date()) =>
  b.status === 'completed' || b.status === 'cancelled' ? false
  : b.date == null ? b.status === 'confirmed'
  : endOfDay(new Date(b.date)) >= now;

// booking/total.ts
export const draftTotal = (d: BookingDraft) =>
  d.path === 'membershipPlusTrainer' ? (d.trainer?.pricePerSession ?? 0) : (d.plan?.price ?? d.gym?.monthlyPrice ?? 0);

// gyms/search.ts
export const matchesQuery = (g: Gym, q: string) => {
  const s = q.trim().toLowerCase(); if (!s) return true;
  return [g.name, g.area, `${g.area}, Doha`].some(v => v.toLowerCase().includes(s));   // Phase 2: add address + trainers
};

// trainers/filters.ts
export const SPECIALTY_CHIPS = ['All','Strength','Weight Loss','Mobility','Functional Training'] as const;
export const chipToSpecialty = (c: string) => (c === 'Strength' ? 'Strength Training' : c);

// utils/format.ts
export const qar = (n: number) => `QAR ${new Intl.NumberFormat('en').format(n)}`;
export const normaliseQatarPhone = (raw: string) => { const d = raw.replace(/\D/g,'').replace(/^974/,''); return `+974 ${d.slice(0,4)} ${d.slice(4,8)}`; };
export const isValidQatarMobile = (raw: string) => /^[3567]\d{7}$/.test(raw.replace(/\D/g,'').replace(/^974/,''));
```

## 4. Milestones (build in this order)

**M1 — Foundation**
- Expo app, TypeScript strict, ESLint/Prettier, Expo Router skeleton for every route in 03 §7.
- Theme tokens (07 §9), fonts loading, i18n (en + ar skeleton), RTL switch, SafeArea, Toast provider, QueryClient with MMKV persistence.
- Component library (§2 components) with a hidden `/dev/components` storybook-style screen.

**M2 — Data layer (mock)**
- `Repository` interface: `listGyms`, `getGym`, `getPlans`, `listTrainers(gymId, specialty?)`, `getTrainer`, `listReviews({gymId|trainerId})`, `getAvailability(trainerId, from, days)`, `createBooking(draft)`, `listBookings`, `getBooking`, `favorites` (get/toggle), `session` (signIn/signOut).
- `mockRepository` with exact seed data from 09 and 300–600 ms artificial latency (so skeletons are visible); bookings/favorites/session persisted in MMKV with keys `oneq.bookings`, `oneq.favorites`, `oneq.signedIn`.
- Unit tests for §3.

**M3 — Tabs & discovery**: Splash (S01), Home S02–S06 (greeting by hour: <12 "Good morning", <17 "Good afternoon", else "Good evening"), Favorites S18, Profile S19 (both states), Info S20, Not-found S21. Bottom tab bar per 03 §2.

**M4 — Gym & trainer**: Gym Detail S07 (hero carousel, path cards, segmented tabs, all Overview sections, reviews, memberships), Plans S08, Trainer list S09 (chips), Trainer profile S10 (auto-set gym from `trainer.gymId` if draft empty).

**M5 — Booking**: Session booking S11 (DateStrip, TimeGrid, summary, keep selected time!), Guest/Sign-in choice S12 (skip if signed in), Sign In S13, Create Account + Forgot Password (new, 06 §4), Checkout S14 (platform-specific payment rows via `Platform.OS`), Success S15 (replace stack, disable back), Bookings S16, Booking details S17. Calendar integration via expo-calendar.

**M6 — Polish**: haptics, animations (07 §7), pull-to-refresh, skeletons, a11y labels, Arabic translation + RTL QA, dynamic type, offline banner.

**M7 — Backend (Amplify Gen 2)**: implement 11 §1 schema, seed script from mock data, `amplifyRepository`, Cognito auth (email/phone+password, Apple, Google, phone OTP), availability Lambda, holds, payment intent + webhook Lambdas (provider behind an interface; start with a sandbox provider), status scheduler, push notifications & reminders, favorites sync, guest booking lookup.

**M8 — Release**: app icons/splash, EAS Build profiles, store metadata, privacy manifest, delete-account flow, Sentry, analytics events (05 F20), Maestro E2E for UF-05/06/07/09.

## 5. Acceptance checklist (must all pass)
- [ ] Every screen S01–S21 matches 02 (copy, order of elements, states).
- [ ] Power House plans show QAR 299 / 807 / 1,399; Oxygen 349 / 942 / 1,633.
- [ ] Trainer list for Oxygen Gym shows Omar Al-Kuwari and Sofia Moretti; "Functional Training" filter shows only Omar.
- [ ] Date strip shows 14 days, Sundays disabled; on Fri/Sat 9:00 AM & 4:00 PM are struck through; Mon–Thu 12:00 PM struck through.
- [ ] Selected time persists to Checkout, Success, Booking details and Bookings card.
- [ ] Guest validation messages exactly as 06 §2; phone stored as "+974 XXXX XXXX".
- [ ] Signed-in users skip S12; after sign-in from S12 user lands on Checkout.
- [ ] Apple Pay row only on iOS, Google Pay only on Android, Card on both.
- [ ] Success replaces the stack; hardware back goes Home.
- [ ] Upcoming/Past classification per `isUpcoming`; empty states per 02 S16.
- [ ] Favorites persist across restarts and appear in Favorites tab.
- [ ] Search "lusail" → Oxygen Gym; "doha" → all; "zzz" → "No gyms found".
- [ ] Arabic switch renders RTL with Arabic font (no tofu); English is LTR.
- [ ] All interactive elements have accessibility labels; touch targets ≥ 44 pt.
- [ ] Unit tests for pricing, slots, classification, validators pass; Maestro flows pass.

## 6. Prompt to start (paste into Claude Code)
```
You are building the OneQ mobile app (iOS + Android) from the specification in /docs/oneq-mobile-spec.
Read 12-CLAUDE-CODE-BUILD-INSTRUCTIONS.md first, then 01–11.
Use Expo + React Native + TypeScript + Expo Router, TanStack Query, Zustand, react-hook-form + zod, i18next.
Work milestone by milestone (M1 → M8). Start with M1 and M2 now: scaffold the project, implement the theme
tokens, fonts, i18n (en/ar with RTL), the component library, the Repository interface and the mock repository
with the exact seed data from 09-DATA-MODELS.md, plus unit tests for section 3 domain logic.
Use the verbatim copy from 02 and 06. Do not reproduce the live-site bugs listed in 01 §5.
After each milestone, run typecheck, lint and tests, then summarise what was built and what is next.
```
