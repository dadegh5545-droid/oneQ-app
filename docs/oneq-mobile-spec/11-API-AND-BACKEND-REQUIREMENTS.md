# 11 — API & Backend Requirements

The live site has **no backend** (hard-coded data + localStorage). This document defines the backend the mobile app needs. Reference implementation: **AWS Amplify Gen 2** (Cognito + AppSync/DynamoDB + Lambda + S3). A REST equivalent is listed so any backend can implement it.

## 1. Data schema (Amplify Gen 2 `defineData`, abbreviated)

```ts
const schema = a.schema({
  Gym: a.model({
    slug: a.string().required(), name: a.string().required(), nameAr: a.string(),
    area: a.string().required(), areaAr: a.string(), description: a.string(), descriptionAr: a.string(),
    address: a.string(), latitude: a.float(), longitude: a.float(), phone: a.string(), whatsapp: a.string(),
    rating: a.float().default(0), reviewCount: a.integer().default(0),
    monthlyPrice: a.integer().required(), trainerFromMonthly: a.integer(),
    images: a.string().array(), amenities: a.string().array(),   // weights|cardio|pool|sauna|lockers|parking
    openingHours: a.json(),                                       // [{day, open, close}]
    isFeatured: a.boolean().default(false), isActive: a.boolean().default(true), sortOrder: a.integer(),
    trainers: a.hasMany('Trainer', 'gymId'), plans: a.hasMany('MembershipPlan', 'gymId'),
    reviews: a.hasMany('Review', 'gymId'),
  }).authorization(allow => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.group('admin')]),

  MembershipPlan: a.model({
    gymId: a.id().required(), gym: a.belongsTo('Gym', 'gymId'),
    name: a.string().required(), nameAr: a.string(), durationMonths: a.integer().required(),
    price: a.integer().required(), description: a.string(), descriptionAr: a.string(),
    badge: a.string(), isActive: a.boolean().default(true), sortOrder: a.integer(),
  }),

  Trainer: a.model({
    gymId: a.id().required(), gym: a.belongsTo('Gym', 'gymId'),
    slug: a.string().required(), name: a.string().required(), title: a.string(), bio: a.string(), bioAr: a.string(),
    image: a.string(), rating: a.float(), reviewCount: a.integer(), yearsExperience: a.integer(),
    languages: a.string().array(), specialties: a.string().array(), certifications: a.string().array(),
    pricePerSession: a.integer().required(), sessionMinutes: a.integer().default(60),
    weeklyAvailability: a.json(),   // { mon:[{start:540,end:1260}], ..., sun:[] }
    isActive: a.boolean().default(true),
  }),

  AvailabilityBlock: a.model({ trainerId: a.id().required(), start: a.datetime().required(), end: a.datetime().required(), reason: a.string() }),

  Review: a.model({
    gymId: a.id(), trainerId: a.id(), bookingId: a.id(), userId: a.id(),
    authorName: a.string().required(), rating: a.integer().required(), text: a.string(),
    isVerified: a.boolean().default(true), status: a.enum(['pending','approved','rejected']),
  }),

  Booking: a.model({
    ref: a.string().required(),                      // "bk-…" or human ref "OQ-7K3F9"
    type: a.enum(['membership','session']),
    userId: a.id(), guestPhone: a.string(),          // guest bookings keyed by phone
    gymId: a.id().required(), gymName: a.string(), gymLocation: a.string(),
    trainerId: a.id(), trainerName: a.string(),
    planId: a.id(), planName: a.string(), membershipStart: a.date(), membershipEnd: a.date(),
    startAt: a.datetime(), endAt: a.datetime(), timeLabel: a.string(), sessionCount: a.integer().default(1),
    priceQar: a.integer().required(), currency: a.string().default('QAR'),
    status: a.enum(['pending_payment','confirmed','completed','cancelled','refunded']),
    guest: a.json(),                                 // {fullName, phone, email}
    paymentMethod: a.enum(['card','applePay','googlePay']),
    paymentId: a.string(), cancelledAt: a.datetime(), cancelReason: a.string(),
  }).authorization(allow => [allow.owner(), allow.group('admin')]),

  Favorite: a.model({ userId: a.id().required(), gymId: a.id().required() }).authorization(allow => [allow.owner()]),

  UserProfile: a.model({ userId: a.id().required(), fullName: a.string(), phone: a.string(), email: a.string(),
    language: a.enum(['en','ar']), pushTokens: a.string().array(), marketingOptIn: a.boolean() }).authorization(allow => [allow.owner()]),

  ContentPage: a.model({ slug: a.string().required(), title: a.string(), titleAr: a.string(), body: a.string(), bodyAr: a.string() })
    .authorization(allow => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.group('admin')]),
});
```

Seed all tables with the data in `09-DATA-MODELS.md` (plans generated with the 04 §3 formula).

## 2. REST-equivalent endpoints

Public (guest + authenticated):
| Method | Path | Description |
|---|---|---|
| GET | `/v1/gyms?featured=&nearby_lat=&nearby_lng=&q=&limit=&cursor=` | list/search gyms (q matches name, area, address, trainers) |
| GET | `/v1/gyms/{id}` | gym detail (incl. hours, amenities, images) |
| GET | `/v1/gyms/{id}/plans` | membership plans |
| GET | `/v1/gyms/{id}/trainers?specialty=` | trainers at gym |
| GET | `/v1/gyms/{id}/reviews?cursor=` | reviews |
| GET | `/v1/trainers?specialty=&q=` | trainer directory (new) |
| GET | `/v1/trainers/{id}` | trainer detail |
| GET | `/v1/trainers/{id}/reviews` | reviews |
| GET | `/v1/trainers/{id}/availability?from=YYYY-MM-DD&days=14` | `[{date, closed, slots:[{id, startAt, label, available}]}]` |
| GET | `/v1/content/{slug}?lang=` | info pages |

Booking & payment:
| Method | Path | Description |
|---|---|---|
| POST | `/v1/bookings/quote` | body = draft → server-calculated price, validates slot |
| POST | `/v1/bookings/hold` | hold a session slot for 5 min → `holdId` |
| POST | `/v1/payments/intent` | `{quoteId/holdId, paymentMethod, guest?}` → provider client secret; header `Idempotency-Key` |
| POST | `/v1/payments/webhook` | provider → confirm booking, release hold on failure |
| GET | `/v1/bookings?status=upcoming|past` | my bookings (auth) |
| GET | `/v1/bookings/{id}` | detail (auth, or guest via signed token) |
| POST | `/v1/bookings/{id}/cancel` | cancel within policy → refund |
| POST | `/v1/bookings/{id}/reschedule` | new slot |
| POST | `/v1/bookings/lookup` | guest: phone + OTP → list bookings / attach to account |

Account:
| Method | Path | Description |
|---|---|---|
| POST | `/v1/auth/*` | handled by Cognito (sign-up, confirm, sign-in, forgot, reset, social) |
| GET/PUT | `/v1/me` | profile |
| GET/PUT/DELETE | `/v1/me/favorites/{gymId}` | favorites (merge local list on sign-in) |
| POST | `/v1/me/push-tokens` | register device |
| POST | `/v1/reviews` | create review for a completed booking |
| DELETE | `/v1/me` | delete account |

Error format: `{ "error": { "code": "SLOT_TAKEN", "message": "That time was just booked. Please choose another." } }` with codes: `VALIDATION`, `NOT_FOUND`, `SLOT_TAKEN`, `PAYMENT_FAILED`, `CANCEL_WINDOW_PASSED`, `UNAUTHORIZED`, `RATE_LIMITED`.

## 3. Business logic (server-side)
1. **Price** always computed server-side (never trust client). Membership = plan.price; session = trainer.pricePerSession × sessionCount.
2. **Availability** = trainer weeklyAvailability (default: Mon–Thu, Sat 9:00–21:00 slots; Sunday closed — current mock rule) − confirmed bookings − holds − blocks − gym closed hours; slots of `sessionMinutes`; exclude past + lead time 60 min. Initially reproduce the mock slot list (9:00, 10:30, 12:00, 16:00, 18:30, 20:00) as configurable templates.
3. **Holds** expire after 5 minutes (DynamoDB TTL).
4. **Booking status jobs** (scheduled Lambda, every 15 min): `confirmed` → `completed` after `endAt`; memberships `completed` after `membershipEnd`.
5. **Cancellation policy** (configurable): sessions cancellable ≥ 12 h before start with full refund; memberships cancellable before start date.
6. **Ratings aggregate** recalculated on review approval.
7. **Booking reference**: human-friendly `OQ-XXXXX` in addition to id.

## 4. Authentication
- Cognito user pool: email or phone as username, phone verification by SMS (+974), password policy ≥ 8.
- Social: Sign in with Apple, Google.
- Guest mode: unauthenticated Cognito identity for reads; guest bookings stored with phone and a signed booking token returned after payment (deep link in SMS).
- Admin group `admin`; optional `gymManager` group scoped to gymId.

## 5. Payments
- Provider must support **QAR** and Qatar-issued cards: options — Stripe (if account eligible), **Tap Payments**, **SkipCash**, **CyberSource/QNB**, **Dibsy**. Must support Apple Pay & Google Pay.
- Flow: client → `/payments/intent` → provider sheet → provider webhook → Lambda sets booking `confirmed`, sends notifications → client polls/subscribes (AppSync subscription) → Success screen.
- Refunds via provider API on cancellation.
- Store only provider tokens/ids; PCI scope SAQ-A.

## 6. Notifications
- Push: Expo push service (or Amazon Pinpoint/SNS → APNs/FCM).
- SMS: Amazon SNS / local Qatar SMS gateway (Ooredoo/Vodafone aggregators) for OTP & confirmations to guests.
- Email: Amazon SES (receipts, confirmations).
- Scheduling: EventBridge Scheduler per booking for 24 h / 1 h reminders.

## 7. Storage & media
- S3 bucket `gym-images/`, `trainer-images/`, `avatars/`; CloudFront + image resizing (WebP, 200/800/1400 widths).

## 8. Admin / management dashboard (web)
Not present in the live product but required for operations. Build as a separate Next.js + Amplify app:
- **Dashboard:** today's bookings, revenue (QAR) by day/gym, new users, upcoming sessions, cancellations.
- **Gyms:** CRUD, images, amenities, hours, featured flag, active flag, map pin, AR translations.
- **Plans:** CRUD per gym, badges, ordering.
- **Trainers:** CRUD, weekly availability editor, time-off blocks, pricing.
- **Bookings:** search/filter, detail, manual status change, cancel & refund, export CSV.
- **Payments:** transactions, refunds, reconciliation.
- **Reviews:** moderation queue.
- **Users:** list, profile, bookings, block/delete.
- **Content:** info pages (EN/AR), home banners, push campaigns.
- **Roles:** admin (all), gymManager (own gym, own trainers, own bookings), trainer (own schedule – optional mobile view).

## 9. Non-functional
- Region: `me-central-1` (UAE) or `me-south-1` (Bahrain) for latency/data residency.
- p95 API latency < 300 ms; availability 99.9 %.
- Logging & monitoring: CloudWatch, alarms on payment webhook failures.
- Backups: DynamoDB PITR.
- Environments: dev / staging / prod with seeded mock data in dev.
