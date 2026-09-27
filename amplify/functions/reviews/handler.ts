import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/reviews';

import { SESSION_MINUTES, sessionStart } from '../../../src/domain/rules';
import type { Schema } from '../../data/resource';
import {
  check,
  fail,
  isAdmin,
  isConditionalFailure,
  mutateIf,
  ownerOf,
  qatarNow,
  sha256,
  text,
  unwrap,
  ymd,
  type Args,
  type ResolverEvent,
} from '../shared/data';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

// Verified ratings for gyms and trainers. Clients never write Review, Gym/Trainer aggregates or other users'
// reviews: every write goes through this function, which checks eligibility and ownership and keeps
// rating/reviewCount/ratingSum consistent with the stored reviews.

type Target = { type: 'gym' | 'trainer'; id: string };
type ReviewRecord = Schema['Review']['type'];
type BookingRecord = Schema['Booking']['type'];

const MAX_TEXT = 1000;

function parseTarget(args: Args): Target {
  const type = args.targetType;
  if (type !== 'gym' && type !== 'trainer') fail('VALIDATION');
  return { type, id: text(args.targetId, 64) ?? fail('VALIDATION') };
}

const hex = (value: string) => sha256(value).toString('hex').slice(0, 32);
// One review per user and target: the id is derived from both, so a second create is a conditional failure.
const reviewIdFor = (owner: string, t: Target) => `rv-${hex(`${owner}|${t.type}|${t.id}`)}`;
// Stored instead of the owner id, so public review data does not expose Cognito identifiers.
const authorKeyFor = (owner: string) => hex(`author:${owner}`);

const targetOf = (r: ReviewRecord): Target | null =>
  r.trainerId ? { type: 'trainer', id: r.trainerId } : r.gymId ? { type: 'gym', id: r.gymId } : null;

const toView = (r: ReviewRecord) => ({
  id: r.id,
  gymId: r.gymId ?? null,
  trainerId: r.trainerId ?? null,
  authorName: r.authorName,
  rating: r.rating,
  text: r.text,
  date: r.date,
  mine: true,
});

// A booking qualifies once it happened: a session after it ended, a membership once it started.
// Trainer reviews need a session with that trainer; gym reviews any booking at that gym.
function qualifies(b: BookingRecord, t: Target, today: string) {
  if (b.status === 'cancelled') return false;
  const sessionEnded = b.type === 'session' && !!b.date && sessionStart(b.date).getTime() + SESSION_MINUTES * 60_000 <= Date.now();
  if (t.type === 'trainer') return sessionEnded && b.trainerId === t.id;
  const membershipStarted = b.type === 'membership' && !!b.membershipStart && b.membershipStart <= today;
  return b.gymId === t.id && (sessionEnded || membershipStarted);
}

async function eligibleBooking(owner: string, t: Target) {
  const today = ymd(qatarNow());
  let nextToken: string | null | undefined;
  do {
    const page = check(await client.models.Booking.listBookingsByOwner({ owner }, { nextToken }));
    const match = page.data.find((b) => qualifies(b, t, today));
    if (match) return match;
    nextToken = page.nextToken;
  } while (nextToken);
  return null;
}

// Arabic family names usually begin with the article "ال" (الأنصاري); the initial is the letter after it.
const initialOf = (surname: string) => (/^ال[؀-ۿ]{2,}/.test(surname) ? surname.slice(2) : surname)[0];

// "Sara Al-Ansari" → "Sara A.", "سارة الأنصاري" → "سارة أ." (first name and initial only).
async function authorName(owner: string) {
  const profile = await unwrap(client.models.UserProfile.get({ profileOwner: owner }));
  const parts = (profile?.fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OneQ member';
  return parts.length > 1 ? `${parts[0]} ${initialOf(parts[parts.length - 1]!)}.` : parts[0]!;
}

// Atomic aggregate update: read the current values, write the new ones on condition that nobody changed them
// in between, retry on conflict. rating = ratingSum / reviewCount (1 decimal).
const getTarget = (t: Target) =>
  t.type === 'gym' ? unwrap(client.models.Gym.get({ id: t.id })) : unwrap(client.models.Trainer.get({ id: t.id }));

async function adjustAggregate(t: Target, deltaSum: number, deltaCount: number) {
  const model = t.type === 'gym' ? 'Gym' : 'Trainer';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = await getTarget(t);
    if (!current) return;
    const count = current.reviewCount ?? 0;
    const sum = current.ratingSum ?? (current.rating ?? 0) * count;
    const nextCount = Math.max(0, count + deltaCount);
    const nextSum = nextCount === 0 ? 0 : Math.max(0, Math.round((sum + deltaSum) * 10) / 10);
    const rating = nextCount === 0 ? 0 : Math.round((nextSum / nextCount) * 10) / 10;
    const condition = {
      reviewCount: current.reviewCount == null ? { attributeExists: false } : { eq: current.reviewCount },
      ratingSum: current.ratingSum == null ? { attributeExists: false } : { eq: current.ratingSum },
    };
    if (await mutateIf(client, 'update', model, { id: t.id, rating, reviewCount: nextCount, ratingSum: nextSum }, condition)) return;
  }
  fail('CONFLICT');
}

async function reviewStatus(args: Args, owner: string) {
  const t = parseTarget(args);
  const existing = await unwrap(client.models.Review.get({ id: reviewIdFor(owner, t) }));
  const eligible = !!(await eligibleBooking(owner, t));
  return { eligible, review: existing ? toView(existing) : null };
}

async function submitReview(args: Args, owner: string) {
  const t = parseTarget(args);
  const rating = args.rating;
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) fail('VALIDATION');
  const reviewText = typeof args.text === 'string' ? args.text.trim() : '';
  if (reviewText.length > MAX_TEXT) fail('VALIDATION');
  if (!(await getTarget(t))) fail('NOT_FOUND');
  const booking = (await eligibleBooking(owner, t)) ?? fail('REVIEW_NOT_ELIGIBLE');

  const id = reviewIdFor(owner, t);
  const date = ymd(qatarNow());

  if (args.reviewId == null) {
    const created = await client.models.Review.create({
      id,
      ...(t.type === 'gym' ? { gymId: t.id } : { trainerId: t.id }),
      authorName: await authorName(owner),
      authorKey: authorKeyFor(owner),
      bookingId: booking.id,
      rating,
      text: reviewText,
      date,
    });
    if (isConditionalFailure(created.errors)) fail('DUPLICATE_REVIEW');
    const review = check(created).data ?? fail('NOT_FOUND');
    await adjustAggregate(t, rating, 1);
    return toView(review);
  }

  // Edit: only the caller's own review for this target (the id is derived from the caller).
  if (args.reviewId !== id) fail('UNAUTHORIZED');
  const existing = (await unwrap(client.models.Review.get({ id }))) ?? fail('NOT_FOUND');
  const changed = await mutateIf(client, 'update', 'Review', { id, rating, text: reviewText, date }, { rating: { eq: existing.rating } });
  if (!changed) fail('CONFLICT');
  await adjustAggregate(t, rating - existing.rating, 0);
  return toView({ ...existing, rating, text: reviewText, date });
}

// Owners remove their own review; admins moderate any review. Delete is conditional on existence, so the
// aggregate is adjusted exactly once.
async function removeReview(args: Args, identity: ResolverEvent['identity']) {
  const id = text(args.id, 64) ?? fail('VALIDATION');
  const review = (await unwrap(client.models.Review.get({ id }))) ?? fail('NOT_FOUND');
  const owner = ownerOf(identity);
  const own = !!owner && review.authorKey === authorKeyFor(owner);
  if (!own && !isAdmin(identity)) fail('UNAUTHORIZED');
  const deleted = await client.models.Review.delete({ id });
  if (isConditionalFailure(deleted.errors)) fail('NOT_FOUND');
  check(deleted);
  const t = targetOf(review);
  if (t) await adjustAggregate(t, -review.rating, -1);
  return { ...toView(review), mine: own };
}

export const handler = async (event: ResolverEvent) => {
  const owner = ownerOf(event.identity);
  switch (event.fieldName) {
    case 'reviewStatus':
      return reviewStatus(event.arguments, owner ?? fail('UNAUTHORIZED'));
    case 'submitReview':
      return submitReview(event.arguments, owner ?? fail('UNAUTHORIZED'));
    case 'removeReview':
      return removeReview(event.arguments, event.identity);
    default:
      throw new Error('UNSUPPORTED_OPERATION');
  }
};
