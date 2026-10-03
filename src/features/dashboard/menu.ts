import type { IconName } from '@/components/Icon';
import type { PresetType } from '@/domain/dashboard';

// Dashboard menus per section type. The routes live under src/app/dashboard/[facilityId]/; labels are i18n keys
// (the practitioner label comes from the section itself).

export type MenuKey = 'overview' | 'analytics' | 'members' | 'customers' | 'plans' | 'services' | 'photos' | 'practitioners' | 'departments' | 'bookings' | 'reviews';

export type MenuItem = { key: MenuKey; path: string; icon: IconName; label: string };

const ITEMS: Record<MenuKey, Omit<MenuItem, 'key' | 'label'> & { label: string }> = {
  overview: { path: '', icon: 'view-dashboard-outline', label: 'dashboard.menu.overview' },
  analytics: { path: 'analytics', icon: 'chart-bar', label: 'dashboard.menu.analytics' },
  members: { path: 'members', icon: 'account-group-outline', label: 'dashboard.menu.members' },
  customers: { path: 'customers', icon: 'account-group-outline', label: 'dashboard.menu.customers' },
  plans: { path: 'plans', icon: 'card-account-details-outline', label: 'dashboard.menu.plans' },
  services: { path: 'services', icon: 'tag-outline', label: 'dashboard.menu.services' },
  photos: { path: 'photos', icon: 'image-multiple-outline', label: 'dashboard.menu.photos' },
  practitioners: { path: 'practitioners', icon: 'account-tie-outline', label: 'dashboard.menu.practitioners' },
  departments: { path: 'departments', icon: 'domain', label: 'dashboard.menu.departments' },
  bookings: { path: 'bookings', icon: 'calendar-check-outline', label: 'dashboard.menu.bookings' },
  reviews: { path: 'reviews', icon: 'star-outline', label: 'dashboard.menu.reviews' },
};

const ORDER: Record<PresetType, MenuKey[]> = {
  gym: ['overview', 'analytics', 'members', 'plans', 'photos', 'practitioners', 'bookings', 'reviews'],
  salon: ['overview', 'bookings', 'services', 'practitioners', 'photos', 'customers', 'reviews', 'analytics'],
  clinic: ['overview', 'bookings', 'services', 'practitioners', 'departments', 'customers', 'reviews', 'analytics'],
  hospital: ['overview', 'bookings', 'services', 'practitioners', 'departments', 'customers', 'reviews', 'analytics'],
  other: ['overview', 'bookings', 'services', 'practitioners', 'photos', 'customers', 'reviews', 'analytics'],
};

// Per-section wording of the generic items (e.g. "Appointments" for clinics, "Gallery" for salons).
const LABEL_OVERRIDES: Partial<Record<PresetType, Partial<Record<MenuKey, string>>>> = {
  gym: { practitioners: 'dashboard.menu.trainers' },
  salon: { photos: 'dashboard.menu.gallery', customers: 'dashboard.menu.clients', practitioners: 'dashboard.menu.specialists' },
  clinic: { bookings: 'dashboard.menu.appointments', customers: 'dashboard.menu.patients', practitioners: 'dashboard.menu.doctors' },
  hospital: { bookings: 'dashboard.menu.appointments', customers: 'dashboard.menu.patients', practitioners: 'dashboard.menu.doctors' },
};

export function menuFor(preset: PresetType): MenuItem[] {
  return ORDER[preset].map((key) => ({ key, ...ITEMS[key], label: LABEL_OVERRIDES[preset]?.[key] ?? ITEMS[key].label }));
}
