# 08 — User Flows (journeys)

Each flow lists steps with screen IDs (see 02). ✅ = verified end-to-end on the live site.

## UF-01 First launch → browse ✅
1. Launch → S01 Splash (≈2.5 s) → S02 Home ("Good evening", "Find your perfect workout").
2. Scroll Featured Gyms (Power House, Oxygen Gym) and Near You (Arena Fitness, Peak Performance, Core Studio).
3. Tap a card → S07 Gym Detail (skeleton first, then content).

## UF-02 Search ✅
1. S02 → tap search → type "Lusail" → section becomes "Results" with Oxygen Gym.
2. Type "doha" → all gyms. Type "porto" / "zzz" → "No gyms found".
3. Clear the field → Featured / Near You return.

## UF-03 Browse by category ✅
- Gyms chip → S03 full list (6 gyms).
- Trainers chip → S04 "Choose a gym to explore its trainers." + gym list.
- Classes chip → S05 coming-soon card → Explore Gyms → S03.

## UF-04 Save a favorite ✅
1. Tap heart on any gym card (Home list or Gym Detail) → heart fills (primary). Persisted.
2. Favorites tab → S18 shows the gym. Tap heart → removed; list empty → "No favorites yet" + Browse Gyms.

## UF-05 Buy a membership as a guest ✅
1. S07 Power House → "Gym Membership" (or Memberships tab → View all plans).
2. S08 → select "3 Months" (QAR 807) → Continue.
3. S12 → Continue as Guest → submit empty → errors "Please enter your full name", "Enter a valid Qatar phone number".
4. Enter "Test User", phone "3333 4444" → Continue to Payment.
5. S14 Checkout: Gym Power House · Plan 3 Months · Guest Test User · Total QAR 807 · Payment method Card → **Pay QAR 807**.
6. Spinner ≈0.9 s → S15 "You're booked!" "Your membership at Power House is confirmed." Card: 3 Months / Power House / West Bay, Doha / QAR 807.
7. View Booking → S17 (Gym, Location, Plan, Guest, Phone "+974 3333 4444", Status Confirmed, Total). Add to Calendar → snackbar.
8. Bookings tab → Upcoming shows "3 Months · Power House · Confirmed".

## UF-06 Book a personal-trainer session ✅
1. S07 Oxygen Gym → "Train with a Personal Trainer".
2. S09 → Omar Al-Kuwari, Sofia Moretti. Filter "Functional Training" → only Omar.
3. Tap Omar → S10 profile → "Book a Session · QAR 210".
4. S11 "Book with Omar" → Fri 25 selected by default; Sun 27 disabled; 9:00 AM and 4:00 PM struck through (weekend) → choose 6:30 PM → summary shows Time 6:30 PM → Continue.
5. S12 / S13 or directly S14 if signed in.
6. S14 → Pay QAR 210 → S15 "Your session with Omar has been confirmed." (trainer, date "25 September 2026", gym, location, price).
7. Bookings → Upcoming card with date badge "25 SEP".
> Live bug: time is lost at step 4 → Checkout "Time —". Rebuild must keep it.

## UF-07 Sign in during checkout ✅
1. S12 → select "Sign In" → button "Sign In" → S13.
2. Submit empty → "Please enter your email or phone number", "Please enter your password".
3. "Forgot password?" → snackbar "A reset link has been sent."
4. Enter any email + password → Sign In → returns to S12 (live).
5. Rebuild: return straight to S14 with account details.

## UF-08 Sign in / out from Profile ✅
1. Profile (signed out): "Welcome to OneQ" → Sign In → S13 → success → back to Profile.
2. Profile (signed in): "OneQ / test / Signed in / Sign out".
3. Sign out → immediately returns to signed-out card.

## UF-09 View past bookings ✅ (with seeded data)
1. Bookings → Past → card "James Mitchell · Power House · 6:30 PM · Completed" with badge "10 SEP".
2. Tap → S17 with Trainer, Date "10 September 2026", Time "6:30 PM", Status Completed.
3. Past empty → "No past bookings / Completed visits will be kept here."

## UF-10 Info pages ✅
Profile → Help & Support / Language / Terms & Conditions / Privacy Policy → S20 text; Language shows English (✓) and العربية (radio).

## UF-11 Error & edge journeys ✅
- Deep link to unknown booking → "Booking not found" + Bookings button.
- Unknown gym id → skeleton → "Gym not found".
- Unknown trainer id → person-off icon + "Trainer not found".
- Unknown route → "Page Not Found" + Home.
- Open trainer without gym context → Book a Session → snackbar "Please choose this trainer from a gym first."
- Open /checkout with empty draft → "Checkout unavailable".

## UF-12 (Rebuild) New account
Profile → Create Account → form → OTP → signed in → Profile shows name → future checkouts skip guest step.

## UF-13 (Rebuild) Cancel / reschedule
Bookings → Upcoming session → Details → "Cancel booking" (allowed until 12 h before) → confirm → status Cancelled (moves to Past, refund per policy) · or "Reschedule" → S11 prefilled → confirm.

## UF-14 (Rebuild) Reminder & review
Push 24 h before: "Tomorrow 6:30 PM with Omar at Oxygen Gym". After session: status Completed → push "How was your session?" → review form → appears on trainer profile with Verified badge.

## UF-15 (Rebuild) Arabic
Profile → Language → العربية → app restarts in RTL with Arabic copy and fonts; bookings/dates localised.
