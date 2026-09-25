# 01 — Project Overview: OneQ

## 1. What the product is

**OneQ** is a consumer booking app for **gyms and personal trainers in Doha, Qatar**. A user can:

1. Discover gyms (featured, nearby, search, full list).
2. Open a gym and choose **how to train**:
   - **Gym Membership** — buy a Monthly / 3-Month / 6-Month plan.
   - **Train with a Personal Trainer** — pick a trainer at that gym, then book a single session on a date + time slot.
3. Continue as **Guest** (name + Qatar phone + optional email) or **Sign In**.
4. Pay (Card; Apple Pay on iOS/macOS; Google Pay on Android).
5. See a **"You're booked!"** confirmation, then manage bookings (Upcoming / Past).
6. Save gyms to **Favorites**.
7. Use a **Profile** area (sign in/out, Help & Support, Language, Terms, Privacy).

Tagline used in the app: *"Find gyms and personal trainers across Doha, then book with confidence."*

Currency: **QAR**. Country: **Qatar (+974)**. City suffix: every gym location displays as `"<Area>, Doha"`.

## 2. Source that was inspected

| Item | Value |
|---|---|
| URL | `https://oneq-green.vercel.app/#/bookings` (hash routing) |
| Technology | **Flutter Web** (CanvasKit renderer) — `main.dart.js` + `flutter_bootstrap.js` |
| Libraries detected in the compiled code | `go_router` (routing, `StatefulShellRoute` for tabs), `flutter_riverpod` (state), `shared_preferences` (local persistence), `intl` (date/number formatting), Google Fonts (**Playfair Display** + **Outfit**), Material 3 |
| Backend | **None.** All gyms, trainers, reviews, plans and time slots are hard-coded mock data inside the app. Bookings, favorites and sign-in state are stored in browser `localStorage` (SharedPreferences). No network API calls other than images from `images.unsplash.com` and bundled assets. |
| PWA manifest | name `oneq`, `display: standalone`, `orientation: portrait-primary`, theme/background `#0175C2` (Flutter default — not the brand color), description "A new Flutter project." |
| Page `<html lang>` | `ar` — the app runs with an **Arabic locale / RTL layout** while all copy is English (see §5). |

## 3. How the inspection was done

- Every route was opened in a 390-px-wide phone-sized frame; Flutter's accessibility (semantics) tree was enabled so every label, button, input and position could be read exactly.
- Every flow was executed end-to-end: search, filters, favorites, gym tabs, membership purchase, trainer session booking, guest form validation, sign-in validation, forgot password, checkout, success, booking details, add-to-calendar, bookings tabs (including Past/Completed via seeded data), profile, info pages, 404 and "not found" states.
- The compiled Dart→JS bundle was analysed to extract **all** UI strings, mock data, pricing formulas, time-slot rules, validation rules, persistence keys and data models — including states that are hard to trigger manually (error states, platform-only payment methods).

## 4. Feature summary (one line each)

| Area | Features |
|---|---|
| Launch | Animated splash ("One" → "OneQ" wordmark) then Home |
| Home | Greeting, headline, search, category chips (All / Gyms / Classes / Trainers), Featured Gyms carousel, Near You carousel, search results, empty search state |
| Gym detail | Photo carousel, favorite, back, name/area/rating/reviews, "Choose how you want to train" (2 paths), tabs Overview / Reviews / Memberships, About, Facilities, Opening Hours, Location, More photos |
| Plans | Choose a plan (3 plans with badges), sticky Continue |
| Trainers | Trainer list per gym with specialty filter chips |
| Trainer profile | Header, stats (Reviews / Experience / Rating), About, Specialties, Experience & certifications, Languages, Client Reviews, sticky "Book a Session · QAR x" |
| Session booking | 14-day date strip (Sundays disabled), time slots with unavailable (struck-through) slots, live Booking Summary, sticky Continue |
| Auth choice | Guest vs Sign In selector, guest form with validation |
| Sign in | Email/phone + password (show/hide), Forgot password, Sign In, Create Account |
| Checkout | Booking Summary, payment method selector (platform dependent), "Pay QAR x" with loading |
| Success | Animated check, "You're booked!", summary card, View Booking, Add to Calendar, Back to Home |
| Bookings | Upcoming / Past segmented tabs, booking cards with status chips and date badges, empty states |
| Booking details | Full summary with status, Add to Calendar, Back to Home |
| Favorites | Saved gyms list, toggle, empty state |
| Profile | Signed-out / signed-in card, Support, Settings (Language), Legal |
| Info pages | Help & Support, Language (English / العربية), Terms & Conditions, Privacy Policy, generic fallback |
| System | Snackbars, skeleton loaders, 404 page, "not found" states |

## 5. Important observations / defects found in the live site (fix these in the rebuild)

1. **RTL layout with English text.** The app is forced into an Arabic/RTL locale, so everything is right-aligned, rows are mirrored, back arrows point right, and punctuation renders on the wrong side (e.g. ".Your next training session will appear here", "?How would you like to continue", "PM 6:30", "Months 3", "4444 3333 974+", "AM – 11:00 PM 6:00"). **Rebuild must be LTR for English and properly RTL only when Arabic is selected.**
2. **Arabic font missing.** On the Language page the "العربية" option renders as empty boxes (tofu) because the bundled fonts have no Arabic glyphs. Use an Arabic-capable font (e.g. *Noto Kufi Arabic*, *IBM Plex Sans Arabic*, *Tajawal*) when Arabic is enabled.
3. **Selected time slot is lost.** On the session booking screen, pressing **Continue** clears the selected time, so Checkout shows `Time: —` and the saved booking has `timeLabel: null`. The rebuild must keep the selected slot.
4. **Sign-in loop.** On "How would you like to continue?", choosing *Sign In* → signing in returns to the same screen with *Sign In* still selected; pressing the button opens Sign In again. After a successful sign-in the flow should go straight to Checkout.
5. **"Create Account" has no registration** — it simply opens the Sign In screen.
6. **Any credentials sign in.** No real authentication; the display name becomes the email's local part (e.g. `test@oneq.qa` → "test"), and after an app restart it shows "Member".
7. **Phone validation is weak.** Rule is "≥ 8 digits after stripping non-digits" — the pre-filled `+974 ` already supplies 3 digits, so only 5 more are required. Rebuild: require exactly 8 local digits.
8. **Membership bookings have no date** and therefore never move to "Past".
9. **No cancellation / reschedule** of bookings despite a `cancelled` status existing in the model.
10. **"Add to Calendar"** only shows a snackbar "Calendar integration will be available soon."
11. **"Forgot password?"** only shows "A reset link has been sent." without asking for anything.
12. **Classes** category is a "coming soon" placeholder.
13. The "Train with a Personal Trainer" card shows **"From QAR 499 / month"** (a per-gym field) but the trainer flow actually charges a **per-session** price (e.g. QAR 210 / session). Pricing copy is inconsistent.
14. The PWA manifest still has Flutter defaults (name "oneq", blue `#0175C2`, "A new Flutter project.").

## 6. Target of this documentation

Rebuild OneQ as a **production iOS + Android app** with a real backend, keeping the same information architecture, copy, visual language and flows — while fixing the defects above and adapting the UI to native mobile patterns. See `10-MOBILE-APP-REQUIREMENTS.md`, `11-API-AND-BACKEND-REQUIREMENTS.md` and `12-CLAUDE-CODE-BUILD-INSTRUCTIONS.md`.

## 7. File index

| File | Contents |
|---|---|
| 01-PROJECT-OVERVIEW.md | This file |
| 02-SCREEN-INVENTORY.md | Every screen, with the 10-point spec per screen |
| 03-NAVIGATION.md | Route map, tab bar, stack behaviour, deep links, redirects |
| 04-BOOKING-FLOW.md | Membership and trainer-session flows step by step, pricing & slot rules |
| 05-FEATURES.md | Feature-by-feature functional spec (search, filters, favorites, auth, payments…) |
| 06-FORMS-AND-FIELDS.md | Every form/input, validation rules, messages |
| 07-UI-DESIGN-SYSTEM.md | Colors, typography, spacing, radii, components, icons, motion |
| 08-USER-FLOWS.md | End-to-end user journeys and edge cases |
| 09-DATA-MODELS.md | Entities, fields, enums, full seed data, persistence keys |
| 10-MOBILE-APP-REQUIREMENTS.md | Mobile adaptation, native features, non-functional requirements |
| 11-API-AND-BACKEND-REQUIREMENTS.md | Backend schema, endpoints, payments, notifications, admin |
| 12-CLAUDE-CODE-BUILD-INSTRUCTIONS.md | The implementation brief for Claude Code |
