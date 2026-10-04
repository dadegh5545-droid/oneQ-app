import type { AdminFacilityInput, ConsoleStats, FacilitySummary, OwnerRow, SectionInput } from '@/domain/dashboard';
import type { Booking, Review } from '@/domain/models';

import { data, listAll, newestFirst, required, run, toBooking, toReview } from './amplifyRepository';
import { dashboardRepository, toSection, type SectionInfo } from './dashboardRepository';

// Platform administration (Cognito `admin` group). The admin-ops function and model rules enforce the group.
const asUser = { authMode: 'userPool' } as const;

export const consoleRepository = {
  listFacilities: (): Promise<FacilitySummary[]> => dashboardRepository.listFacilities(),
  async listSections(): Promise<SectionInfo[]> {
    const sections = await listAll((nextToken) => data().models.Section.list({ ...asUser, nextToken, limit: 100 }));
    return sections.map(toSection).sort((a, b) => a.order - b.order);
  },
  async sectionCategories(slug: string) {
    const items = await listAll((nextToken) => data().models.SectionCategory.listCategoriesBySection({ sectionId: slug }, { ...asUser, nextToken }));
    return items.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn ?? null, order: c.order })).sort((a, b) => a.order - b.order);
  },
  async saveSection(slug: string | null, input: SectionInput) {
    const { data: saved } = await run(data().mutations.adminSaveSection({ slug, input: JSON.stringify(input) }, asUser));
    return required(saved);
  },
  async deleteSection(slug: string) {
    await run(data().mutations.adminDeleteSection({ slug }, asUser));
  },
  async setFacilityStatus(facilityId: string, status: 'pending' | 'approved' | 'suspended', reason: string | null) {
    await run(data().mutations.adminSetFacilityStatus({ facilityId, status, reason }, asUser));
  },
  async saveFacility(facilityId: string | null, input: AdminFacilityInput) {
    const { data: id } = await run(data().mutations.adminSaveFacility({ facilityId, input: JSON.stringify(input) }, asUser));
    return required(id);
  },
  async createOwner(fullName: string, email: string, phone: string) {
    const { data: owner } = await run(data().mutations.adminCreateFacilityOwner({ fullName, email, phone }, asUser));
    return required(owner);
  },
  async listOwners(): Promise<OwnerRow[]> {
    const { data: rows } = await run(data().queries.adminListOwners(asUser));
    return required(rows).map((o) => ({
      username: o.username,
      ownerKey: o.ownerKey,
      email: o.email,
      fullName: o.fullName,
      phone: o.phone ?? null,
      enabled: o.enabled,
      createdAt: o.createdAt ?? null,
      facilities: o.facilities,
    }));
  },
  async suspendAccount(username: string, suspended: boolean) {
    const { data: result } = await run(data().mutations.adminSuspendAccount({ username, suspended }, asUser));
    return required(result).facilities;
  },
  async stats(): Promise<ConsoleStats> {
    const { data: s } = await run(data().queries.adminStats(asUser));
    const v = required(s);
    return { bookingsToday: v.bookingsToday, pendingFacilities: v.pendingFacilities, activeFacilities: v.activeFacilities, newCustomers: v.newCustomers };
  },
  async allBookings(): Promise<(Booking & { sectionId: string | null; cancelReason: string | null })[]> {
    const bookings = await listAll((nextToken) => data().models.Booking.list({ ...asUser, nextToken, limit: 200 }));
    return bookings
      .map((b) => ({ ...toBooking(b), sectionId: b.sectionId ?? null, cancelReason: b.cancelReason ?? null }))
      .sort(newestFirst);
  },
  async cancelBooking(id: string, reason: string | null) {
    await run(data().mutations.adminCancelBooking({ id, reason }, asUser));
  },
  async allReviews(): Promise<Review[]> {
    const reviews = await listAll((nextToken) => data().models.Review.list({ ...asUser, nextToken, limit: 200 }));
    return reviews.map(toReview).sort((x, y) => y.date.localeCompare(x.date));
  },
  async removeReview(id: string) {
    await run(data().mutations.removeReview({ id }, asUser));
  },
};

export type ConsoleRepository = typeof consoleRepository;
