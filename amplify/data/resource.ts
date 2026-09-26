import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

import { bookings } from '../functions/bookings/resource';
import { phoneLogin } from '../functions/phone-login/resource';
import { seedCatalogue } from '../functions/seed-catalogue/resource';

// Mirrors src/domain/models.ts. Catalogue ids are the approved Phase 3 slugs, so routes keep working.
// Clients never write the catalogue, bookings or slot reservations: bookings are created only by the
// `bookings` function after server-side validation (see docs/PHASE-4-BACKEND.md).

const bookingDraftArgs = {
  type: a.string().required(), // 'membership' | 'session'
  gymId: a.id().required(),
  planId: a.id(),
  trainerId: a.id(),
  date: a.string(), // yyyy-MM-dd (Asia/Qatar)
  minutes: a.integer(), // slot start, minutes after midnight
  guestName: a.string().required(),
  guestPhone: a.string().required(),
  guestEmail: a.string(),
};

const schema = a
  .schema({
    OpeningHours: a.customType({
      day: a.string().required(),
      open: a.string().required(),
      close: a.string().required(),
    }),

    GuestInfo: a.customType({
      fullName: a.string().required(),
      phone: a.string().required(), // +974XXXXXXXX
      email: a.string(),
    }),

    // ── Catalogue: read-only for guests and signed-in users ──

    Gym: a
      .model({
        name: a.string().required(),
        area: a.string().required(),
        description: a.string().required(),
        address: a.string().required(),
        rating: a.float().required(),
        reviewCount: a.integer().required(),
        monthlyPrice: a.integer().required(),
        trainerFromMonthly: a.integer().required(),
        images: a.string().required().array().required(),
        amenities: a.string().required().array().required(),
        openingHours: a.ref('OpeningHours').required().array().required(),
        isFeatured: a.boolean().required(),
        isNearby: a.boolean().required(),
        sortOrder: a.integer().required(),
        plans: a.hasMany('MembershipPlan', 'gymId'),
        trainers: a.hasMany('Trainer', 'gymId'),
        reviews: a.hasMany('Review', 'gymId'),
      })
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.group('admin')]),

    MembershipPlan: a
      .model({
        gymId: a.id().required(),
        gym: a.belongsTo('Gym', 'gymId'),
        kind: a.string().required(), // 'monthly' | '3m' | '6m'
        name: a.string().required(),
        description: a.string().required(),
        price: a.integer().required(),
        durationMonths: a.integer().required(),
        badge: a.string(),
      })
      .secondaryIndexes((index) => [index('gymId').sortKeys(['durationMonths']).queryField('listPlansByGym')])
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.group('admin')]),

    Trainer: a
      .model({
        gymId: a.id().required(),
        gym: a.belongsTo('Gym', 'gymId'),
        name: a.string().required(),
        title: a.string().required(),
        bio: a.string().required(),
        image: a.string().required(),
        rating: a.float().required(),
        reviewCount: a.integer().required(),
        yearsExperience: a.integer().required(),
        languages: a.string().required().array().required(),
        specialties: a.string().required().array().required(),
        certifications: a.string().required().array().required(),
        pricePerSession: a.integer().required(),
        sortOrder: a.integer().required(),
        reviews: a.hasMany('Review', 'trainerId'),
      })
      .secondaryIndexes((index) => [index('gymId').sortKeys(['sortOrder']).queryField('listTrainersByGym')])
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.group('admin')]),

    Review: a
      .model({
        gymId: a.id(),
        gym: a.belongsTo('Gym', 'gymId'),
        trainerId: a.id(),
        trainer: a.belongsTo('Trainer', 'trainerId'),
        authorName: a.string().required(),
        rating: a.integer().required(),
        date: a.date().required(),
        text: a.string().required(),
      })
      .secondaryIndexes((index) => [
        index('gymId').sortKeys(['date']).queryField('listReviewsByGym'),
        index('trainerId').sortKeys(['date']).queryField('listReviewsByTrainer'),
      ])
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read']), allow.group('admin')]),

    // ── Per-user data ──

    // One profile per user: the owner key is the primary key, so it cannot be created for someone else.
    UserProfile: a
      .model({
        profileOwner: a.string().required(), // "<sub>::<username>"
        fullName: a.string().required(),
        email: a.string().required(),
        phone: a.string().required(), // +974XXXXXXXX
      })
      .identifier(['profileOwner'])
      .authorization((allow) => [allow.ownerDefinedIn('profileOwner').to(['create', 'read', 'update'])]),

    // (owner, gymId) primary key: no duplicates, and nobody can create or read another user's favorites.
    Favorite: a
      .model({
        owner: a.string().required(),
        gymId: a.id().required(),
      })
      .identifier(['owner', 'gymId'])
      .authorization((allow) => [allow.owner().to(['create', 'read', 'delete'])]),

    // Written only by the bookings function. Owners can read their own; guests read theirs through `guestBookings`.
    Booking: a
      .model({
        type: a.string().required(), // 'membership' | 'session'
        gymId: a.id().required(),
        gymName: a.string().required(),
        gymLocation: a.string().required(),
        trainerId: a.id(),
        trainerName: a.string(),
        planId: a.id(),
        planName: a.string(),
        date: a.string(), // session start "yyyy-MM-ddTHH:mm:00", Asia/Qatar wall time
        timeLabel: a.string(),
        sessionCount: a.integer().required(),
        priceQar: a.integer().required(),
        status: a.string().required(), // 'confirmed' | 'completed' | 'cancelled'
        guest: a.ref('GuestInfo').required(),
        guestPhone: a.string().required(), // duplicate-membership index
        membershipStart: a.date(),
        membershipEnd: a.date(),
        paymentMethod: a.string().required(),
        paymentId: a.string().required(),
        owner: a.string(), // "<sub>::<username>"; null for guest bookings
        guestTokenHash: a.string(), // sha256 of the guest access secret; guest bookings only
      })
      .secondaryIndexes((index) => [
        index('owner').queryField('listBookingsByOwner'),
        index('guestPhone').sortKeys(['gymId']).queryField('listBookingsByGuestPhone'),
      ])
      .authorization((allow) => [allow.owner().to(['read']), allow.group('admin').to(['read'])]),

    // One item per booked trainer slot; the conditional create is the double-booking lock.
    SlotReservation: a
      .model({
        trainerId: a.id().required(),
        startAt: a.string().required(), // "yyyy-MM-ddTHH:mm:00", Asia/Qatar wall time
        bookingId: a.string().required(),
      })
      .identifier(['trainerId', 'startAt'])
      .authorization((allow) => [allow.group('admin').to(['read'])]),

    // ── Custom operations ──

    AvailabilitySlot: a.customType({
      id: a.string().required(),
      minutes: a.integer().required(),
      available: a.boolean().required(),
    }),

    AvailabilityDay: a.customType({
      date: a.string().required(),
      closed: a.boolean().required(),
      slots: a.ref('AvailabilitySlot').required().array().required(),
    }),

    BookingQuote: a.customType({ priceQar: a.integer().required() }),

    BookingView: a.customType({
      id: a.string().required(),
      type: a.string().required(),
      gymId: a.string().required(),
      gymName: a.string().required(),
      gymLocation: a.string().required(),
      trainerId: a.string(),
      trainerName: a.string(),
      planId: a.string(),
      planName: a.string(),
      date: a.string(),
      timeLabel: a.string(),
      sessionCount: a.integer().required(),
      priceQar: a.integer().required(),
      status: a.string().required(),
      guest: a.ref('GuestInfo').required(),
      createdAt: a.string().required(),
      membershipStart: a.string(),
      membershipEnd: a.string(),
      paymentMethod: a.string().required(),
      paymentId: a.string().required(),
      guestToken: a.string(), // returned once, on guest booking creation
    }),

    trainerAvailability: a
      .query()
      .arguments({ trainerId: a.id().required() })
      .returns(a.ref('AvailabilityDay').required().array().required())
      .authorization((allow) => [allow.guest(), allow.authenticated()])
      .handler(a.handler.function(bookings)),

    quoteBooking: a
      .query()
      .arguments(bookingDraftArgs)
      .returns(a.ref('BookingQuote').required())
      .authorization((allow) => [allow.guest(), allow.authenticated()])
      .handler(a.handler.function(bookings)),

    placeBooking: a
      .mutation()
      .arguments({ ...bookingDraftArgs, paymentMethod: a.string().required(), paymentId: a.string().required() })
      .returns(a.ref('BookingView').required())
      .authorization((allow) => [allow.guest(), allow.authenticated()])
      .handler(a.handler.function(bookings)),

    // Guest booking lookup by the "<bookingId>.<secret>" tokens kept on the device.
    guestBookings: a
      .query()
      .arguments({ tokens: a.string().required().array().required() })
      .returns(a.ref('BookingView').required().array().required())
      .authorization((allow) => [allow.guest(), allow.authenticated()])
      .handler(a.handler.function(bookings)),

    // Management: cancels a booking and releases its trainer slot. Admin group only (checked again in the function).
    adminCancelBooking: a
      .mutation()
      .arguments({ id: a.id().required() })
      .returns(a.ref('BookingView').required())
      .authorization((allow) => [allow.group('admin')])
      .handler(a.handler.function(bookings)),

    // Phone sign-in: resolves a Qatar mobile number to the Cognito username (null when unknown).
    signInName: a
      .query()
      .arguments({ phone: a.string().required() })
      .returns(a.string())
      .authorization((allow) => [allow.guest()])
      .handler(a.handler.function(phoneLogin)),
  })
  .authorization((allow) => [allow.resource(bookings).to(['query', 'mutate']), allow.resource(seedCatalogue).to(['query', 'mutate'])]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
});
