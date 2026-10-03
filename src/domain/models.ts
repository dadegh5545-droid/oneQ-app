// Entities from docs/oneq-mobile-spec/09-DATA-MODELS.md §1

export type AmenityKey = 'weights' | 'cardio' | 'pool' | 'sauna' | 'lockers' | 'parking';

export type Weekday = 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export type OpeningHours = { day: Weekday; open: string; close: string };

export interface Gym {
  id: string;
  name: string;
  area: string;
  description: string;
  rating: number;
  reviewCount: number;
  monthlyPrice: number;
  trainerFromMonthly: number;
  images: string[];
  amenities: AmenityKey[];
  address: string;
  isFeatured: boolean;
  isNearby: boolean;
  openingHours: OpeningHours[];
}

export type PlanKind = 'monthly' | '3m' | '6m';

export interface MembershipPlan {
  id: string;
  kind: PlanKind;
  name: string;
  price: number;
  description: string;
  badge: string | null;
}

export type Specialty = 'Strength Training' | 'Weight Loss' | 'Mobility' | 'Functional Training';

export interface Trainer {
  id: string;
  gymId: string;
  name: string;
  title: string;
  bio: string;
  image: string;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  languages: string[];
  specialties: Specialty[];
  certifications: string[];
  pricePerSession: number;
}

export interface Review {
  id: string;
  authorName: string;
  date: string;
  gymId: string | null;
  trainerId: string | null;
  rating: number;
  text: string;
}

export type ReviewTarget = { type: 'gym' | 'trainer'; id: string };

// The signed-in user's standing for a target: may they rate it (completed booking), and their review if any.
export interface ReviewStatus {
  eligible: boolean;
  review: Review | null;
}

// Trainer availability rule (admin-managed): trainerId "*" = all trainers; key "weekday:0"…"weekday:6" (0 = Sunday)
// or "date:yyyy-MM-dd"; slots = start times in minutes after midnight (Asia/Qatar).
export interface AvailabilityRule {
  trainerId: string;
  key: string;
  closed: boolean;
  slots: number[];
}

export interface TimeSlot {
  id: string;
  minutes: number;
  available: boolean;
}

export type BookingType = 'membership' | 'session';
export type BookingStatus = 'confirmed' | 'completed' | 'cancelled';
export type MembershipPath = 'membership' | 'membershipPlusTrainer';
export type PaymentMethod = 'card' | 'applePay' | 'googlePay';

export interface GuestInfo {
  fullName: string;
  phone: string;
  email: string | null;
}

export interface Booking {
  id: string;
  type: BookingType;
  gymId: string;
  gymName: string;
  gymLocation: string;
  trainerId: string | null;
  trainerName: string | null;
  planId: string | null;
  planName: string | null;
  date: string | null;
  timeLabel: string | null;
  sessionCount: number;
  priceQar: number;
  status: BookingStatus;
  guest: GuestInfo;
  createdAt: string;
  // Rebuild (11 §1): memberships get a period so they can move to Past (fixes 01 §5.8).
  membershipStart?: string | null;
  membershipEnd?: string | null;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
}

export interface Account {
  fullName: string;
  email: string;
  phone: string; // "+974 XXXX XXXX"
  isAdmin?: boolean; // Cognito `admin` group (UI only; the backend enforces access)
  isOwner?: boolean; // Cognito `FACILITY_OWNER` group (UI only; the backend enforces access)
}

export interface BookingDraft {
  gym?: Gym;
  path?: MembershipPath;
  plan?: MembershipPlan;
  trainer?: Trainer;
  date?: string; // yyyy-MM-dd
  slot?: TimeSlot;
  guest?: GuestInfo;
  paymentMethod: PaymentMethod;
}

export const gymLocation = (g: Pick<Gym, 'area'>) => `${g.area}, Doha`;
