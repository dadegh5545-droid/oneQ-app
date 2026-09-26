import type {
  Account,
  Booking,
  BookingDraft,
  Gym,
  MembershipPlan,
  PaymentMethod,
  Review,
  Specialty,
  TimeSlot,
  Trainer,
} from '@/domain/models';

export type AvailabilityDay = { date: string; closed: boolean; slots: TimeSlot[] };

// Error codes mirror 11-API-AND-BACKEND-REQUIREMENTS §2; UI maps them to `errors.*` strings.
export type RepositoryErrorCode =
  | 'INVALID_BOOKING'
  | 'SLOT_TAKEN'
  | 'DUPLICATE_BOOKING'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_EXISTS'
  | 'ACCOUNT_NOT_FOUND'
  | 'INVALID_CODE';

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  constructor(code: RepositoryErrorCode) {
    super(code);
    this.code = code;
  }
}

export type SignUpInput = Account & { password: string };

// Screens depend only on this interface; Phase 4 adds an Amplify implementation.
export interface Repository {
  listGyms(): Promise<Gym[]>;
  getGym(id: string): Promise<Gym | null>;
  getPlans(gymId: string): Promise<MembershipPlan[]>;
  listTrainers(gymId: string, specialty?: Specialty | null): Promise<Trainer[]>;
  getTrainer(id: string): Promise<Trainer | null>;
  listReviews(by: { gymId: string } | { trainerId: string }): Promise<Review[]>;
  getAvailability(trainerId: string, from: Date, days: number): Promise<AvailabilityDay[]>;

  // Validates the draft (slot still free, no duplicate) and returns the server-side price.
  quoteBooking(draft: BookingDraft): Promise<{ priceQar: number }>;
  createBooking(draft: BookingDraft, payment: { method: PaymentMethod; paymentId: string }): Promise<Booking>;
  listBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;

  signIn(identifier: string, password: string): Promise<Account>;
  signUp(input: SignUpInput): Promise<Account>;
  // Returns a demo code only in the mock implementation (no SMS/email yet).
  requestPasswordReset(identifier: string): Promise<{ demoCode?: string }>;
  confirmPasswordReset(identifier: string, code: string, newPassword: string): Promise<void>;
}
