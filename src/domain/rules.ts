import { addDays, endOfDay, startOfDay } from 'date-fns';

import type { Booking, BookingDraft, Gym, MembershipPlan, PlanKind, Specialty } from './models';

// 12-CLAUDE-CODE-BUILD-INSTRUCTIONS.md §3 — implemented exactly.

export const buildPlans = (gymId: string, m: number): MembershipPlan[] => [
  { id: `${gymId}-monthly`, kind: 'monthly', name: 'Monthly', price: m, description: 'Full gym access, billed every month.', badge: null },
  { id: `${gymId}-3m`, kind: '3m', name: '3 Months', price: Math.round(m * 3 * 0.9), description: 'A calmer commitment with a quieter monthly rate.', badge: 'Save 10%' },
  { id: `${gymId}-6m`, kind: '6m', name: '6 Months', price: Math.round(m * 6 * 0.78), description: 'The most considered way to settle into a routine.', badge: 'Most Popular' },
];

// Plan ids are `${gymId}-monthly|3m|6m`.
export const planKindFromId = (planId: string): PlanKind | null => {
  const suffix = planId.slice(planId.lastIndexOf('-') + 1);
  return suffix === 'monthly' || suffix === '3m' || suffix === '6m' ? suffix : null;
};

export const SLOT_MINUTES = [540, 630, 720, 960, 1110, 1200];
export const LEAD_TIME_MINUTES = 60;

export const isClosed = (d: Date) => d.getDay() === 0; // Sunday

export const isSlotAvailable = (d: Date, i: number) => {
  const wd = d.getDay(); // 5 = Fri, 6 = Sat
  return wd === 5 || wd === 6 ? i !== 0 && i !== 3 : i !== 2;
};

// New rule: for today, slots earlier than now + 60 min are unavailable.
export const isSlotInFuture = (d: Date, minutes: number, now = new Date()) => {
  const start = new Date(startOfDay(d).getTime() + minutes * 60_000);
  return start.getTime() >= now.getTime() + LEAD_TIME_MINUTES * 60_000;
};

export const slotLabel = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${ap}`;
};

export const next14Days = (today: Date) => [...Array(14)].map((_, i) => addDays(startOfDay(today), i));

export const isUpcoming = (b: Booking, now = new Date()) =>
  b.status === 'completed' || b.status === 'cancelled'
    ? false
    : b.date == null
      ? b.status === 'confirmed'
      : endOfDay(new Date(b.date)) >= now;

export const draftTotal = (d: BookingDraft) =>
  d.path === 'membershipPlusTrainer' ? (d.trainer?.pricePerSession ?? 0) : (d.plan?.price ?? d.gym?.monthlyPrice ?? 0);

export const matchesQuery = (g: Gym, q: string) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [g.name, g.area, `${g.area}, Doha`].some((v) => v.toLowerCase().includes(s));
};

export const SPECIALTY_CHIPS = ['All', 'Strength', 'Weight Loss', 'Mobility', 'Functional Training'] as const;
export type SpecialtyChip = (typeof SPECIALTY_CHIPS)[number];
export const chipToSpecialty = (c: SpecialtyChip): Specialty | null =>
  c === 'All' ? null : c === 'Strength' ? 'Strength Training' : c;

export const greetingKey = (now = new Date()) => {
  const h = now.getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
};
