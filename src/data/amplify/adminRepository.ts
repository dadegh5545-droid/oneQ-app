import type { OpeningHours } from '@/domain/models';
import { buildPlans, PLAN_MONTHS } from '@/domain/rules';

import type { AdminRepository } from '../repository';
import { data, listAll, newestFirst, required, run, toBooking, toReview } from './amplifyRepository';

// Every call uses the signed-in user's Cognito token; the backend accepts writes only from the `admin` group.
const asUser = { authMode: 'userPool' } as const;

// Default hours for new gyms (the approved catalogue's hours).
const DEFAULT_HOURS: OpeningHours[] = [
  ...(['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const).map((day) => ({ day, open: '6:00 AM', close: '11:00 PM' })),
  { day: 'Friday', open: '8:00 AM', close: '10:00 PM' },
];

// "Peak Performance" → "peak-performance"; unique among `taken`.
function newId(name: string, fallback: string, taken: string[]) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `${fallback}-${Date.now().toString(36)}`;
  let id = base;
  for (let n = 2; taken.includes(id); n += 1) id = `${base}-${n}`;
  return id;
}

export const adminRepository: AdminRepository = {
  async saveGym(id, input) {
    if (id) {
      await run(data().models.Gym.update({ id, ...input }, asUser));
      return id;
    }
    const gyms = await listAll((nextToken) => data().models.Gym.list({ ...asUser, nextToken, limit: 100 }));
    const gymId = newId(input.name, 'gym', gyms.map((g) => g.id));
    // Ratings start empty: rating/reviewCount are written only by the reviews function.
    await run(data().models.Gym.create({ id: gymId, ...input, openingHours: DEFAULT_HOURS, sortOrder: gyms.length }, asUser));
    // A new gym gets the standard three plans (04 §3 formula); prices can then be edited per plan.
    for (const { id: planId, kind, name, price, description, badge } of buildPlans(gymId, input.monthlyPrice)) {
      await run(data().models.MembershipPlan.create({ id: planId, gymId, kind, name, price, description, badge, durationMonths: PLAN_MONTHS[kind] }, asUser));
    }
    return gymId;
  },
  async savePlan({ id, price, description, badge }) {
    await run(data().models.MembershipPlan.update({ id, price, description, badge }, asUser));
  },
  async saveTrainer(id, input) {
    if (id) {
      await run(data().models.Trainer.update({ id, ...input }, asUser));
      return id;
    }
    const all = await listAll((nextToken) => data().models.Trainer.list({ ...asUser, nextToken, limit: 100 }));
    const trainerId = newId(input.name, 'trainer', all.map((t) => t.id));
    const sortOrder = all.filter((t) => t.gymId === input.gymId).length;
    await run(data().models.Trainer.create({ id: trainerId, ...input, sortOrder }, asUser));
    return trainerId;
  },
  async listAllBookings() {
    const bookings = await listAll((nextToken) => data().models.Booking.list({ ...asUser, nextToken, limit: 100 }));
    return bookings.map(toBooking).sort(newestFirst);
  },
  async cancelBooking(id) {
    const { data: view } = await run(data().mutations.adminCancelBooking({ id }, asUser));
    return toBooking(required(view));
  },
  async listAllReviews() {
    const reviews = await listAll((nextToken) => data().models.Review.list({ ...asUser, nextToken, limit: 200 }));
    return reviews.map(toReview).sort((x, y) => y.date.localeCompare(x.date));
  },
  async listAvailabilityRules(trainerId) {
    const rules = await listAll((nextToken) => data().models.AvailabilityRule.list({ trainerId, ...asUser, nextToken }));
    return rules.map((r) => ({ trainerId: r.trainerId, key: r.key, closed: r.closed, slots: r.slots.filter((m): m is number => m != null) }));
  },
  async saveAvailabilityRule(rule) {
    const exists = (await run(data().models.AvailabilityRule.get({ trainerId: rule.trainerId, key: rule.key }, asUser))).data;
    await run(exists ? data().models.AvailabilityRule.update(rule, asUser) : data().models.AvailabilityRule.create(rule, asUser));
  },
  async deleteAvailabilityRule(trainerId, key) {
    await run(data().models.AvailabilityRule.delete({ trainerId, key }, asUser));
  },
};
