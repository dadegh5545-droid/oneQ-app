# Phase 4 — AWS Amplify Gen 2 backend

Region **ap-south-1** (Mumbai), AWS profile `oneq-dev` (IAM Identity Center). Backend code lives in `amplify/`; the app talks to it only through `src/data/amplify/amplifyRepository.ts`.

## Resources

| Resource | Purpose |
|---|---|
| Cognito User Pool | Accounts. Email is the username; `name` and `phone_number` (+974XXXXXXXX) are required. Email confirmation code (default Cognito sender, no SMS). Password: ≥ 8 characters with a number (the app also requires a letter). Group `admin`. |
| Cognito Identity Pool | Guest (unauthenticated) IAM role for signed-out catalogue reads and guest bookings. |
| AppSync GraphQL API + DynamoDB | One table per model (below). |
| Lambda `bookings` | `trainerAvailability`, `quoteBooking`, `placeBooking`, `guestBookings`. All booking rules run here. |
| Lambda `phone-login` | `signInName(phone)`: Qatar mobile → Cognito username (for phone sign-in / reset). `cognito-idp:ListUsers` on this pool only. |
| Lambda `pre-sign-up` | Server-side sign-up rules: valid name/email, Qatar mobile, **one account per phone number**. |
| Lambda `seed-catalogue` | Idempotent catalogue upsert, invoked by `npm run seed` (never by the app). |

## Models and relationships

| Model | Key | Notes |
|---|---|---|
| Gym | `id` (Phase 3 slug, e.g. `power-house`) | hasMany MembershipPlan, Trainer, Review. `sortOrder` keeps the approved order. |
| MembershipPlan | `id` (`<gymId>-monthly/3m/6m`) | belongsTo Gym; index `listPlansByGym`. Prices from `buildPlans` (04 §3). |
| Trainer | `id` (e.g. `noura-abdullah`) | belongsTo Gym; hasMany Review; index `listTrainersByGym`. |
| Review | `id` (`gr-*`, `tr-*`) | belongsTo Gym **or** Trainer; indexes by gym / trainer (date desc). |
| UserProfile | `profileOwner` (`<sub>::<username>`) | One per user, created by the app on first sign-in from the Cognito attributes. |
| Favorite | (`owner`, `gymId`) | The composite key makes duplicates impossible. |
| Booking | `id` (`bk-<uuid>`) | Snapshot of gym/trainer/plan names, price, `date` + `timeLabel`, guest details. Indexes by `owner` and by `guestPhone`+`gymId`. |
| SlotReservation | (`trainerId`, `startAt`) | One item per booked trainer slot; its conditional create is the double-booking lock. |

`UserMembership` was not added: an active membership is a confirmed `membership` Booking whose `membershipEnd` has not passed, which is all the current rules need.

## Authorization

| Data | Guest (identity pool) | Signed-in user | Other |
|---|---|---|---|
| Gym, MembershipPlan, Trainer, Review | read | read | `admin` group: full; clients can never write |
| UserProfile | — | own: create / read / update | the owner is the primary key, so no profile can be created for, or moved to, someone else |
| Favorite | — | own: create / read / delete | no update |
| Booking | via `guestBookings` token only | own: **read only** | created only by the `bookings` function |
| SlotReservation | — | — | `bookings` function only (`admin` read) |
| Custom operations | availability, quote, place, guest lookup, `signInName` | availability, quote, place, guest lookup | — |

Function access (`allow.resource`) is limited to `bookings` and `seed-catalogue`. Authorization is enforced in the AppSync resolvers, verified by `npm run backend:check`.

## Bookings and guest bookings

`placeBooking` (and `quoteBooking`, before payment) re-validates the whole draft on the server:
malformed input → `VALIDATION`; unknown gym / plan / trainer, plan or trainer from another gym → `INVALID_BOOKING`;
date outside the 14-day window, Sunday, slot template or 60-minute lead time → `SLOT_UNAVAILABLE`; booked slot → `SLOT_TAKEN`;
active membership for the same phone at the same gym → `DUPLICATE_BOOKING`. The price always comes from the server
(plan price / trainer session price). Dates use Asia/Qatar time.

- **Signed in:** the booking's `owner` is the caller (from the Cognito token); the owner can only read it.
- **Guest:** no owner. The function returns a one-time token `<bookingId>.<secret>` (192-bit random); only its SHA-256 is stored. The device keeps the token (`oneq.guestBookingTokens`) and reads its bookings with `guestBookings(tokens)`. Guests never get Booking CRUD.
- **Slots:** a `SlotReservation` is created (conditional write) before the booking; a failed booking write releases it.

## App integration

- `Amplify.configure(amplify_outputs.json)` runs once, in `src/app/_layout.tsx`.
- `amplifyRepository` implements the existing `Repository` interface (catalogue, availability, bookings, favorites, profile, auth); screens are unchanged apart from the sign-up confirmation step. Errors are mapped to `RepositoryError` codes (`NETWORK`, `SESSION_EXPIRED`, `UNAUTHORIZED`, `SLOT_TAKEN`, …) shown with the existing components and `errors.*` strings.
- Session: Amplify stores the Cognito tokens; `src/features/auth/session.ts` restores the account from the ID token at start-up, loads the profile and favorites in the background, and signs out locally on refresh-token failure.
- Favorites: signed in → AWS (optimistic toggle, reverted on failure); signed out → device list, merged into the account on the next sign-in.
- Removed: the Phase 3 mock repository with local SHA-256 password hashes; old keys (`oneq.accounts`, `oneq.signedIn`, `oneq.bookings`) are deleted from devices on start-up.
- Payments: still the mock `PaymentProvider` (no real processor in Phase 4).

## Commands

```bash
npx ampx sandbox --profile oneq-dev          # deploy/watch the personal sandbox, writes amplify_outputs.json
npx ampx sandbox --profile oneq-dev --once   # single deployment
npm run seed                                 # (AWS_PROFILE=oneq-dev) create missing catalogue records; --overwrite resets them
npm run admin:grant -- <email>               # admin group via the admin-access function (see PRODUCTION-READINESS.md)
npm run backend:check                        # regression + security checks against the sandbox
npm run typecheck                            # app + amplify/ TypeScript
npx ampx sandbox delete --profile oneq-dev   # remove the sandbox
```

`amplify_outputs.json` and `.amplify/` are generated per environment and not committed.

If `npx ampx …` prints the root help / "Unknown command: …ampx.js", npm is resolving `node` to an Electron-based shim
(on this machine `~/.codegpt/bin/node.cmd` from a VS Code extension), which breaks yargs argument parsing. Run the
binary with the system Node instead: `sh node_modules/.bin/ampx sandbox --profile oneq-dev` (Git Bash).

`aws-amplify` is pinned to **6.20.0**: 6.22.0 (core 6.19) configures the credentials provider only when the resource
config contains `Auth`, so Lambda data clients built with `getAmplifyDataClientConfig` fail with `NoCredentials`.

The deploy role needs the AWS managed policy **AmplifyBackendDeployFullAccess** (CloudFormation, CDK bootstrap roles, SSM `/cdk-bootstrap/*` and `/amplify/*`, `lambda:InvokeFunction` on `amplify-*`).

Sandbox only: sign-ups from `success+oneq-autotest-…@simulator.amazonses.com` are auto-confirmed so the automated checks can run without a mailbox. Branch deployments never set this flag.

## Verified against the sandbox (2026-09-26)

- Seed: first run created 49 records, second run updated 49 / created 0; counts stay 6 gyms, 18 plans, 8 trainers, 17 reviews.
- `npm run backend:check`: 31/31 (catalogue, auth, profile, favorites, bookings, server validation, cross-user and guest security).
- Web build against AWS: catalogue/search/plans/trainers/reviews, sign-up, reload persistence, favorites (AWS, reload,
  sign-out/in), phone sign-in, bad password, confirmation step, forgot password, signed-in and guest membership + session
  bookings (selected time kept through Checkout → Success → Details), sign-in during checkout, Bookings tab after reload,
  network failure → retry, Arabic RTL / English LTR, 320 px.

## Needs a development build / physical device (not Expo Go)

- Amplify native module (`@aws-amplify/react-native`) and token persistence across app restarts.
- Real email codes: sign-up confirmation, resend, forgot/reset password end to end.
- Native RTL layout, Arabic fonts and text alignment on iOS and Android.
- Android hardware back (checkout lock, success → Home) and iOS swipe-back.
- Keyboard avoidance and safe areas on auth and checkout forms.
- Offline / flaky network behaviour and session expiry on device.
- Apple Pay / Google Pay options (Phase 5, real payment provider).

## Known limits (Phase 5 hardening)

- No rate limiting yet (AWS WAF on AppSync): `signInName` reveals whether a phone number is registered, and guests could hold free slots with mock payments.
- Phone ownership is not verified by SMS (no SNS configuration); uniqueness is enforced.
- Duplicate-membership check is not atomic under concurrent requests (slot booking is).
- Guest bookings are not yet attached to an account after sign-up (spec 11 §2 lookup by phone + OTP).
- Cognito default email sender (50 emails/day): use SES before production.
