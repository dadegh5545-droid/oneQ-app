# 05 — Features (functional specification)

Legend: **[LIVE]** = behaviour observed on the website. **[REBUILD]** = required change/addition for the mobile app.

## F1. Splash & bootstrap
- [LIVE] Burgundy splash, animated wordmark "One" → "OneQ", then Home. Loads SharedPreferences (favorites, bookings, signedIn).
- [REBUILD] Native splash + ≤1.5 s animation; load fonts, session token, remote config; route to Home. First launch: optional 3-card onboarding and location-permission primer.

## F2. Discovery (Home)
- [LIVE] Time-based greeting; "Find your perfect workout".
- [LIVE] Featured Gyms carousel = gyms flagged `isFeatured` (Power House, Oxygen Gym).
- [LIVE] Near You carousel = gyms flagged `isNearby` excluding featured (Arena Fitness, Peak Performance, Core Studio).
- [LIVE] Category chips (single select): All (default), Gyms, Classes, Trainers.
- [REBUILD] Near You computed from GPS distance (Haversine) with "2.3 km" labels; fall back to flag when permission denied.

## F3. Search
- [LIVE] Live, case-insensitive, substring match on gym name, area and "Area, Doha". Replaces sections with "Results". Empty → "No gyms found / Try another search or browse featured gyms."
- [REBUILD] Clear button, debounce, search trainers & specialties & address, recent searches (local), server-side search endpoint.

## F4. Gym detail
- [LIVE] Image carousel with dots, favorite toggle, back.
- [LIVE] Two training paths (Membership, Personal Trainer) with "From QAR x / month".
- [LIVE] Tabs: Overview (About, Facilities, Opening Hours, Location, More photos), Reviews, Memberships.
- [REBUILD] Map preview + "Directions", share, call/WhatsApp, full-screen photo viewer, "Open now / Closed" badge computed from hours.

## F5. Membership plans
- [LIVE] 3 plans computed from monthly price (see 04 §3), badges "Save 10%", "Most Popular". Single select; Continue disabled until selected.
- [REBUILD] Plans come from backend per gym; support start-date selection (default today) and auto-renew flag for Monthly.

## F6. Trainers
- [LIVE] Trainers belong to exactly one gym. List with specialty filter chips (All, Strength, Weight Loss, Mobility, Functional Training). Card shows first specialty, rating, reviews, years, price per session.
- [LIVE] Trainer profile: stats, about, specialties, experience & certifications, languages, client reviews, sticky "Book a Session · QAR x".
- [REBUILD] Global trainer directory in Home → Trainers; trainer gallery; "Next available" indicator.

## F7. Session scheduling
- [LIVE] 14-day date strip, Sundays closed; 6 fixed slots; weekday/weekend unavailability rule; summary card.
- [REBUILD] Real availability from backend (trainer working hours − existing bookings − blocks), slot holds (5 min) during checkout, timezone Asia/Qatar, prevent past slots, calendar picker beyond 14 days, multi-session packs (sessionCount > 1) optional.

## F8. Guest checkout & authentication
- [LIVE] Guest (name, phone, optional email) or Sign In. Sign-in accepts any non-empty credentials; name derived from identifier; `signedIn` bool persisted; Sign out clears it. "Create Account" opens Sign In. "Forgot password?" shows snackbar.
- [REBUILD]
  - Real auth (Amazon Cognito via Amplify Gen 2 or equivalent): email+password, phone OTP (+974), Sign in with Apple, Google.
  - Create Account screen (Full name, Email, Phone, Password, accept Terms).
  - Forgot password flow (enter email/phone → code → new password).
  - Guest checkout stays available; guest bookings retrievable by phone OTP later ("Claim your bookings").
  - Signed-in users skip the guest screen; profile data pre-fills checkout.

## F9. Checkout & payments
- [LIVE] Summary + payment method (Card; Apple Pay on Apple platforms; Google Pay on Android), simulated 0.9 s payment, error snackbar.
- [REBUILD] Payment provider supporting Qatar & QAR (e.g. **Stripe** where available, **Tap Payments**, **SkipCash**, **QPay/CyberSource via QNB** — business to choose). Server-created payment intent, Apple Pay / Google Pay native sheets, 3-DS, webhooks confirm booking, receipts by email/SMS.

## F10. Booking confirmation
- [LIVE] Success screen with summary, View Booking, Add to Calendar (placeholder), Back to Home.
- [REBUILD] Native "Add to Calendar" (expo-calendar), push notification + email/SMS confirmation.

## F11. My bookings
- [LIVE] Upcoming/Past segmented tabs, cards with thumbnails, status chips (Confirmed / Completed), date badge, empty states, details screen.
- [LIVE] Statuses in model: confirmed, completed, cancelled (cancelled is never produced).
- [REBUILD] Cancel (policy window, e.g. ≥ 12 h before), reschedule, check-in QR code, receipts, "Book again", reviews after completion (rate trainer/gym → feeds Reviews).

## F12. Favorites
- [LIVE] Heart toggle on every gym card and gym detail; persisted locally (`oneq.favorites` string list); Favorites tab list; empty state.
- [REBUILD] Sync to account when signed in; merge local favorites on sign-in; favorite trainers too (optional).

## F13. Profile & settings
- [LIVE] Account card (signed in/out), Help & Support, Language (English only, Arabic "coming soon"), Terms, Privacy.
- [REBUILD] Edit profile, saved payment methods, notification preferences, **working Arabic with RTL**, dark mode (optional), delete account, app version, contact support (WhatsApp/phone/email).

## F14. Notifications
- [LIVE] None (only in-app snackbars).
- [REBUILD] Push (Expo Notifications / FCM / APNs): booking confirmed, reminder 24 h and 1 h before a session, membership starting/expiring (7 days, 1 day), booking cancelled/changed by gym, review request after session. In-app notification inbox (optional). Local notifications as fallback for reminders.

## F15. Reviews
- [LIVE] Read-only reviews on gym and trainer (name, Verified badge, rating, text, date).
- [REBUILD] Users with a completed booking can submit a review (1–5 stars + text); "Verified" = has completed booking; moderation in admin.

## F16. Info / content pages
- [LIVE] Static text pages (help, language, terms, privacy, fallback).
- [REBUILD] Content served from CMS/backend with EN/AR versions; Help with FAQs and contact buttons.

## F17. Error handling
- [LIVE] Every data section has loading / error / empty variants (strings in 06-FORMS §6 and 02-SCREEN-INVENTORY).
- [REBUILD] Offline banner, retry buttons, cached data (React Query persistence), Sentry crash reporting.

## F18. Dashboards / management
- [LIVE] **None** in the consumer web app — no admin, gym-owner or trainer portal is exposed.
- [REBUILD] Required for a real product (see 11-API §8): Admin web dashboard (gyms, trainers, plans, availability, bookings, payments, reviews, users, content), optionally Gym/Trainer partner portal.

## F19. Localisation
- [LIVE] English copy under an Arabic/RTL locale (bug). Material strings in Arabic (e.g. back tooltip "رجوع").
- [REBUILD] i18n with `en` and `ar`, `I18nManager.forceRTL` for Arabic, Arabic font, locale-aware numbers/dates (keep Latin digits by default), Hijri not required.

## F20. Analytics (recommended)
Events: `app_open`, `search`, `category_select`, `gym_view`, `favorite_toggle`, `path_select`, `plan_select`, `trainer_view`, `slot_select`, `checkout_start`, `payment_success`, `payment_failed`, `booking_view`, `sign_in`, `sign_up`.
