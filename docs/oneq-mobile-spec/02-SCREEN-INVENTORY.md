# 02 — Screen Inventory

All copy below is **verbatim** from the live app (punctuation shown in correct LTR order). Positions refer to a 390 × 844 pt phone.
Screen IDs (S01…S21) are referenced across all other documents.

| ID | Screen | Web route | Shell |
|---|---|---|---|
| S01 | Splash | `/splash` (initial) | none |
| S02 | Home (All) | `/home` | Tab 1 |
| S03 | Home — Gyms category | `/home` (chip state) | Tab 1 |
| S04 | Home — Trainers category | `/home` (chip state) | Tab 1 |
| S05 | Home — Classes category | `/home` (chip state) | Tab 1 |
| S06 | Home — Search results / No results | `/home` (query state) | Tab 1 |
| S07 | Gym Detail (Overview / Reviews / Memberships) | `/gym/:id` | pushed, full-screen |
| S08 | Choose a Plan | `/gym/:id/plans` | pushed |
| S09 | Choose Your Trainer | `/gym/:id/trainers` | pushed |
| S10 | Trainer Profile | `/trainer/:id` | pushed |
| S11 | Book a Session (date & time) | `/booking` | pushed |
| S12 | How would you like to continue? (Guest / Sign In) | `/guest` | pushed |
| S13 | Sign In | `/sign-in` | pushed |
| S14 | Checkout | `/checkout` | pushed |
| S15 | Booking Success | `/success/:id` | replaces stack |
| S16 | Bookings (Upcoming / Past) | `/bookings` | Tab 2 |
| S17 | Booking Details | `/booking-details/:id` | pushed |
| S18 | Favorites | `/favorites` | Tab 3 |
| S19 | Profile (signed-out / signed-in) | `/profile` | Tab 4 |
| S20 | Info page (Help, Language, Terms, Privacy, fallback) | `/info/:slug` | pushed |
| S21 | Page Not Found | any unknown route | none |

Global overlays: **Snackbar** (floating, dark, 4 s), **Skeleton loaders**, **Button loading state**.

---

## S01 — Splash

1. **Name:** Splash
2. **Purpose:** Brand intro while the app initialises (loads local storage: favorites, bookings, sign-in flag).
3. **UI elements:** Full-bleed burgundy background (`primary`). Centered wordmark. Thin cream underline (≈ 68 × 1 pt) under the wordmark.
4. **Text:** Stage 1: "One" fades in (cream, ~40 % opacity → 100 %). Stage 2: "Q" appears to complete **"OneQ"** (Playfair Display, ~64 pt, cream). (The live site shows "QOne" due to the RTL bug.)
5. **Buttons/actions:** none.
6. **Inputs:** none.
7. **Navigation:** Automatically transitions to **S02 Home** (~2.5–3 s total). Transition: the Home screen is revealed behind a fading/scaling burgundy overlay (the home UI is visible through a translucent burgundy layer, then it clears).
8. **Data required:** local prefs (favorites, bookings, signed-in flag).
9. **States:** only one.
10. **Mobile UX:** Use the native splash (burgundy + wordmark) then an in-app animated splash of ≤ 1.5 s; skip animation on subsequent warm launches. Respect "Reduce Motion".

---

## S02 — Home (category "All")

1. **Name:** Home
2. **Purpose:** Discovery hub: search, category switch, featured and nearby gyms.
3. **UI elements (top → bottom):**
   - Small wordmark **"OneQ"** (Playfair Display 22 pt, primary color) aligned to the leading edge.
   - Greeting (muted, 15 pt): **"Good evening"** (time-of-day greeting; implement Good morning / Good afternoon / Good evening).
   - Headline (Playfair Display ~30 pt, bold): **"Find your perfect workout"**
   - Search field (height 48, radius 16, surface fill, 1 pt border, search icon at trailing edge): placeholder **"Search gyms or locations"**. Focus state: 1.2 pt primary border.
   - Category chips (pill, height 37): **All** (selected: filled primary, white text) · **Gyms** · **Classes** · **Trainers** (unselected: surface fill, 1 pt border, dark text).
   - Section title **"Featured Gyms"** (Outfit 18–20 pt semibold).
   - Horizontal carousel of **Featured Gym cards** (≈ 228 × 287): image 228 × 200 (radius 16) with circular favorite button (40 × 40, translucent dark/grey fill, white heart) at top-leading corner; below: gym name (Outfit 20 semibold), "Area, Doha" (muted), bottom row: price **"QAR 299 / month"** (primary color, bold) and rating "4.9 ★" (star in accent orange).
   - Section title **"Near You"**.
   - Horizontal carousel of **compact gym cards** (≈ 220 × 88): 88 × 88 image (radius 12) + name, "Area, Doha", rating.
   - Bottom tab bar (see 03-NAVIGATION).
4. **Text content:** as above. Featured = Power House, Oxygen Gym. Near You = Arena Fitness, Peak Performance, Core Studio.
5. **Buttons/actions:** Search field (live filter) · Chips (switch category) · Favorite heart (toggle, persists) · Featured card tap → S07 · Near You card tap → S07.
6. **Inputs:** Search text.
7. **Navigation:** card → `/gym/:id` (also resets the booking draft and sets the gym). Tabs → other tabs.
8. **Data:** gyms list (id, name, area, rating, monthlyPrice, images[0], isFeatured, isNearby), favorites set, current time (greeting).
9. **States:** Loading → skeleton blocks for cards. Error → icon + **"Unable to load gyms"** / **"Please try again in a moment."** + Retry. Empty featured/near sections are hidden.
10. **Mobile UX:** Make the header collapse into a compact sticky search bar on scroll; pull-to-refresh; carousels snap per card with peek of next card; "Near You" should use real device location (permission prompt) with distance labels; large-title iOS style.

---

## S03 — Home, category "Gyms"

1. **Purpose:** Full vertical list of all gyms.
2. **UI:** Same header/search/chips (Gyms selected). Section title **"Gyms"**. Vertical list of **Gym list cards** (full width 350 × 114, radius 16, surface, 1 pt border): trailing 80 × 80 image (radius 12); name (Outfit 18 semibold); "Area, Doha" (muted); meta row "4.9 ★ · 128 reviews"; favorite heart icon button (outlined, 40 × 40) at the leading edge — filled primary when favorited.
3. **Data shown (all 6):** Power House (West Bay, 4.9, 128 reviews) · Oxygen Gym (Lusail, 4.8, 96) · Arena Fitness (The Pearl, 4.7, 84) · Peak Performance (Al Waab, 4.8, 73) · Core Studio (Msheireb, 4.6, 51) · Atlas Athletics (Al Sadd, 4.5, 112).
4. **Actions:** card → S07; heart → toggle favorite.
5. **States:** loading skeleton rows; error "Unable to load gyms / Please try again in a moment."
6. **Mobile UX:** add sort (Rating, Price, Distance) and a map toggle.

---

## S04 — Home, category "Trainers"

1. **Purpose:** Trainers are only bookable through a gym, so this tab asks the user to pick a gym first.
2. **UI:** Helper text (muted): **"Choose a gym to explore its trainers."** Then section title **"Gyms"** and the same gym list cards as S03.
3. **Actions:** card → S07 (user then chooses "Train with a Personal Trainer").
4. **Mobile UX (recommended upgrade):** show a real trainer directory (all trainers with gym name) with specialty filters; tapping a trainer opens S10 with the gym context pre-set.

---

## S05 — Home, category "Classes"

1. **Purpose:** Placeholder for future group classes.
2. **UI:** Card (surface, radius 20, border) centered content: round icon container (64 pt, tinted `surfaceVariant`) with a "groups" icon; title **"Classes"** (Playfair 24); body **"Group training experiences are coming soon."** and **"Discover gyms and personal trainers in the meantime."** (muted, centered); full-width primary button **"Explore Gyms"**.
3. **Actions:** Explore Gyms → switches category to Gyms (S03).
4. **Mobile UX:** keep as placeholder or hide the chip until classes exist; optional "Notify me" toggle.

---

## S06 — Home, search results

1. **Purpose:** Live search across gyms.
2. **Behaviour:** As soon as the query is non-empty, the featured/near sections are replaced by title **"Results"** and a list of gym list cards. Matching is **case-insensitive substring** against gym **name**, **area** and the display location **"Area, Doha"** (so "doha" returns every gym, "lusail" returns Oxygen Gym). Address and description are **not** searched ("porto", "strength" → no results). Search applies regardless of the selected chip.
3. **No results state:** round tinted icon (search-off), title **"No gyms found"**, body **"Try another search or browse featured gyms."**
4. **Mobile UX:** add a clear (×) button, recent searches, debounce 250 ms, search trainers and specialties too, keyboard "Search" action dismisses keyboard.

---

## S07 — Gym Detail

1. **Name:** Gym Detail
2. **Purpose:** Present a gym and let the user choose Membership or Personal Trainer.
3. **UI elements:**
   - **Hero image carousel** (full width × 242, no radius), swipeable, page-dot indicator (active dot = elongated pill, white). Overlay buttons (40 × 40 circular, translucent): **Back** (arrow) and **Favorite** (heart; filled primary when saved).
   - Name (Playfair ~30), "Area, Doha" (muted), rating row "4.9 ★ · 128 reviews".
   - Section title **"Choose how you want to train"**.
   - **Path card 1 — "Gym Membership"**: subtitle **"Train independently with full gym access"**, price line **"From QAR 299 / month"** (primary, semibold), leading icon tile 40 × 40 (tinted bg, dumbbell icon), chevron. Unselected style: surface, 1 pt border.
   - **Path card 2 — "Train with a Personal Trainer"**: subtitle **"Choose from trainers available at this gym"**, **"From QAR 499 / month"**, icon tile (filled primary, person icon), chevron. Rendered highlighted (primary border) as the recommended option.
   - **Segmented tabs** (3 equal, height 41, container tinted, selected segment surface with primary text): **Overview · Reviews · Memberships**.
   - **Overview tab:**
     - **"About"** + description paragraph.
     - **"Facilities"** — wrap of pill chips with label + icon: Weights, Cardio, Pool, Sauna, Locker Rooms, Parking (subset per gym).
     - **"Opening Hours"** — 7 rows: day (leading) and hours (trailing, muted): Saturday–Thursday "6:00 AM – 11:00 PM", Friday "8:00 AM – 10:00 PM".
     - **"Location"** — full address, e.g. "Tornado Tower, West Bay, Doha".
     - **"More photos"** — horizontal strip of thumbnails (148 × 108, radius 12).
   - **Reviews tab:** list of review cards: reviewer name (semibold), **"Verified"** badge (small tinted pill), rating value "5.0" with stars, review text, date "12 Jul 2026" (format `d MMM y`, muted). Empty: **"No reviews yet."** Error: **"Unable to load reviews"** / **"Reviews could not be loaded."**
   - **Memberships tab:** compact plan rows: "Monthly — QAR 299", "3 Months — Save 10% — QAR 807", "6 Months — Most Popular — QAR 1,399" and a text button **"View all plans"**. Error: **"Unable to load plans"**.
4. **Buttons/actions:** Back · Favorite toggle · Gym Membership card → S08 · Personal Trainer card → S09 · tabs · plan row → S08 with that plan preselected · View all plans → S08 · photo thumbnail → (recommended) full-screen gallery.
5. **Inputs:** none.
6. **Navigation:** `/gym/:id/plans`, `/gym/:id/trainers`.
7. **Data:** full Gym entity, reviews for gym, computed plans, favorites.
8. **States:** **Loading** — skeleton: grey hero block, two title bars, two large rounded card blocks. **Not found** — **"Gym not found"** / **"It may have been removed from the directory."** **Error** — **"Gym unavailable"** / **"This gym could not be loaded."** (+ Retry / Browse Gyms).
9. **Mobile UX:** collapsing hero (parallax) with a sticky header showing gym name; sticky bottom CTA bar with two buttons ("Membership" / "Book a Trainer"); tap address → open Apple/Google Maps; share button; call/WhatsApp gym.

---

## S08 — Choose a Plan

1. **Purpose:** Select a membership plan for the gym.
2. **UI:** App bar with back button and title = gym name ("Power House"). Headline **"Choose a plan"** (Playfair 28). Subtitle **"Select a membership at Power House"**. Three plan cards (radius 16):
   - **Monthly** — "Full gym access, billed every month." — **QAR 299**
   - **3 Months** — "A calmer commitment with a quieter monthly rate." — badge **"Save 10%"** (accent orange text) — **QAR 807**
   - **6 Months** — "The most considered way to settle into a routine." — badge **"Most Popular"** — **QAR 1,399**
   Price is trailing/opposite, primary color, 16 pt semibold. Selected card: primary border 1.4 pt and tinted background.
   Sticky bottom bar with full-width primary button **"Continue"** (disabled until a plan is selected — disabled style = primary at ~40 % opacity).
3. **Actions:** tap card → select (single choice). Continue → if signed-in **and** guest details exist → S14 Checkout, else → S12.
4. **Data:** plans computed from the gym's monthly price (see 04-BOOKING-FLOW §3).
5. **States:** loading spinner; error **"Plans could not be loaded."**; not available **"This membership is no longer available."**
6. **Mobile UX:** show per-month equivalent under multi-month plans ("QAR 269/mo"); haptic on selection.

---

## S09 — Choose Your Trainer

1. **Purpose:** List trainers working at the selected gym.
2. **UI:** App bar (back, title = gym name). Headline **"Choose your trainer"**, subtitle **"Available at Oxygen Gym"**. Horizontally scrollable filter chips: **All · Strength · Weight Loss · Mobility · Functional Training**. Trainer cards (350 × 135): trailing photo 82 × 82 (radius 12), name (semibold 18), primary specialty (muted), "4.9 ★ · 41 reviews", "8 yrs · QAR 210 / session", chevron.
3. **Filter logic:** chip "Strength" matches specialty "Strength Training"; others match exactly. Single-select; "All" clears.
4. **Actions:** chip → filter; card → S10 (sets trainer in draft, path = membership+trainer).
5. **States:** loading skeleton (3 rounded blocks); error **"Unable to load trainers"** / **"Please try again shortly."**; empty filter **"No trainers found"** / **"Try another specialty"**; no gym context **"Trainers are available through a selected gym."**; not found **"Gym not found"** / **"Please go back and try again."**
6. **Mobile UX:** sort by price/rating; show next available slot on each card.

---

## S10 — Trainer Profile

1. **Purpose:** Trainer detail and entry to session booking.
2. **UI:** App bar with back. Header row: portrait photo 118 × 132 (radius 16) + name (Playfair 28, wraps), title ("Performance Coach", muted), gym line "Oxygen Gym · Lusail", "4.9 ★ · 41 reviews". **Stats card** (3 columns with vertical dividers): **41 / Reviews**, **8 yrs / Experience**, **4.9 / Rating**. Sections: **"About"** (bio), **"Specialties"** (chips), **"Experience & certifications"** (rows: "Experience — 8 years", "Certification — Certified Personal Trainer", …), **"Languages"** (chips), **"Client Reviews"** (review cards, same as S07). Sticky bottom primary button **"Book a Session · QAR 210"**.
3. **Actions:** Book a Session → if a gym is in the booking draft → S11; otherwise snackbar **"Please choose this trainer from a gym first."**
4. **States:** skeleton (photo block + bars); **"Trainer not found"** / **"This profile is no longer available."**; **"Trainer unavailable"** / **"Please return to the gym and try again."**; reviews error **"Reviews could not be loaded."**
5. **Mobile UX:** allow booking from any entry point (resolve gym from trainer.gymId automatically — remove the snackbar dead-end).

---

## S11 — Book a Session

1. **Purpose:** Pick date and time for a 1-to-1 session.
2. **UI:** App bar title **"Book with Omar"** (first name). Month label **"September 2026"** (Playfair 24; follows selected date, format `MMMM y`). **Date strip**: 14 horizontally scrolling day tiles (58 × 76, radius 14) — weekday abbreviation ("Fri") above day number ("25"). Selected = filled primary with white text; Sundays = disabled (tinted, muted text, not tappable). **"Available Times"** — wrap of time pills (height 37, radius 12): 9:00 AM · 10:30 AM · 12:00 PM · 4:00 PM · 6:30 PM · 8:00 PM; unavailable pills are tinted with **strikethrough** text and not tappable; selected = primary fill. **Booking Summary** card rows: Gym, Trainer, Date ("25 Sep 2026"), Time ("Select a time" until chosen), divider, Sessions "1 Session", Price "QAR 210". Sticky **"Continue"** (disabled until a time is selected).
3. **Rules:** see 04-BOOKING-FLOW §4 (Sunday closed; Fri/Sat 9:00 AM and 4:00 PM unavailable; other days 12:00 PM unavailable).
4. **Actions:** date tile → select date (clears time); time pill → select; Continue → S14 if signed-in with guest details, else S12.
5. **States:** time loading spinner; error **"Times could not be loaded."**; missing context **"Nothing to book"** / **"Choose a gym and trainer to continue."** + **"Browse Gyms"**.
6. **Mobile UX:** calendar sheet for dates beyond 14 days; grey-out past times for today; show trainer mini-card at top.

---

## S12 — How would you like to continue?

1. **Purpose:** Choose guest checkout or sign-in; capture guest details.
2. **UI:** App bar with back only. Headline **"How would you like to continue?"** (Playfair 28). Two **radio option cards** (radius 16, 82 tall): **"Continue as Guest"** / "No account required." and **"Sign In"** / "Use an existing OneQ account." Selected card: primary 1.2 pt border + filled radio icon. When Guest is selected, the form appears: **Full Name**, **Phone Number** (pre-filled "+974 ", hint "+974 3000 0000"), **Email (optional)**. Sticky button label changes: **"Continue to Payment"** (guest) / **"Sign In"** (sign-in option).
3. **Actions:** Continue to Payment → validate → save guest in draft → S14. Sign In → S13.
4. **Validation:** see 06-FORMS §2.
5. **States:** inline field errors (red text under fields, red borders).
6. **Mobile UX:** if already signed in, skip this screen; use native phone keyboard, autofill (`name`, `tel`, `email` content types), prefill from account.

---

## S13 — Sign In

1. **UI:** App bar with back. Headline **"Welcome back"**, body **"Sign in to manage your bookings, favorites and account."** Fields: **"Email or phone number"**, **"Password"** (obscured, eye toggle icon at leading/trailing edge). Text button **"Forgot password?"** (primary color, right-aligned). Primary button **"Sign In"**. Outlined button **"Create Account"**.
2. **Actions:** Sign In → validate → mark signed-in → pop back (or go to Profile if nothing to pop). Forgot password → snackbar **"A reset link has been sent."** Create Account → (live) opens Sign In; (rebuild) → Create Account screen.
3. **Validation errors:** "Please enter your email or phone number", "Please enter your password".
4. **Mobile UX:** add Sign in with Apple / Google, OTP by SMS for phone (Qatar users), biometric unlock.

---

## S14 — Checkout

1. **UI:** App bar back + title **"Checkout"**. **Booking Summary** card: rows (label muted on one side, value bold on the other): *Membership:* Gym, Plan, Guest, divider, **Total** (primary). *Session:* Gym, Trainer, Date (`d MMM y`), Time, Guest, divider, Total. Section **"Payment method"**: selectable rows (height 50, radius 16): **Card** (credit-card icon) always; **Apple Pay** only on iOS/macOS; **Google Pay** only on Android. Selected row: tinted background, primary border, filled radio. Sticky primary button **"Pay QAR 807"** (shows spinner while processing, ~0.9 s simulated).
2. **Actions:** Pay → create booking → clear draft → **replace** stack with S15. On failure: snackbar **"Payment could not be completed."**
3. **States:** missing gym or guest → **"Checkout unavailable"** / **"Complete your booking details first."** + **"Browse Gyms"**.
4. **Mobile UX:** native Apple Pay / Google Pay sheets, Stripe/Tap/CyberSource card sheet, 3-D Secure, price breakdown, promo code (optional).

---

## S15 — Booking Success

1. **UI:** No app bar. Animated success badge (72 pt circle, pale green, check mark in green; scale-in). Title **"You're booked!"** (Playfair 28). Subtitle — membership: **"Your membership at Power House is confirmed."**; session: **"Your session with Omar has been confirmed."** Summary card (centered text): membership → plan name, gym name, "Area, Doha", price; session → trainer name, date (`d MMMM y`), time (if any), gym, location, price. Buttons: primary **"View Booking"**, outlined **"Add to Calendar"**, text **"Back to Home"**.
2. **Actions:** View Booking → S17; Add to Calendar → snackbar "Calendar integration will be available soon." (rebuild: native calendar); Back to Home → S02.
3. **States:** booking id not found → redirect to Bookings.
4. **Mobile UX:** success haptic, confetti-free subtle animation, prompt to enable push reminders.

---

## S16 — Bookings

1. **UI:** Large title **"Bookings"** (Playfair 28). Segmented control (2 equal tabs): **Upcoming** (default) · **Past**. List of **Booking cards** (radius 16, border): trailing 72 × 88 image (trainer photo for sessions, gym photo for memberships); title = trainer name, else plan name, else "Membership"; subtitle = gym name; for sessions a time label (e.g. "6:30 PM"); status chip (**Confirmed** / **Completed**; pale green bg, green text); for dated bookings a leading **date badge** (day number in Playfair 22 + month uppercase "SEP"); chevron.
2. **Ordering:** most recently created first.
3. **Upcoming vs Past rule:** status completed or cancelled → Past. No date → Upcoming (if confirmed). Dated → Upcoming while `date 23:59 ≥ now`, else Past.
4. **Empty states:** Upcoming — calendar icon, **"No upcoming bookings"**, **"Your next training session will appear here."**, button **"Explore Gyms"** (→ Home). Past — **"No past bookings"**, **"Completed visits will be kept here."** (no button).
5. **Error:** **"Unable to load bookings"** / **"Please try again."** + **"Retry"**.
6. **Actions:** card → S17.
7. **Mobile UX:** pull-to-refresh, swipe actions (Cancel/Reschedule for upcoming), countdown "In 2 days", reminders.

---

## S17 — Booking Details

1. **UI:** App bar (back when pushed) + title **"Booking"**. **Booking Summary** card rows (only those that exist): Gym, Location, Trainer, Plan, Date (`d MMMM y`), Time, Guest, Phone, Status ("Confirmed"/"Completed"), divider, Total. Buttons: outlined **"Add to Calendar"**, primary **"Back to Home"**.
2. **States:** **"Booking not found"** / **"It may have been removed from this device."** + **"Bookings"** button; error **"Unable to load booking"** / **"Please try again from your bookings tab."**
3. **Mobile UX:** add QR/check-in code, directions, contact gym, cancel/reschedule, receipt download.

---

## S18 — Favorites

1. **UI:** Title **"Favorites"**, subtitle **"Gyms you have saved for later."** List of gym list cards (same as S03) with filled heart.
2. **Actions:** heart → remove immediately; card → S07.
3. **Empty:** heart icon, **"No favorites yet"**, **"Save gyms you love and find them here."**, button **"Browse Gyms"** (→ Home). **Error:** **"Unable to load favorites"**.
4. **Mobile UX:** undo snackbar after removal; sync favorites to account.

---

## S19 — Profile

1. **UI:** Title **"Profile"**. Account card (surface, radius 16, border):
   - *Signed out:* **"Welcome to OneQ"** (Playfair 22), **"Sign in to manage your bookings and preferences."**, primary **"Sign In"**, outlined **"Create Account"**.
   - *Signed in:* wordmark **"OneQ"** (primary), display name (e.g. "test"; default "Member"), **"Signed in"** (muted), outlined **"Sign out"**.
   - Section labels (uppercase, small, letter-spaced, muted): **SUPPORT** → row **"Help & Support"**; **SETTINGS** → row **"Language"** with value **"English"**; **LEGAL** → rows **"Terms & Conditions"**, **"Privacy Policy"**. Rows are 56 tall with chevron.
2. **Actions:** Sign In / Create Account → S13; Sign out → immediate sign-out (no confirm); rows → S20.
3. **Mobile UX:** avatar, edit profile, payment methods, notification settings, dark mode, delete account (App Store requirement), app version.

---

## S20 — Info page

App bar with back + title. Body text (Outfit 16, line-height 1.5, padded 20).

| Slug | Title | Body |
|---|---|---|
| `help` | Help & Support | "Our team can help with bookings, memberships, and visits. Reach out and we will get back to you shortly." |
| `language` | Language | "OneQ is currently available in English. Arabic support is coming soon." + two option rows: **English** (selected, check icon, primary border) and **العربية** (radio, unselected) — display-only |
| `terms` | Terms & Conditions | "By booking through OneQ you agree to the membership and session terms of your selected gym, including house rules, cancellation windows, and studio policies." |
| `privacy` | Privacy Policy | "OneQ uses your details only to complete bookings, confirm visits, and support your account. We do not sell your personal information." |
| anything else | OneQ | "Find gyms and personal trainers across Doha, then book with confidence." |

**Mobile UX:** Help should offer Call / WhatsApp / Email buttons and FAQ; Language should actually switch EN/AR (RTL).

---

## S21 — Page Not Found

Title **"Page Not Found"**, error text (e.g. "GoException: no routes for location: /zzz"), text button **"Home"**. In the mobile app, replace with a friendly "Something went wrong" + Home button; never show exception text.

---

## Global components & states

- **Snackbar**: floating, near-black rounded rectangle (radius 12), white text, 4 s. Messages: "A reset link has been sent.", "Calendar integration will be available soon.", "Please choose this trainer from a gym first.", "Payment could not be completed."
- **Skeleton loaders**: tinted (`surfaceVariant`) rounded rectangles matching the final layout, no shimmer text.
- **Image loading**: tinted placeholder with a small primary circular progress indicator in the center.
- **Empty/Error state component**: 64 pt tinted circle with primary icon, Playfair title 24, muted body, optional primary button.
