// Facility dashboard entities (FACILITY_OWNER / admin). Served by amplify/functions/facility-owner.

export type Period = '30d' | 'month' | '90d' | '12m';
export const PERIODS: Period[] = ['30d', 'month', '90d', '12m'];

export type FacilityStatus = 'pending' | 'approved' | 'suspended';
export type PresetType = 'gym' | 'hospital' | 'clinic' | 'salon' | 'other';
export type ServiceMode = 'inShop' | 'home' | 'both';

export interface FacilitySummary {
  id: string;
  name: string;
  area: string;
  address: string;
  description: string;
  sectionId: string;
  status: FacilityStatus;
  statusReason: string | null;
  ownerId: string | null;
  images: string[];
  logo: string | null;
  phone: string | null;
  whatsapp: string | null;
  storeUrl: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  serviceMode: ServiceMode | null;
  categoryIds: string[];
  rating: number;
  reviewCount: number;
}

export type SeriesPoint = { start: string; value: number };
export type CountItem = { label: string; count: number };

export type MemberStatus = 'active' | 'frozen' | 'expired' | 'cancelled';

export interface MemberRow {
  bookingId: string;
  name: string;
  phone: string;
  planName: string;
  planId: string | null;
  start: string | null;
  end: string | null;
  status: MemberStatus;
  amount: number;
}

export interface BookingRow {
  id: string;
  type: string; // membership | session | appointment
  status: string; // confirmed | completed | cancelled
  customerName: string;
  customerPhone: string | null;
  date: string | null;
  timeLabel: string | null;
  trainerId: string | null;
  trainerName: string | null;
  planName: string | null;
  serviceName: string | null;
  priceQar: number;
  createdAt: string;
  membershipStart: string | null;
  membershipEnd: string | null;
  homeService: boolean;
  trainerUnavailable: boolean;
  cancelReason: string | null;
}

export interface ReviewRow {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  date: string;
  satisfied: boolean | null;
  trainerName: string | null;
  ownerReply: string | null;
  ownerReplyAt: string | null;
}

export interface FacilityInsights {
  period: Period;
  members: number;
  activeMembers: number;
  newMembers: number;
  revenue: number;
  trainerBookings: number;
  planDistribution: CountItem[];
  popularPlan: string | null;
  membersSeries: SeriesPoint[];
  revenueSeries: SeriesPoint[];
  newMembersSeries: SeriesPoint[];
  expiringSoon: MemberRow[];
  latestBookings: BookingRow[];
  latestReviews: ReviewRow[];
  ratingAverage: number;
  ratingCount: number;
  ratingDistribution: number[]; // 1★…5★
  // Appointment facilities (salons, clinics)
  appointmentsToday: number;
  upcomingAppointments: number;
  pendingRequests: number;
  customers: number;
  newCustomers: number;
  topServices: CountItem[];
  appointmentsSeries: SeriesPoint[];
  newCustomersSeries: SeriesPoint[];
}

export type WeeklyHours = { weekday: number; open: string; close: string };

export interface TrainerRow {
  id: string;
  name: string;
  title: string;
  bio: string;
  image: string;
  specialties: string[];
  skills: string[];
  yearsExperience: number;
  pricePerSession: number;
  languages: string[];
  certifications: string[];
  departmentId: string | null;
  rating: number;
  reviewCount: number;
  unavailable: boolean;
  unavailableFrom: string | null;
  unavailableUntil: string | null;
  weeklyHours: WeeklyHours[];
}

export interface PlanRow {
  id: string;
  kind: string;
  name: string;
  description: string;
  price: number;
  durationMonths: number;
  badge: string | null;
  visible: boolean;
  discountType: 'percent' | 'amount' | null;
  discountValue: number | null;
  allowFreeze: boolean;
  autoRenew: boolean;
}

export type PlanInput = Omit<PlanRow, 'id' | 'kind'> & { id: string | null };

export type TrainerInput = Pick<
  TrainerRow,
  'name' | 'title' | 'bio' | 'image' | 'specialties' | 'skills' | 'yearsExperience' | 'pricePerSession' | 'languages' | 'certifications' | 'departmentId'
> & { id: string | null };

export type FacilityInput = Partial<
  Pick<FacilitySummary, 'name' | 'description' | 'area' | 'address' | 'logo' | 'images' | 'phone' | 'whatsapp' | 'storeUrl' | 'region' | 'lat' | 'lng' | 'serviceMode' | 'categoryIds'>
>;

export type BookingAction = { bookingId: string; action: 'keep' | 'reassign'; trainerId?: string };

export interface AvailabilityInput {
  trainerId: string;
  unavailable: boolean;
  unavailableFrom: string | null;
  unavailableUntil: string | null;
  weeklyHours: WeeklyHours[];
  actions: BookingAction[];
}

export interface AppNotification {
  id: string;
  kind: string;
  params: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

// Effective price after the facility's direct discount (never a discount code).
export const discountedPrice = (p: Pick<PlanRow, 'price' | 'discountType' | 'discountValue'>) =>
  !p.discountType || !p.discountValue
    ? p.price
    : p.discountType === 'percent'
      ? Math.round(p.price * (1 - p.discountValue / 100))
      : Math.max(0, p.price - p.discountValue);

// Up to two freezes of up to 30 days each per membership, when the plan allows freezing.
export const FREEZE_LIMIT = { count: 2, days: 30 } as const;

// ── Appointments (salons, clinics) ──

export interface ServiceRow {
  id: string;
  nameAr: string;
  nameEn: string | null;
  categoryId: string | null;
  priceQar: number;
  durationMinutes: number;
  homeAvailable: boolean;
  active: boolean;
  sortOrder: number;
}

export type ServiceInput = Omit<ServiceRow, 'id' | 'sortOrder'> & { id: string | null };

export interface DepartmentRow {
  id: string;
  nameAr: string;
  nameEn: string | null;
  sortOrder: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  visits: number;
  firstVisit: string | null;
  lastVisit: string | null;
  totalSpent: number;
}

export interface CategoryRow {
  id: string;
  nameAr: string;
  nameEn: string | null;
  order: number;
}

// ── Platform admin (console) ──

export interface OwnerRow {
  username: string;
  ownerKey: string;
  email: string;
  fullName: string;
  phone: string | null;
  enabled: boolean;
  createdAt: string | null;
  facilities: number;
}

export interface ConsoleStats {
  bookingsToday: number;
  pendingFacilities: number;
  activeFacilities: number;
  newCustomers: number;
}

export interface SectionInput {
  nameAr: string;
  nameEn: string | null;
  descAr: string | null;
  descEn: string | null;
  icon: string;
  colorKey: string;
  order: number;
  status: 'visible' | 'hidden';
  bookingMode: 'appointment' | 'subscription' | 'both';
  hasPractitioners: boolean;
  hasServices: boolean;
  hasDepartments: boolean;
  hasPackages: boolean;
  hasGallery: boolean;
  practitionerLabelAr: string | null;
  practitionerLabelEn: string | null;
  presetType: PresetType;
  categories: { id: string | null; nameAr: string; nameEn: string | null }[];
}

export interface AdminFacilityInput {
  ownerId: string;
  sectionId: string;
  name: string;
  area: string;
  address: string;
  description: string;
  phone: string | null;
  whatsapp: string | null;
  region: string | null;
  monthlyPrice: number;
  serviceMode: ServiceMode | null;
}
