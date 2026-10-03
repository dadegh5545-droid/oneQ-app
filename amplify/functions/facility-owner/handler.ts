import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { addDays, addMonths, differenceInCalendarDays, startOfMonth } from 'date-fns';
import { env } from '$amplify/env/facility-owner';

import { SESSION_MINUTES, sessionStart } from '../../../src/domain/rules';
import type { Schema } from '../../data/resource';
import { check, fail, isAdmin, isConditionalFailure, mutateIf, ownerOf, qatarNow, sameOwner, text, unwrap, ymd, type Args, type ResolverEvent } from '../shared/data';
import { listAll } from '../shared/facilities';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

// Facility dashboards (FACILITY_OWNER for their own facilities, admins for every facility). Every read and write
// checks the facility owner here; owners never write the models directly.

type GymRecord = Schema['Gym']['type'];
type BookingRecord = Schema['Booking']['type'];
type ReviewRecord = Schema['Review']['type'];
type Caller = { owner: string | null; admin: boolean };

const callerOf = (identity: ResolverEvent['identity']): Caller => ({ owner: ownerOf(identity), admin: isAdmin(identity) });

async function ownFacility(caller: Caller, id: unknown): Promise<GymRecord> {
  const facilityId = text(id, 64) ?? fail('VALIDATION');
  const facility = (await unwrap(client.models.Gym.get({ id: facilityId }))) ?? fail('NOT_FOUND');
  if (!caller.admin && !sameOwner(facility.ownerId, caller.owner)) fail('UNAUTHORIZED');
  return facility;
}

async function ownTrainer(caller: Caller, id: unknown) {
  const trainerId = text(id, 64) ?? fail('VALIDATION');
  const trainer = (await unwrap(client.models.Trainer.get({ id: trainerId }))) ?? fail('NOT_FOUND');
  const facility = await ownFacility(caller, trainer.gymId);
  return { trainer, facility };
}

async function notify(recipient: string | null | undefined, kind: string, params: Record<string, unknown>) {
  if (!recipient) return;
  check(await client.models.Notification.create({ recipient, kind, params: JSON.stringify(params) }));
}

const facilityBookingsAll = (gymId: string) => listAll((nextToken) => client.models.Booking.listBookingsByGym({ gymId }, { nextToken, limit: 500 }));
const facilityReviewsAll = (gymId: string) =>
  listAll((nextToken) => client.models.Review.listReviewsByGym({ gymId }, { nextToken, sortDirection: 'DESC' }));
const facilityFreezes = async (bookingIds: string[]) => {
  const all = await Promise.all(bookingIds.map((bookingId) => listAll((nextToken) => client.models.MembershipFreeze.listFreezesByBooking({ bookingId }, { nextToken }))));
  return all.flat();
};

// ── Rows ──

const bookingRow = (b: BookingRecord, revealPhone: boolean) => ({
  id: b.id,
  type: b.type,
  status: b.status,
  customerName: b.guest.fullName,
  // Home-service appointments show the customer's phone only once the booking is confirmed (the salon calls for
  // the location); every other confirmed booking shows it.
  customerPhone: revealPhone ? b.guest.phone : null,
  date: b.date ?? null,
  timeLabel: b.timeLabel ?? null,
  trainerId: b.trainerId ?? null,
  trainerName: b.trainerName ?? null,
  planName: b.planName ?? null,
  serviceName: b.serviceName ?? null,
  priceQar: b.priceQar,
  createdAt: b.createdAt,
  membershipStart: b.membershipStart ?? null,
  membershipEnd: b.membershipEnd ?? null,
  homeService: b.homeService ?? false,
  trainerUnavailable: b.trainerUnavailable ?? false,
  cancelReason: b.cancelReason ?? null,
});

const showsPhone = (b: BookingRecord) => b.status !== 'cancelled' && (!b.homeService || b.status === 'confirmed' || b.status === 'completed');

const reviewRow = (r: ReviewRecord, trainerNames: Map<string, string>) => ({
  id: r.id,
  authorName: r.authorName,
  rating: r.rating,
  text: r.text,
  date: r.date,
  satisfied: r.satisfied ?? null,
  trainerName: r.trainerId ? (trainerNames.get(r.trainerId) ?? null) : null,
  ownerReply: r.ownerReply ?? null,
  ownerReplyAt: r.ownerReplyAt ?? null,
});

type MemberStatus = 'active' | 'frozen' | 'expired' | 'cancelled';

function memberRows(bookings: BookingRecord[], frozenToday: Set<string>, today: string) {
  return bookings
    .filter((b) => b.type === 'membership')
    .map((b) => {
      const status: MemberStatus =
        b.status === 'cancelled' ? 'cancelled' : (b.membershipEnd ?? '') < today ? 'expired' : frozenToday.has(b.id) ? 'frozen' : 'active';
      return {
        bookingId: b.id,
        name: b.guest.fullName,
        phone: b.guest.phone,
        planName: b.planName ?? '',
        planId: b.planId ?? null,
        start: b.membershipStart ?? null,
        end: b.membershipEnd ?? null,
        status,
        amount: b.priceQar,
      };
    })
    .sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''));
}

// ── Periods and series ──

type Period = '30d' | 'month' | '90d' | '12m';
const PERIODS: Period[] = ['30d', 'month', '90d', '12m'];

// Buckets of the period: [start, end) dates (yyyy-MM-dd), oldest first.
function buckets(period: Period, now: Date) {
  const today = addDays(new Date(ymd(now) + 'T00:00:00'), 1);
  if (period === '12m') {
    const first = addMonths(startOfMonth(now), -11);
    return [...Array(12)].map((_, i) => ({ start: ymd(addMonths(first, i)), end: ymd(addMonths(first, i + 1)) }));
  }
  if (period === 'month') {
    const first = startOfMonth(now);
    const days = differenceInCalendarDays(today, first);
    const n = Math.max(1, Math.ceil(days / 7));
    return [...Array(n)].map((_, i) => ({ start: ymd(addDays(first, i * 7)), end: ymd(i === n - 1 ? today : addDays(first, (i + 1) * 7)) }));
  }
  const total = period === '30d' ? 30 : 90;
  const size = period === '30d' ? 5 : 15;
  const first = addDays(today, -total);
  return [...Array(total / size)].map((_, i) => ({ start: ymd(addDays(first, i * size)), end: ymd(addDays(first, (i + 1) * size)) }));
}

// The business date of a booking: a membership's first day, a session's day (records may be imported later).
const createdDay = (b: BookingRecord) => b.membershipStart ?? (b.date ? b.date.slice(0, 10) : b.createdAt.slice(0, 10));

async function insights(caller: Caller, args: Args) {
  const facility = await ownFacility(caller, args.facilityId);
  const period = PERIODS.includes(args.period as Period) ? (args.period as Period) : fail('VALIDATION');
  const now = qatarNow();
  const today = ymd(now);
  const ranges = buckets(period, now);
  const from = ranges[0]!.start;
  const [bookings, reviews, trainers] = await Promise.all([
    facilityBookingsAll(facility.id),
    facilityReviewsAll(facility.id),
    listAll((nextToken) => client.models.Trainer.listTrainersByGym({ gymId: facility.id }, { nextToken })),
  ]);
  const live = bookings.filter((b) => b.status !== 'cancelled');
  const memberships = live.filter((b) => b.type === 'membership');
  const active = memberships.filter((b) => (b.membershipStart ?? '') <= today && (b.membershipEnd ?? '') >= today);
  const inPeriod = (day: string | null | undefined) => !!day && day >= from && day <= today;
  const freezes = await facilityFreezes(active.map((b) => b.id));
  const frozenToday = new Set(freezes.filter((f) => f.startDate <= today && f.endDate >= today).map((f) => f.bookingId));

  const byPlan = new Map<string, number>();
  for (const b of active) byPlan.set(b.planName ?? '—', (byPlan.get(b.planName ?? '—') ?? 0) + 1);
  const planDistribution = [...byPlan.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const periodPlans = new Map<string, number>();
  for (const b of memberships.filter((m) => inPeriod(m.membershipStart))) periodPlans.set(b.planName ?? '—', (periodPlans.get(b.planName ?? '—') ?? 0) + 1);
  const popular = [...periodPlans.entries()].sort((a, b) => b[1] - a[1])[0];

  const trainerNames = new Map(trainers.map((t) => [t.id, t.name]));
  const ratings = [1, 2, 3, 4, 5].map((star) => reviews.filter((r) => r.rating === star).length);
  const ratingCount = reviews.length;
  const ratingAverage = ratingCount ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / ratingCount) * 10) / 10 : 0;
  const soon = ymd(addDays(now, 14));

  return {
    period,
    members: new Set(memberships.map((b) => b.guest.phone)).size,
    activeMembers: active.length,
    newMembers: memberships.filter((b) => inPeriod(b.membershipStart)).length,
    revenue: live.filter((b) => inPeriod(createdDay(b))).reduce((s, b) => s + b.priceQar, 0),
    trainerBookings: live.filter((b) => b.type === 'session' && inPeriod(createdDay(b))).length,
    planDistribution,
    popularPlan: popular ? popular[0] : null,
    membersSeries: ranges.map((r) => ({
      start: r.start,
      value: memberships.filter((b) => (b.membershipStart ?? '') < r.end && (b.membershipEnd ?? '') >= r.start).length,
    })),
    revenueSeries: ranges.map((r) => ({ start: r.start, value: live.filter((b) => createdDay(b) >= r.start && createdDay(b) < r.end).reduce((s, b) => s + b.priceQar, 0) })),
    newMembersSeries: ranges.map((r) => ({ start: r.start, value: memberships.filter((b) => (b.membershipStart ?? '') >= r.start && (b.membershipStart ?? '') < r.end).length })),
    expiringSoon: memberRows(active.filter((b) => (b.membershipEnd ?? '') <= soon), frozenToday, today).slice(0, 8),
    latestBookings: [...bookings].sort((a, b) => createdDay(b).localeCompare(createdDay(a)) || b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((b) => bookingRow(b, showsPhone(b))),
    latestReviews: reviews.slice(0, 3).map((r) => reviewRow(r, trainerNames)),
    ratingAverage,
    ratingCount,
    ratingDistribution: ratings,
  };
}

async function members(caller: Caller, args: Args) {
  const facility = await ownFacility(caller, args.facilityId);
  const today = ymd(qatarNow());
  const bookings = await facilityBookingsAll(facility.id);
  const memberships = bookings.filter((b) => b.type === 'membership');
  const freezes = await facilityFreezes(memberships.filter((b) => b.status !== 'cancelled' && (b.membershipEnd ?? '') >= today).map((b) => b.id));
  const frozenToday = new Set(freezes.filter((f) => f.startDate <= today && f.endDate >= today).map((f) => f.bookingId));
  return memberRows(memberships, frozenToday, today);
}

async function bookingsOf(caller: Caller, args: Args) {
  const facility = await ownFacility(caller, args.facilityId);
  const from = text(args.from, 10);
  const to = text(args.to, 10);
  const day = (b: BookingRecord) => (b.date ? b.date.slice(0, 10) : (b.membershipStart ?? createdDay(b)));
  return (await facilityBookingsAll(facility.id))
    .filter((b) => (!from || day(b) >= from) && (!to || day(b) <= to))
    .sort((a, b) => day(b).localeCompare(day(a)) || b.createdAt.localeCompare(a.createdAt))
    .map((b) => bookingRow(b, showsPhone(b)));
}

async function reviewsOf(caller: Caller, args: Args) {
  const facility = await ownFacility(caller, args.facilityId);
  const [reviews, trainers] = await Promise.all([
    facilityReviewsAll(facility.id),
    listAll((nextToken) => client.models.Trainer.listTrainersByGym({ gymId: facility.id }, { nextToken })),
  ]);
  const trainerReviews = (
    await Promise.all(trainers.map((t) => listAll((nextToken) => client.models.Review.listReviewsByTrainer({ trainerId: t.id }, { nextToken }))))
  ).flat();
  const names = new Map(trainers.map((t) => [t.id, t.name]));
  return [...reviews, ...trainerReviews].sort((a, b) => b.date.localeCompare(a.date)).map((r) => reviewRow(r, names));
}

async function trainersOf(caller: Caller, args: Args) {
  const facility = await ownFacility(caller, args.facilityId);
  const trainers = await listAll((nextToken) => client.models.Trainer.listTrainersByGym({ gymId: facility.id }, { nextToken }));
  const availability = await Promise.all(trainers.map((t) => unwrap(client.models.TrainerAvailability.get({ trainerId: t.id }))));
  return trainers.map((t, i) => {
    const a = availability[i];
    return {
      id: t.id,
      name: t.name,
      title: t.title,
      bio: t.bio,
      image: t.image,
      specialties: t.specialties,
      skills: (t.skills ?? []).filter((s): s is string => !!s),
      yearsExperience: t.yearsExperience,
      pricePerSession: t.pricePerSession,
      languages: t.languages,
      certifications: t.certifications,
      departmentId: t.departmentId ?? null,
      rating: t.rating ?? 0,
      reviewCount: t.reviewCount ?? 0,
      unavailable: a?.unavailable ?? false,
      unavailableFrom: a?.unavailableFrom ?? null,
      unavailableUntil: a?.unavailableUntil ?? null,
      weeklyHours: (a?.weeklyHours ?? []).filter((h): h is NonNullable<typeof h> => !!h).map((h) => ({ weekday: h.weekday, open: h.open, close: h.close })),
    };
  });
}

const upcomingOf = (b: BookingRecord, now: number) =>
  b.status === 'confirmed' && !!b.date && sessionStart(b.date).getTime() + (b.durationMinutes ?? SESSION_MINUTES) * 60_000 > now;

async function trainerSchedule(caller: Caller, args: Args) {
  const { trainer } = await ownTrainer(caller, args.trainerId);
  const from = text(args.from, 10) ?? ymd(qatarNow());
  const to = text(args.to, 10);
  return (await facilityBookingsAll(trainer.gymId))
    .filter((b) => b.trainerId === trainer.id && !!b.date && b.date.slice(0, 10) >= from && (!to || b.date.slice(0, 10) <= to))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .map((b) => bookingRow(b, showsPhone(b)));
}

// ── Writes ──

const optionalText = (value: unknown, max: number) => (value == null || value === '' ? null : (text(value, max) ?? fail('VALIDATION')));
const textList = (value: unknown, max = 20) =>
  Array.isArray(value) && value.length <= max && value.every((v) => typeof v === 'string' && v.length > 0 && v.length <= 120) ? (value as string[]) : fail('VALIDATION');
const wholeNumber = (value: unknown, max: number) => (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : fail('VALIDATION'));
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const optionalDay = (value: unknown) => (value == null || value === '' ? null : typeof value === 'string' && DAY.test(value) ? value : fail('VALIDATION'));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
const newId = (prefix: string, name: string) => `${prefix}-${slug(name)}-${Date.now().toString(36)}`;

const PLAN_KINDS: Record<number, string> = { 1: 'monthly', 2: '2m', 3: '3m', 6: '6m', 12: '12m' };

async function savePlan(caller: Caller, args: Args) {
  const facility = await ownFacility(caller, args.facilityId);
  const durationMonths = [1, 2, 3, 6, 12].includes(args.durationMonths as number) ? (args.durationMonths as number) : fail('VALIDATION');
  const discountType = args.discountType == null ? null : args.discountType === 'percent' || args.discountType === 'amount' ? args.discountType : fail('VALIDATION');
  const plan = {
    gymId: facility.id,
    kind: PLAN_KINDS[durationMonths]!,
    name: text(args.name, 60) ?? fail('VALIDATION'),
    description: optionalText(args.description, 200) ?? '',
    price: wholeNumber(args.price, 100_000),
    durationMonths,
    badge: args.badge === 'popular' || args.badge === 'bestValue' ? args.badge : null,
    visible: args.visible !== false,
    discountType,
    discountValue: discountType ? wholeNumber(args.discountValue, discountType === 'percent' ? 90 : 100_000) : null,
    allowFreeze: args.allowFreeze === true,
    autoRenew: args.autoRenew === true,
  };
  if (args.planId != null) {
    const id = text(args.planId, 80) ?? fail('VALIDATION');
    const existing = (await unwrap(client.models.MembershipPlan.get({ id }))) ?? fail('NOT_FOUND');
    if (existing.gymId !== facility.id) fail('UNAUTHORIZED');
    check(await client.models.MembershipPlan.update({ id, ...plan }));
    return id;
  }
  const id = `${facility.id}-${plan.kind}-${Date.now().toString(36)}`;
  check(await client.models.MembershipPlan.create({ id, ...plan }));
  return id;
}

async function saveFacility(caller: Caller, args: Args) {
  const facility = await ownFacility(caller, args.facilityId);
  const images = args.images == null ? undefined : textList(args.images, 12).map((u) => (/^https:\/\//.test(u) ? u : fail('VALIDATION')));
  const phone = optionalText(args.phone, 16);
  const whatsapp = optionalText(args.whatsapp, 16);
  const storeUrl = optionalText(args.storeUrl, 300);
  if (storeUrl && !/^https:\/\//.test(storeUrl)) fail('VALIDATION');
  const coord = (v: unknown, max: number) => (v == null ? null : typeof v === 'number' && Math.abs(v) <= max ? v : fail('VALIDATION'));
  const serviceMode = args.serviceMode == null ? undefined : ['inShop', 'home', 'both'].includes(args.serviceMode as string) ? (args.serviceMode as 'inShop' | 'home' | 'both') : fail('VALIDATION');
  const patch = {
    ...(args.name != null ? { name: text(args.name, 80) ?? fail('VALIDATION') } : {}),
    ...(args.description != null ? { description: text(args.description, 1000) ?? fail('VALIDATION') } : {}),
    ...(args.area != null ? { area: text(args.area, 80) ?? fail('VALIDATION') } : {}),
    ...(args.address != null ? { address: text(args.address, 200) ?? fail('VALIDATION') } : {}),
    ...(args.logo !== undefined ? { logo: optionalText(args.logo, 500) } : {}),
    ...(images ? { images } : {}),
    ...(args.phone !== undefined ? { phone } : {}),
    ...(args.whatsapp !== undefined ? { whatsapp } : {}),
    ...(args.storeUrl !== undefined ? { storeUrl } : {}),
    ...(args.region !== undefined ? { region: optionalText(args.region, 80) } : {}),
    ...(args.lat !== undefined ? { lat: coord(args.lat, 90), lng: coord(args.lng, 180) } : {}),
    ...(serviceMode ? { serviceMode } : {}),
    ...(args.categoryIds != null ? { categoryIds: textList(args.categoryIds, 12) } : {}),
  };
  check(await client.models.Gym.update({ id: facility.id, ...patch }));
  return facility.id;
}

async function saveTrainer(caller: Caller, args: Args) {
  const facility = await ownFacility(caller, args.facilityId);
  const record = {
    gymId: facility.id,
    name: text(args.name, 80) ?? fail('VALIDATION'),
    title: optionalText(args.title, 80) ?? '',
    bio: optionalText(args.bio, 1000) ?? '',
    image: text(args.image, 500) ?? fail('VALIDATION'),
    specialties: textList(args.specialties ?? []),
    skills: textList(args.skills ?? []),
    yearsExperience: wholeNumber(args.yearsExperience, 60),
    pricePerSession: wholeNumber(args.pricePerSession, 100_000),
    languages: textList(args.languages ?? []),
    certifications: textList(args.certifications ?? []),
    departmentId: optionalText(args.departmentId, 64),
  };
  if (args.trainerId != null) {
    const { trainer } = await ownTrainer(caller, args.trainerId);
    if (trainer.gymId !== facility.id) fail('UNAUTHORIZED');
    check(await client.models.Trainer.update({ id: trainer.id, ...record }));
    return trainer.id;
  }
  const siblings = await listAll((nextToken) => client.models.Trainer.listTrainersByGym({ gymId: facility.id }, { nextToken }));
  const id = newId('tr', record.name);
  check(await client.models.Trainer.create({ id, ...record, sortOrder: siblings.length }));
  return id;
}

type BookingAction = { bookingId: string; action: 'keep' | 'reassign'; trainerId?: string };

// Blocking a trainer with upcoming bookings: each booking either stays (the customer sees "trainer unavailable,
// the facility will contact you") or moves to another trainer of the same facility (if that slot is free).
// Each affected customer gets an in-app notification, and the facility gets one record of the change.
async function setTrainerAvailability(caller: Caller, args: Args) {
  const { trainer, facility } = await ownTrainer(caller, args.trainerId);
  const unavailable = args.unavailable === true;
  const from = optionalDay(args.unavailableFrom);
  const until = optionalDay(args.unavailableUntil);
  if (from && until && until < from) fail('VALIDATION');
  const weekly = Array.isArray(args.weeklyHours) ? args.weeklyHours : typeof args.weeklyHours === 'string' ? JSON.parse(args.weeklyHours) : [];
  const weeklyHours = (weekly as { weekday?: unknown; open?: unknown; close?: unknown }[]).map((h) => {
    const ok = Number.isInteger(h.weekday) && (h.weekday as number) >= 0 && (h.weekday as number) <= 6 && typeof h.open === 'string' && typeof h.close === 'string';
    if (!ok || !/^\d{2}:\d{2}$/.test(h.open as string) || !/^\d{2}:\d{2}$/.test(h.close as string) || (h.open as string) >= (h.close as string)) fail('VALIDATION');
    return { weekday: h.weekday as number, open: h.open as string, close: h.close as string };
  });
  const record = { trainerId: trainer.id, gymId: facility.id, unavailable, unavailableFrom: from, unavailableUntil: until, weeklyHours };
  const existing = await unwrap(client.models.TrainerAvailability.get({ trainerId: trainer.id }));
  check(await (existing ? client.models.TrainerAvailability.update(record) : client.models.TrainerAvailability.create(record)));

  if (!unavailable) return { affected: 0 };
  const rawActions = typeof args.actions === 'string' ? JSON.parse(args.actions) : (args.actions ?? []);
  const actions = new Map((rawActions as BookingAction[]).map((a) => [a.bookingId, a]));
  const now = Date.now();
  const inBlock = (b: BookingRecord) => {
    const day = (b.date ?? '').slice(0, 10);
    return (!from || day >= from) && (!until || day <= until);
  };
  const affected = (await facilityBookingsAll(facility.id)).filter((b) => b.trainerId === trainer.id && upcomingOf(b, now) && inBlock(b));
  let moved = 0;
  for (const b of affected) {
    const action = actions.get(b.id);
    if (action?.action === 'reassign' && action.trainerId && action.trainerId !== trainer.id) {
      const target = await unwrap(client.models.Trainer.get({ id: action.trainerId }));
      if (!target || target.gymId !== facility.id) fail('VALIDATION');
      const lock = await client.models.SlotReservation.create({ trainerId: target.id, startAt: b.date!, bookingId: b.id });
      if (isConditionalFailure(lock.errors)) fail('SLOT_TAKEN');
      check(lock);
      await mutateIf(client, 'delete', 'SlotReservation', { trainerId: trainer.id, startAt: b.date! }, { bookingId: { eq: b.id } });
      check(await client.models.Booking.update({ id: b.id, trainerId: target.id, trainerName: target.name, trainerUnavailable: false }));
      await notify(b.owner, 'trainerReassigned', { bookingId: b.id, gymName: facility.name, trainerName: target.name, date: b.date });
      moved += 1;
    } else {
      check(await client.models.Booking.update({ id: b.id, trainerUnavailable: true }));
      await notify(b.owner, 'trainerUnavailable', { bookingId: b.id, gymName: facility.name, trainerName: trainer.name, date: b.date });
    }
  }
  if (affected.length > 0) {
    await notify(facility.ownerId, 'trainerBlocked', { facilityId: facility.id, trainerName: trainer.name, bookings: affected.length, moved });
  }
  return { affected: affected.length };
}

async function replyReview(caller: Caller, args: Args) {
  const id = text(args.reviewId, 80) ?? fail('VALIDATION');
  const reply = text(args.reply, 1000) ?? fail('VALIDATION');
  const review = (await unwrap(client.models.Review.get({ id }))) ?? fail('NOT_FOUND');
  const gymId = review.gymId ?? (review.trainerId ? (await unwrap(client.models.Trainer.get({ id: review.trainerId })))?.gymId : null);
  await ownFacility(caller, gymId ?? fail('NOT_FOUND'));
  check(await client.models.Review.update({ id, ownerReply: reply, ownerReplyAt: new Date().toISOString() }));
  return true;
}

export const handler = async (event: ResolverEvent) => {
  const caller = callerOf(event.identity);
  if (!caller.owner) fail('UNAUTHORIZED');
  const args = event.arguments;
  switch (event.fieldName) {
    case 'facilityInsights':
      return insights(caller, args);
    case 'facilityMembers':
      return members(caller, args);
    case 'facilityBookings':
      return bookingsOf(caller, args);
    case 'facilityReviews':
      return reviewsOf(caller, args);
    case 'facilityTrainers':
      return trainersOf(caller, args);
    case 'trainerSchedule':
      return trainerSchedule(caller, args);
    case 'ownerSavePlan':
      return savePlan(caller, args);
    case 'ownerSaveFacility':
      return saveFacility(caller, args);
    case 'ownerSaveTrainer':
      return saveTrainer(caller, args);
    case 'ownerSetTrainerAvailability':
      return setTrainerAvailability(caller, args);
    case 'ownerReplyReview':
      return replyReview(caller, args);
    default:
      throw new Error('UNSUPPORTED_OPERATION');
  }
};
