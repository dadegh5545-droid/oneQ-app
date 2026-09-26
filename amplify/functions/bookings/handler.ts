import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { AppSyncResolverEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { addDays, addMonths, format, startOfDay } from 'date-fns';
import { env } from '$amplify/env/bookings';

import { gymLocation } from '../../../src/domain/models';
import { isClosed, isSlotAvailable, isSlotInFuture, next14Days, SLOT_MINUTES, slotLabel } from '../../../src/domain/rules';
import { isValidEmail, isValidFullName, toQatarE164 } from '../../../src/domain/validation';
import type { Schema } from '../../data/resource';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

type ErrorCode = 'VALIDATION' | 'INVALID_BOOKING' | 'SLOT_TAKEN' | 'SLOT_UNAVAILABLE' | 'DUPLICATE_BOOKING' | 'NOT_FOUND' | 'PAYMENT_FAILED' | 'UNAUTHORIZED';

// The message is the code; the app maps it to RepositoryError.
function fail(code: ErrorCode): never {
  throw new Error(code);
}

type DataErrors = readonly { message: string; errorType?: string | null }[] | undefined;

// Data-client calls resolve with `errors` instead of throwing.
function check<T extends { errors?: DataErrors }>(result: T): T {
  if (result.errors?.length) throw new Error(`DATA_ERROR: ${result.errors.map((e) => e.errorType ?? e.message).join(', ')}`);
  return result;
}

const unwrap = async <T>(request: Promise<{ data: T; errors?: DataErrors }>) => check(await request).data;

const isConditionalFailure = (errors: DataErrors) =>
  !!errors?.some((e) => `${e.errorType ?? ''} ${e.message}`.includes('ConditionalCheckFailed'));

// Qatar is UTC+3 all year. The shared rules use device-local time, so they run against a Date whose
// local wall clock reads Qatar time, whatever the Lambda time zone is.
const qatarNow = () => new Date(Date.now() + 3 * 3_600_000 + new Date().getTimezoneOffset() * 60_000);

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

const slotStart = (date: string, minutes: number) =>
  `${date}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;

// "yyyy-MM-dd" that is a real calendar date → local midnight.
const parseDay = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(`${value}T00:00:00`);
  return ymd(day) === value ? day : null;
};

const text = (value: unknown, max = 128) => (typeof value === 'string' && value.length > 0 && value.length <= max ? value : null);

const sha256 = (value: string) => createHash('sha256').update(value).digest();

const PAYMENT_METHODS = ['card', 'applePay', 'googlePay'];

type Args = Record<string, unknown>;
// Payload of the Lambda data source that Amplify generates for custom operations (fieldName at the top level).
type ResolverEvent = { fieldName: string; arguments: Args; identity: AppSyncResolverEvent<Args>['identity'] };
type BookingRecord = Schema['Booking']['type'];

// ── Draft validation (shared by quote and create) ──

async function hasActiveMembership(guestPhone: string, gymId: string, today: string) {
  let nextToken: string | null | undefined;
  do {
    const page = check(await client.models.Booking.listBookingsByGuestPhone({ guestPhone, gymId: { eq: gymId } }, { nextToken }));
    if (page.data.some((b) => b.type === 'membership' && b.status === 'confirmed' && (b.membershipEnd ?? '') >= today)) return true;
    nextToken = page.nextToken;
  } while (nextToken);
  return false;
}

async function validateDraft(args: Args) {
  const { type } = args;
  if (type !== 'membership' && type !== 'session') fail('VALIDATION');
  const gymId = text(args.gymId, 64) ?? fail('VALIDATION');

  const fullName = typeof args.guestName === 'string' ? args.guestName.trim() : '';
  const phone = typeof args.guestPhone === 'string' ? toQatarE164(args.guestPhone) : null;
  const email = typeof args.guestEmail === 'string' ? args.guestEmail.trim() : '';
  if (!isValidFullName(fullName) || !phone || (email !== '' && !isValidEmail(email))) fail('VALIDATION');
  const guest = { fullName, phone, email: email || null };

  const gym = (await unwrap(client.models.Gym.get({ id: gymId }))) ?? fail('INVALID_BOOKING');
  const now = qatarNow();

  if (type === 'membership') {
    const planId = text(args.planId, 64) ?? fail('VALIDATION');
    const plan = await unwrap(client.models.MembershipPlan.get({ id: planId }));
    if (!plan || plan.gymId !== gym.id) fail('INVALID_BOOKING');
    if (await hasActiveMembership(phone, gym.id, ymd(now))) fail('DUPLICATE_BOOKING');
    return { kind: 'membership' as const, gym, plan, guest, priceQar: plan.price };
  }

  const trainerId = text(args.trainerId, 64) ?? fail('VALIDATION');
  const day = parseDay(args.date) ?? fail('VALIDATION');
  const minutes = typeof args.minutes === 'number' ? args.minutes : NaN;
  const index = SLOT_MINUTES.indexOf(minutes);
  if (index < 0) fail('VALIDATION');

  const trainer = await unwrap(client.models.Trainer.get({ id: trainerId }));
  if (!trainer || trainer.gymId !== gym.id) fail('INVALID_BOOKING');

  const date = ymd(day);
  const bookable =
    next14Days(now).some((d) => ymd(d) === date) && !isClosed(day) && isSlotAvailable(day, index) && isSlotInFuture(day, minutes, now);
  if (!bookable) fail('SLOT_UNAVAILABLE');

  const startAt = slotStart(date, minutes);
  if (await unwrap(client.models.SlotReservation.get({ trainerId, startAt }))) fail('SLOT_TAKEN');
  return { kind: 'session' as const, gym, trainer, date, minutes, startAt, guest, priceQar: trainer.pricePerSession };
}

// ── Operations ──

const toView = (b: BookingRecord, guestToken: string | null) => ({
  id: b.id,
  type: b.type,
  gymId: b.gymId,
  gymName: b.gymName,
  gymLocation: b.gymLocation,
  trainerId: b.trainerId ?? null,
  trainerName: b.trainerName ?? null,
  planId: b.planId ?? null,
  planName: b.planName ?? null,
  date: b.date ?? null,
  timeLabel: b.timeLabel ?? null,
  sessionCount: b.sessionCount,
  priceQar: b.priceQar,
  status: b.status,
  guest: { fullName: b.guest.fullName, phone: b.guest.phone, email: b.guest.email ?? null },
  createdAt: b.createdAt,
  membershipStart: b.membershipStart ?? null,
  membershipEnd: b.membershipEnd ?? null,
  paymentMethod: b.paymentMethod,
  paymentId: b.paymentId,
  guestToken,
});

// Signed-in callers own their booking; guests (identity-pool unauth role) get a one-time access token instead.
const ownerOf = (identity: ResolverEvent['identity']) =>
  identity && 'sub' in identity && 'username' in identity && identity.sub && identity.username
    ? `${identity.sub}::${identity.username}`
    : null;

// Payment boundary: the only place a payment is trusted. A real provider verifies paymentId + amount here
// (and later reconciles via its webhook). Mock payment ids are accepted only when PAYMENT_PROVIDER is "mock".
async function verifyPayment(paymentId: string, _amountQar: number) {
  if (process.env.PAYMENT_PROVIDER === 'mock' && paymentId.startsWith('mock-')) return;
  fail('PAYMENT_FAILED');
}

// One booking per payment: the id is derived from the payment id, so a retried request (e.g. after a lost
// response) finds the booking it already created instead of booking twice.
const bookingIdFor = (paymentId: string) => {
  const h = createHash('sha256').update(`oneq-booking:${paymentId}`).digest('hex');
  return `bk-${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

// Replays an existing booking to the caller that made it. A guest gets a fresh token (the old one was never
// received), which also invalidates any earlier token.
// Owner fields are stored as "<sub>::<username>" but read back as the username alone.
const sameOwner = (stored: string | null | undefined, owner: string | null) =>
  !stored || !owner ? !stored && !owner : stored === owner || stored === owner.split('::')[1];

async function replay(existing: BookingRecord, owner: string | null) {
  if (!sameOwner(existing.owner, owner)) fail('VALIDATION');
  if (owner) return toView(existing, null);
  const secret = randomBytes(24).toString('base64url');
  const updated = await unwrap(client.models.Booking.update({ id: existing.id, guestTokenHash: sha256(secret).toString('hex') }));
  return toView(updated ?? existing, `${existing.id}.${secret}`);
}

async function createBooking(args: Args, owner: string | null) {
  // Malformed input is rejected before any lookup.
  const paymentMethod = typeof args.paymentMethod === 'string' && PAYMENT_METHODS.includes(args.paymentMethod) ? args.paymentMethod : fail('VALIDATION');
  const paymentId = text(args.paymentId) ?? fail('VALIDATION');
  const id = bookingIdFor(paymentId);

  const existing = await unwrap(client.models.Booking.get({ id }));
  if (existing) return replay(existing, owner);

  const draft = await validateDraft(args);
  await verifyPayment(paymentId, draft.priceQar);

  const secret = owner ? null : randomBytes(24).toString('base64url');
  const today = startOfDay(qatarNow());
  const session = draft.kind === 'session';

  if (session) {
    const lock = await client.models.SlotReservation.create({ trainerId: draft.trainer.id, startAt: draft.startAt, bookingId: id });
    if (isConditionalFailure(lock.errors)) {
      // The same payment racing itself: return the booking the other request created.
      const holder = await unwrap(client.models.SlotReservation.get({ trainerId: draft.trainer.id, startAt: draft.startAt }));
      const same = holder?.bookingId === id ? await unwrap(client.models.Booking.get({ id })) : null;
      if (same) return replay(same, owner);
      fail('SLOT_TAKEN');
    }
    check(lock);
  }

  const created = await client.models.Booking.create({
    id,
    type: draft.kind,
    gymId: draft.gym.id,
    gymName: draft.gym.name,
    gymLocation: gymLocation(draft.gym),
    trainerId: session ? draft.trainer.id : null,
    trainerName: session ? draft.trainer.name : null,
    planId: session ? null : draft.plan.id,
    planName: session ? null : draft.plan.name,
    date: session ? draft.startAt : null,
    timeLabel: session ? slotLabel(draft.minutes) : null,
    sessionCount: 1,
    priceQar: draft.priceQar,
    status: 'confirmed',
    guest: draft.guest,
    guestPhone: draft.guest.phone,
    membershipStart: session ? null : ymd(today),
    membershipEnd: session ? null : ymd(addDays(addMonths(today, draft.plan.durationMonths), -1)),
    paymentMethod,
    paymentId,
    // Index keys are omitted rather than null for guest bookings.
    ...(owner ? { owner } : { guestTokenHash: sha256(secret!).toString('hex') }),
  });

  if (created.errors?.length || !created.data) {
    // A concurrent request with the same payment won the conditional create: return that booking.
    if (isConditionalFailure(created.errors)) {
      const same = await unwrap(client.models.Booking.get({ id }));
      if (same) return replay(same, owner);
    }
    // Release the slot so a failed write never blocks it.
    if (session) await client.models.SlotReservation.delete({ trainerId: draft.trainer.id, startAt: draft.startAt });
    check(created);
    throw new Error('DATA_ERROR: booking not created');
  }
  return toView(created.data, secret ? `${id}.${secret}` : null);
}

// Admin only (resolver rule + this check): mark cancelled and release the trainer slot.
async function adminCancelBooking(id: unknown, identity: ResolverEvent['identity']) {
  const groups = identity && 'groups' in identity ? (identity.groups ?? []) : [];
  if (!groups.includes('admin')) fail('UNAUTHORIZED');
  const bookingId = text(id, 64) ?? fail('VALIDATION');
  const booking = (await unwrap(client.models.Booking.get({ id: bookingId }))) ?? fail('NOT_FOUND');
  if (booking.type === 'session' && booking.trainerId && booking.date) {
    const lock = await unwrap(client.models.SlotReservation.get({ trainerId: booking.trainerId, startAt: booking.date }));
    if (lock?.bookingId === booking.id) await unwrap(client.models.SlotReservation.delete({ trainerId: booking.trainerId, startAt: booking.date }));
  }
  const updated = await unwrap(client.models.Booking.update({ id: booking.id, status: 'cancelled' }));
  return toView(updated ?? booking, null);
}

async function guestBookings(tokens: unknown) {
  if (!Array.isArray(tokens) || tokens.length > 50) fail('VALIDATION');
  const found = await Promise.all(
    tokens.map(async (token) => {
      const [id, secret] = typeof token === 'string' ? token.split('.') : [];
      if (!id || !secret || !/^bk-[0-9a-f-]{36}$/.test(id)) return null;
      const booking = await unwrap(client.models.Booking.get({ id }));
      if (!booking || booking.owner || !booking.guestTokenHash) return null;
      const matches = timingSafeEqual(Buffer.from(booking.guestTokenHash, 'hex'), sha256(secret));
      return matches ? toView(booking, null) : null;
    }),
  );
  return found.filter((b) => b !== null);
}

async function trainerAvailability(trainerId: unknown) {
  const id = text(trainerId, 64) ?? fail('VALIDATION');
  if (!(await unwrap(client.models.Trainer.get({ id })))) fail('NOT_FOUND');

  const now = qatarNow();
  const days = next14Days(now);
  const booked = new Set<string>();
  let nextToken: string | null | undefined;
  do {
    const page = check(
      await client.models.SlotReservation.list({
        trainerId: id,
        startAt: { between: [`${ymd(days[0]!)}T00:00:00`, `${ymd(days[days.length - 1]!)}T23:59:59`] },
        nextToken,
      }),
    );
    page.data.forEach((r) => booked.add(r.startAt));
    nextToken = page.nextToken;
  } while (nextToken);

  return days.map((d) => {
    const date = ymd(d);
    const closed = isClosed(d);
    return {
      date,
      closed,
      slots: SLOT_MINUTES.map((minutes, i) => ({
        id: `${date}-${i}`,
        minutes,
        available: !closed && isSlotAvailable(d, i) && isSlotInFuture(d, minutes, now) && !booked.has(slotStart(date, minutes)),
      })),
    };
  });
}

export const handler = async (event: ResolverEvent) => {
  const args = event.arguments;
  switch (event.fieldName) {
    case 'trainerAvailability':
      return trainerAvailability(args.trainerId);
    case 'quoteBooking':
      return { priceQar: (await validateDraft(args)).priceQar };
    case 'placeBooking':
      return createBooking(args, ownerOf(event.identity));
    case 'guestBookings':
      return guestBookings(args.tokens);
    case 'adminCancelBooking':
      return adminCancelBooking(args.id, event.identity);
    default:
      throw new Error('UNSUPPORTED_OPERATION');
  }
};
