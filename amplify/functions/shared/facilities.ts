import type { Schema } from '../../data/resource';
import { check, type DataErrors } from './data';

// Facility rules shared by the data functions. A facility is a `Gym` record (the model keeps its original name
// so the existing table and its data stay); records from before sections have no section and no status: they
// are approved gyms.

type GymRecord = Schema['Gym']['type'];

export const sectionOf = (g: Pick<GymRecord, 'sectionId'>) => g.sectionId ?? 'gym';

export const statusOf = (g: Pick<GymRecord, 'status' | 'createdBy'>) => g.status ?? (g.createdBy ? 'pending' : 'approved');

type Page<T> = { data: T[]; nextToken?: string | null; errors?: DataErrors };

export async function listAll<T>(page: (nextToken: string | null | undefined) => Promise<Page<T>>) {
  const items: T[] = [];
  let nextToken: string | null | undefined;
  do {
    const result = check(await page(nextToken));
    items.push(...result.data);
    nextToken = result.nextToken;
  } while (nextToken);
  return items;
}

// The customer-facing view of a facility (FacilityView): no owner, status or audit fields.
export const facilityView = (g: GymRecord) => ({
  id: g.id,
  sectionId: sectionOf(g),
  name: g.name,
  area: g.area,
  description: g.description,
  address: g.address,
  rating: g.rating ?? null,
  reviewCount: g.reviewCount ?? null,
  monthlyPrice: g.monthlyPrice,
  trainerFromMonthly: g.trainerFromMonthly,
  images: [...g.images],
  amenities: [...g.amenities],
  openingHours: g.openingHours.map((h) => ({ day: h.day, open: h.open, close: h.close })),
  isFeatured: g.isFeatured,
  isNearby: g.isNearby,
  sortOrder: g.sortOrder,
  categoryIds: (g.categoryIds ?? []).filter((c): c is string => !!c),
  phone: g.phone ?? null,
  whatsapp: g.whatsapp ?? null,
  storeUrl: g.storeUrl ?? null,
  lat: g.lat ?? null,
  lng: g.lng ?? null,
  region: g.region ?? null,
  serviceMode: g.serviceMode ?? null,
  logo: g.logo ?? null,
});
