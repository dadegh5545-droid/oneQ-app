# 03 — Navigation

## 1. Route table (live web app, go_router, hash URLs)

```
/splash                         → S01 Splash (initial location)
ShellRoute (StatefulShellRoute, 4 branches, bottom tab bar, state kept per tab)
 ├─ /home                       → S02–S06 Home
 ├─ /bookings                   → S16 Bookings
 ├─ /favorites                  → S18 Favorites
 └─ /profile                    → S19 Profile
/gym/:id                        → S07 Gym Detail
   ├─ /gym/:id/plans            → S08 Choose a Plan
   └─ /gym/:id/trainers         → S09 Choose Your Trainer
/trainer/:id                    → S10 Trainer Profile
/booking                        → S11 Book a Session (reads booking draft)
/guest                          → S12 Continue as Guest / Sign In
/checkout                       → S14 Checkout (reads booking draft)
/success/:id                    → S15 Booking Success
/booking-details/:id            → S17 Booking Details
/sign-in                        → S13 Sign In
/info/:slug                     → S20 Info page (help | language | terms | privacy | fallback)
*                               → S21 Page Not Found
```

Screens outside the shell are full-screen (no tab bar) and are pushed on top of the current tab.

## 2. Bottom tab bar

| Order (LTR) | Label | Icon inactive | Icon active | Route |
|---|---|---|---|---|
| 1 | Home | home (outlined) | home (filled) | /home |
| 2 | Bookings | calendar (outlined) | calendar (filled) | /bookings |
| 3 | Favorites | heart (outlined) | heart (filled) | /favorites |
| 4 | Profile | person (outlined) | person (filled) | /profile |

- Height 64 pt + safe area; background `surface` (warm off-white), 1 pt top border.
- Active: icon + label in `primary`, label weight 600, small **indicator bar** (≈ 16 × 2 pt, rounded) under the label.
- Inactive: muted grey icon + label.
- Tapping the active tab again: pops to the tab root (recommended; web keeps branch state).
- The live site mirrors the order because of RTL (Home appears on the right). In the rebuild, LTR = Home on the left; RTL (Arabic) = mirrored.

## 3. Push / replace behaviour

| From | Action | Method | To |
|---|---|---|---|
| Splash | timer | replace | /home |
| Any gym card | tap | push | /gym/:id (also resets booking draft to this gym) |
| Gym Detail | Gym Membership card / plan row / View all plans | push | /gym/:id/plans |
| Gym Detail | Personal Trainer card | push | /gym/:id/trainers |
| Trainer list | card | push | /trainer/:id |
| Trainer profile | Book a Session | push | /booking |
| Plans / Booking | Continue (not signed-in or no guest details) | push | /guest |
| Plans / Booking | Continue (signed-in AND guest details exist) | push | /checkout |
| Guest | Continue to Payment | push | /checkout |
| Guest | Sign In | push | /sign-in |
| Sign In | success | pop (or go /profile if nothing to pop) | previous |
| Checkout | Pay success | **go (replace entire stack)** | /success/:id |
| Success | View Booking | go | /booking-details/:id (no back arrow) |
| Success / Booking details | Back to Home | go | /home |
| Bookings | card | push | /booking-details/:id (with back arrow) |
| Empty states | Explore Gyms / Browse Gyms | go | /home |
| Booking not found | Bookings | go | /bookings |
| Profile | rows | push | /info/help, /info/language, /info/terms, /info/privacy |
| Profile | Sign In / Create Account | push | /sign-in |

## 4. App bars

- Tab roots (Home, Bookings, Favorites, Profile): no app bar; large Playfair title in content.
- Pushed screens: transparent app bar, height 56, back icon button (40 × 40) at leading edge, optional centered/leading title in Outfit 18 semibold (e.g. gym name, "Checkout", "Booking", "Book with Omar").
- Gym Detail: no app bar — floating circular Back and Favorite buttons over the hero image.
- Back tooltip (live, Arabic locale): "رجوع". In the rebuild use "Back" / "رجوع" per locale.

## 5. Guards / redirects to implement in the mobile app

| Route | Guard |
|---|---|
| Booking (S11) | requires draft.gym and draft.trainer, else show "Nothing to book" state |
| Checkout (S14) | requires draft.gym and draft.guest (or signed-in user), else "Checkout unavailable" |
| Guest (S12) | skip automatically if the user is signed in with a complete profile |
| Success (S15) | if booking id unknown → Bookings |
| Deep links | `oneq://gym/{id}`, `oneq://trainer/{id}`, `oneq://booking/{id}`, and universal links `https://oneq.qa/...` (domain TBD) |

## 6. Android back / iOS swipe-back

- System back pops the pushed stack; on a tab root it switches to Home; on Home it exits.
- On S15 Success, back goes to Home (not to Checkout).
- Swipe-back enabled everywhere except S15 and during payment processing.

## 7. Recommended mobile navigation structure (Expo Router)

```
app/
  _layout.tsx                 (providers, fonts, theme, i18n, RTL)
  index.tsx                   (redirect → /(tabs)/home after splash)
  (tabs)/_layout.tsx          (bottom tabs)
  (tabs)/home.tsx
  (tabs)/bookings.tsx
  (tabs)/favorites.tsx
  (tabs)/profile.tsx
  gym/[id]/index.tsx
  gym/[id]/plans.tsx
  gym/[id]/trainers.tsx
  trainer/[id].tsx
  booking/index.tsx
  checkout/guest.tsx
  checkout/index.tsx
  checkout/success/[id].tsx   (presentation: fullScreenModal, gestureEnabled: false)
  bookings/[id].tsx
  auth/sign-in.tsx            (presentation: modal)
  auth/sign-up.tsx            (new)
  auth/forgot-password.tsx    (new)
  info/[slug].tsx
  +not-found.tsx
```
