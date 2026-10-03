import type {
  AppNotification,
  AvailabilityInput,
  BookingRow,
  FacilityInput,
  FacilityInsights,
  FacilityStatus,
  FacilitySummary,
  MemberRow,
  MemberStatus,
  Period,
  PlanInput,
  PlanRow,
  PresetType,
  ReviewRow,
  ServiceMode,
  TrainerInput,
  TrainerRow,
} from '@/domain/dashboard';

import type { Schema } from '../../../amplify/data/resource';
import { currentOwnerKey, data, listAll, required, run } from './amplifyRepository';

// Facility dashboards. Every call uses the signed-in user's token; the facility-owner function checks that the
// caller owns the facility (or is an admin) before reading or writing anything.
const asUser = { authMode: 'userPool' } as const;

type GymRecord = Schema['Gym']['type'];
type PlanRecord = Schema['MembershipPlan']['type'];
type SectionRecord = Schema['Section']['type'];

const toFacility = (g: GymRecord): FacilitySummary => ({
  id: g.id,
  name: g.name,
  area: g.area,
  address: g.address,
  description: g.description,
  sectionId: g.sectionId ?? 'gym',
  // Records from before sections are approved gyms (amplify/functions/shared/facilities.ts).
  status: (g.status ?? (g.createdBy ? 'pending' : 'approved')) as FacilityStatus,
  statusReason: g.statusReason ?? null,
  ownerId: g.ownerId ?? null,
  images: [...g.images],
  logo: g.logo ?? null,
  phone: g.phone ?? null,
  whatsapp: g.whatsapp ?? null,
  storeUrl: g.storeUrl ?? null,
  region: g.region ?? null,
  lat: g.lat ?? null,
  lng: g.lng ?? null,
  serviceMode: (g.serviceMode ?? null) as ServiceMode | null,
  categoryIds: (g.categoryIds ?? []).filter((c): c is string => !!c),
  rating: g.rating ?? 0,
  reviewCount: g.reviewCount ?? 0,
});

export const toPlanRow = (p: PlanRecord): PlanRow => ({
  id: p.id,
  kind: p.kind,
  name: p.name,
  description: p.description,
  price: p.price,
  durationMonths: p.durationMonths,
  badge: p.badge ?? null,
  visible: p.visible !== false,
  discountType: p.discountType === 'percent' || p.discountType === 'amount' ? p.discountType : null,
  discountValue: p.discountValue ?? null,
  allowFreeze: p.allowFreeze === true,
  autoRenew: p.autoRenew === true,
});

export interface SectionInfo {
  slug: string;
  nameAr: string;
  nameEn: string | null;
  colorKey: string;
  icon: string;
  presetType: PresetType;
  bookingMode: 'appointment' | 'subscription' | 'both';
  hasPractitioners: boolean;
  hasServices: boolean;
  hasDepartments: boolean;
  hasPackages: boolean;
  hasGallery: boolean;
  practitionerLabelAr: string | null;
  practitionerLabelEn: string | null;
  status: 'visible' | 'hidden';
  order: number;
  descAr: string | null;
  descEn: string | null;
}

export const toSection = (s: SectionRecord): SectionInfo => ({
  slug: s.slug,
  nameAr: s.nameAr,
  nameEn: s.nameEn ?? null,
  colorKey: s.colorKey,
  icon: s.icon,
  presetType: s.presetType as PresetType,
  bookingMode: s.bookingMode as SectionInfo['bookingMode'],
  hasPractitioners: s.hasPractitioners,
  hasServices: s.hasServices,
  hasDepartments: s.hasDepartments,
  hasPackages: s.hasPackages,
  hasGallery: s.hasGallery,
  practitionerLabelAr: s.practitionerLabelAr ?? null,
  practitionerLabelEn: s.practitionerLabelEn ?? null,
  status: (s.status ?? 'visible') as SectionInfo['status'],
  order: s.order,
  descAr: s.descAr ?? null,
  descEn: s.descEn ?? null,
});

const toBookingRow = (b: Schema['BookingRow']['type']): BookingRow => ({
  id: b.id,
  type: b.type,
  status: b.status,
  customerName: b.customerName,
  customerPhone: b.customerPhone ?? null,
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
  homeService: b.homeService,
  trainerUnavailable: b.trainerUnavailable,
  cancelReason: b.cancelReason ?? null,
});

const toMemberRow = (m: Schema['MemberRow']['type']): MemberRow => ({
  bookingId: m.bookingId,
  name: m.name,
  phone: m.phone,
  planName: m.planName,
  planId: m.planId ?? null,
  start: m.start ?? null,
  end: m.end ?? null,
  status: m.status as MemberStatus,
  amount: m.amount,
});

const toReviewRow = (r: Schema['ReviewRow']['type']): ReviewRow => ({
  id: r.id,
  authorName: r.authorName,
  rating: r.rating,
  text: r.text,
  date: r.date,
  satisfied: r.satisfied ?? null,
  trainerName: r.trainerName ?? null,
  ownerReply: r.ownerReply ?? null,
  ownerReplyAt: r.ownerReplyAt ?? null,
});

const toTrainerRow = (t: Schema['TrainerRow']['type']): TrainerRow => ({
  id: t.id,
  name: t.name,
  title: t.title,
  bio: t.bio,
  image: t.image,
  specialties: [...t.specialties],
  skills: [...t.skills],
  yearsExperience: t.yearsExperience,
  pricePerSession: t.pricePerSession,
  languages: [...t.languages],
  certifications: [...t.certifications],
  departmentId: t.departmentId ?? null,
  rating: t.rating,
  reviewCount: t.reviewCount,
  unavailable: t.unavailable,
  unavailableFrom: t.unavailableFrom ?? null,
  unavailableUntil: t.unavailableUntil ?? null,
  weeklyHours: t.weeklyHours.map((h) => ({ weekday: h.weekday, open: h.open, close: h.close })),
});

const parseParams = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

export const dashboardRepository = {
  // Owners get their own facilities (owner rule); admins get every facility.
  async listFacilities() {
    const gyms = await listAll((nextToken) => data().models.Gym.list({ ...asUser, nextToken, limit: 100 }));
    return gyms.map(toFacility).sort((a, b) => a.name.localeCompare(b.name));
  },
  async getFacility(id: string) {
    const { data: gym } = await run(data().models.Gym.get({ id }, asUser));
    return gym ? toFacility(gym) : null;
  },
  async listSections() {
    const sections = await listAll((nextToken) => data().models.Section.list({ ...asUser, nextToken, limit: 100 }));
    return sections.map(toSection).sort((a, b) => a.order - b.order);
  },
  async insights(facilityId: string, period: Period): Promise<FacilityInsights> {
    const { data: i } = await run(data().queries.facilityInsights({ facilityId, period }, asUser));
    const v = required(i);
    return {
      period: v.period as Period,
      members: v.members,
      activeMembers: v.activeMembers,
      newMembers: v.newMembers,
      revenue: v.revenue,
      trainerBookings: v.trainerBookings,
      planDistribution: v.planDistribution.map((c) => ({ label: c.label, count: c.count })),
      popularPlan: v.popularPlan ?? null,
      membersSeries: v.membersSeries.map((p) => ({ start: p.start, value: p.value })),
      revenueSeries: v.revenueSeries.map((p) => ({ start: p.start, value: p.value })),
      newMembersSeries: v.newMembersSeries.map((p) => ({ start: p.start, value: p.value })),
      expiringSoon: v.expiringSoon.map(toMemberRow),
      latestBookings: v.latestBookings.map(toBookingRow),
      latestReviews: v.latestReviews.map(toReviewRow),
      ratingAverage: v.ratingAverage,
      ratingCount: v.ratingCount,
      ratingDistribution: [...v.ratingDistribution],
    };
  },
  async members(facilityId: string) {
    const { data: rows } = await run(data().queries.facilityMembers({ facilityId }, asUser));
    return required(rows).map(toMemberRow);
  },
  async bookings(facilityId: string, from?: string, to?: string) {
    const { data: rows } = await run(data().queries.facilityBookings({ facilityId, from, to }, asUser));
    return required(rows).map(toBookingRow);
  },
  async reviews(facilityId: string) {
    const { data: rows } = await run(data().queries.facilityReviews({ facilityId }, asUser));
    return required(rows).map(toReviewRow);
  },
  async trainers(facilityId: string) {
    const { data: rows } = await run(data().queries.facilityTrainers({ facilityId }, asUser));
    return required(rows).map(toTrainerRow);
  },
  async trainerSchedule(trainerId: string, from?: string, to?: string) {
    const { data: rows } = await run(data().queries.trainerSchedule({ trainerId, from, to }, asUser));
    return required(rows).map(toBookingRow);
  },
  async plans(facilityId: string) {
    const plans = await listAll((nextToken) => data().models.MembershipPlan.listPlansByGym({ gymId: facilityId }, { ...asUser, nextToken }));
    return plans.map(toPlanRow);
  },
  async savePlan(facilityId: string, p: PlanInput) {
    const { data: id } = await run(
      data().mutations.ownerSavePlan(
        {
          facilityId,
          planId: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          durationMonths: p.durationMonths,
          badge: p.badge,
          visible: p.visible,
          discountType: p.discountType,
          discountValue: p.discountValue,
          allowFreeze: p.allowFreeze,
          autoRenew: p.autoRenew,
        },
        asUser,
      ),
    );
    return required(id);
  },
  async saveFacility(facilityId: string, input: FacilityInput) {
    await run(data().mutations.ownerSaveFacility({ facilityId, ...input }, asUser));
  },
  async saveTrainer(facilityId: string, t: TrainerInput) {
    const { data: id } = await run(
      data().mutations.ownerSaveTrainer(
        {
          facilityId,
          trainerId: t.id,
          name: t.name,
          title: t.title,
          bio: t.bio,
          image: t.image,
          specialties: t.specialties,
          skills: t.skills,
          yearsExperience: t.yearsExperience,
          pricePerSession: t.pricePerSession,
          languages: t.languages,
          certifications: t.certifications,
          departmentId: t.departmentId,
        },
        asUser,
      ),
    );
    return required(id);
  },
  async setTrainerAvailability(input: AvailabilityInput) {
    const { data: result } = await run(
      data().mutations.ownerSetTrainerAvailability(
        {
          trainerId: input.trainerId,
          unavailable: input.unavailable,
          unavailableFrom: input.unavailableFrom,
          unavailableUntil: input.unavailableUntil,
          weeklyHours: JSON.stringify(input.weeklyHours),
          actions: JSON.stringify(input.actions),
        },
        asUser,
      ),
    );
    return required(result).affected;
  },
  async replyReview(reviewId: string, reply: string) {
    await run(data().mutations.ownerReplyReview({ reviewId, reply }, asUser));
  },
  // The signed-in user's in-app notifications, newest first.
  async notifications(): Promise<AppNotification[]> {
    const recipient = await currentOwnerKey();
    const items = await listAll((nextToken) => data().models.Notification.listNotificationsByRecipient({ recipient }, { ...asUser, nextToken }));
    return items
      .map((n) => ({ id: n.id, kind: n.kind, params: parseParams(n.params), createdAt: n.createdAt, readAt: n.readAt ?? null }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async markNotificationRead(id: string) {
    await run(data().models.Notification.update({ id, readAt: new Date().toISOString() }, asUser));
  },
};

export type DashboardRepository = typeof dashboardRepository;
