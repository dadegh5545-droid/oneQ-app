# 04 — Booking Flow

OneQ has **two booking paths**, both starting on the Gym Detail screen (S07) under **"Choose how you want to train"**.

```
                        ┌─────────────────────────┐
 Home / Favorites ────▶ │ S07 Gym Detail          │
                        └──────┬───────────┬──────┘
          "Gym Membership"     │           │   "Train with a Personal Trainer"
                               ▼           ▼
                    S08 Choose a plan   S09 Choose your trainer ──▶ S10 Trainer profile
                               │                                        │ "Book a Session · QAR x"
                               │                                        ▼
                               │                               S11 Book a Session (date + time)
                               └──────────────┬─────────────────────────┘
                                              ▼  Continue
                        signed-in & guest known? ── yes ──▶ S14 Checkout
                                              │ no
                                              ▼
                               S12 How would you like to continue?
                                 ├─ Continue as Guest → form → Continue to Payment → S14
                                 └─ Sign In → S13 → back
                                              ▼
                                 S14 Checkout → Pay QAR x (≈0.9 s)
                                              ▼
                                 S15 You're booked! → View Booking (S17) / Add to Calendar / Back to Home
```

## 1. Booking draft (in-memory state that drives the flow)

| Field | Type | Set by |
|---|---|---|
| gym | Gym | tapping any gym card (resets the whole draft, keeps guest) |
| path | `membership` \| `membershipPlusTrainer` | plan selection / trainer selection |
| plan | MembershipPlan? | S08 selection |
| trainer | Trainer? | S09 card tap |
| date | Date? | S11 date strip (defaults to first non-Sunday day ≥ today) |
| slot | TimeSlot? | S11 time pill |
| guest | GuestInfo? (fullName, phone, email?) | S12 form or sign-in |
| paymentMethod | `card` \| `applePay` \| `googlePay` (default card) | S14 |

**Total price**: membership path → `plan.price` (fallback gym.monthlyPrice); trainer path → `trainer.pricePerSession`.

The draft survives navigation; the guest info is re-used to pre-fill S12 next time. After successful payment the draft is cleared (guest info kept).

## 2. Path A — Gym Membership

1. **S07** → tap **Gym Membership** card (or a plan row in the Memberships tab, or **View all plans**).
2. **S08 Choose a plan** — select Monthly / 3 Months / 6 Months. **Continue** is disabled until selected.
3. Continue → **S12** (or **S14** directly if signed in and guest info exists).
4. **S12** Guest form → **Continue to Payment**.
5. **S14 Checkout** — Summary rows: Gym, Plan, Guest, Total. Choose payment method. **Pay QAR 807**.
6. Booking created: `type=membership`, `planId`, `planName`, `date=null`, `timeLabel=null`, `sessionCount=1`, `status=confirmed`.
7. **S15** "Your membership at Power House is confirmed."

## 3. Membership plan pricing (exact formula from the app)

For each gym, with `m = gym.monthlyPrice` (QAR):

| Plan id | Name | Price | Description | Badge |
|---|---|---|---|---|
| `{gymId}-monthly` | Monthly | `m` | Full gym access, billed every month. | — |
| `{gymId}-3m` | 3 Months | `round(m × 3 × 0.90)` | A calmer commitment with a quieter monthly rate. | Save 10% |
| `{gymId}-6m` | 6 Months | `round(m × 6 × 0.78)` | The most considered way to settle into a routine. | Most Popular |

Resulting prices:

| Gym | Monthly | 3 Months | 6 Months | "Personal Trainer from" label |
|---|---|---|---|---|
| Power House | 299 | 807 | 1,399 | 499 / month |
| Oxygen Gym | 349 | 942 | 1,633 | 549 / month |
| Arena Fitness | 279 | 753 | 1,306 | 479 / month |
| Peak Performance | 259 | 699 | 1,212 | 459 / month |
| Core Studio | 229 | 618 | 1,072 | 429 / month |
| Atlas Athletics | 199 | 537 | 931 | 399 / month |

Numbers are displayed with thousands separators (`en` locale): "QAR 1,399".

> Note: the 6-month discount is actually 22 % but is labelled "Most Popular", not "Save 22%". Keep or relabel per business decision.

## 4. Path B — Personal Trainer session

1. **S07** → tap **Train with a Personal Trainer**.
2. **S09** — list of that gym's trainers; optional specialty chip filter.
3. Tap trainer → **S10 Trainer profile** → **Book a Session · QAR 210**.
   - If there is no gym in the draft (trainer opened out of context) → snackbar "Please choose this trainer from a gym first." (Rebuild: auto-set gym from `trainer.gymId`.)
4. **S11 Book a Session**
   - **Date strip:** today + next 13 days (14 tiles). **Sundays are disabled.** Default selection: first day that isn't Sunday.
   - **Time slots** (same for every trainer), minutes after midnight → label:

     | Slot index | Minutes | Label |
     |---|---|---|
     | 0 | 540 | 9:00 AM |
     | 1 | 630 | 10:30 AM |
     | 2 | 720 | 12:00 PM |
     | 3 | 960 | 4:00 PM |
     | 4 | 1110 | 6:30 PM |
     | 5 | 1200 | 8:00 PM |

   - **Availability rule (mock):**
     - Friday or Saturday (Qatar weekend): slots **9:00 AM** and **4:00 PM** unavailable.
     - Monday–Thursday: slot **12:00 PM** unavailable.
     - Sunday: whole day disabled.
   - Slot id: `{ISO date}-{index}`. Label format: `h:mm AM/PM` (hour 0 → 12).
   - Changing date clears the selected time. **Continue** disabled until a time is selected.
   - Booking Summary updates live: Gym, Trainer, Date (`d MMM y`), Time ("Select a time"), Sessions "1 Session", Price.
5. Continue → **S12** or **S14** (same rule as Path A).
6. **S14 Checkout** — Summary: Gym, Trainer, Date, Time, Guest, Total.
7. Booking created: `type=session`, `trainerId`, `trainerName`, `date`, `timeLabel`, `sessionCount=1`, `priceQar=trainer.pricePerSession`, `status=confirmed`.
8. **S15** "Your session with Omar has been confirmed." (first name).

> **Bug in live site:** Continue on S11 resets the time slot, so Checkout shows "Time —" and the booking stores `timeLabel: null`. **Do not replicate.**

## 5. Guest vs Sign-in step (S12)

- Default option: **Continue as Guest**.
- Guest fields: Full Name (≥ 3 chars), Phone Number (Qatar), Email (optional, must contain "@").
- On submit: guest saved into draft as `{fullName (trimmed), phone (normalised to "+974 XXXX XXXX"), email or null}` → push Checkout.
- **Sign In** option: button label becomes "Sign In" → opens S13. On success the app stores `signedIn=true` and sets the draft guest to `{fullName: email local-part or the entered identifier, phone: identifier if it starts with "+", else "+974 ", email: identifier if it contains "@"}`.
- Rebuild: after sign-in go straight to Checkout; use the account's real name/phone; ask for phone if missing.

## 6. Checkout & payment (S14)

- Payment methods: **Card** (all platforms), **Apple Pay** (iOS/macOS only), **Google Pay** (Android only). Default: Card.
- **Pay** button: shows a spinner, waits (~900 ms simulated), creates booking with id `bk-{epochMillis}`, prepends it to the local bookings list, clears the draft (keeps guest), then **replaces** navigation with `/success/{id}`.
- On exception: button re-enabled + snackbar "Payment could not be completed."
- Rebuild: real payment intent (see 11-API §5), idempotency key, 3-D Secure, receipt.

## 7. Post-booking

- **S15 Success**: View Booking → S17; Add to Calendar → (rebuild) create native calendar event: title "OneQ — Session with {Trainer} at {Gym}" or "OneQ — {Plan} membership at {Gym}", location = gym address, start = date + slot, duration 60 min; Back to Home.
- **S16 Bookings**: booking appears first in Upcoming.
- Status lifecycle: `confirmed` → `completed` (after session time, set by backend) / `cancelled` (rebuild: user cancel within policy).

## 8. Edge cases to handle

| Case | Behaviour |
|---|---|
| Open /booking with no trainer or gym | "Nothing to book — Choose a gym and trainer to continue." + Browse Gyms |
| Open /checkout with no gym or guest | "Checkout unavailable — Complete your booking details first." + Browse Gyms |
| Booking id not found | "Booking not found — It may have been removed from this device." + Bookings |
| Slot becomes unavailable between selection and payment (rebuild) | Server rejects with 409 → return to S11 with message "That time was just booked. Please choose another." |
| Payment declined (rebuild) | Stay on Checkout, show the processor message |
| Double tap Pay | button disabled while loading; idempotency key server-side |
| Today's slots in the past (rebuild) | disable slots earlier than now + 60 min |
