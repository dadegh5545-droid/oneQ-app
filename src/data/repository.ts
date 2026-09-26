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
  | 'SLOT_UNAVAILABLE'
  | 'DUPLICATE_BOOKING'
  | 'PAYMENT_FAILED'
  | 'VALIDATION'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_PASSWORD'
  | 'ACCOUNT_EXISTS'
  | 'ACCOUNT_NOT_FOUND'
  | 'INVALID_CODE'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED';

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  constructor(code: RepositoryErrorCode, options?: { cause?: unknown }) {
    super(code, options);
    this.code = code;
  }
}

export type SignUpInput = Account & { password: string };

// `confirm`: the account exists but its email is not confirmed yet; a code was sent to `destination`.
export type AuthResult = { status: 'signedIn'; account: Account } | { status: 'confirm'; username: string; destination: string | null };

// Screens depend only on this interface; the implementation is AWS Amplify (src/data/amplify).
export interface Repository {
  listGyms(): Promise<Gym[]>;
  getGym(id: string): Promise<Gym | null>;
  getPlans(gymId: string): Promise<MembershipPlan[]>;
  listTrainers(gymId: string, specialty?: Specialty | null): Promise<Trainer[]>;
  getTrainer(id: string): Promise<Trainer | null>;
  listReviews(by: { gymId: string } | { trainerId: string }): Promise<Review[]>;
  // The next 14 days (Asia/Qatar), computed by the server.
  getAvailability(trainerId: string): Promise<AvailabilityDay[]>;

  // Validates the draft (slot still free, no duplicate) and returns the server-side price.
  quoteBooking(draft: BookingDraft): Promise<{ priceQar: number }>;
  createBooking(draft: BookingDraft, payment: { method: PaymentMethod; paymentId: string }): Promise<Booking>;
  // Signed in: the account's bookings. Signed out: guest bookings made on this device.
  listBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;

  listFavorites(): Promise<string[]>;
  addFavorite(gymId: string): Promise<void>;
  removeFavorite(gymId: string): Promise<void>;

  // Restores the stored session without a network round trip when the tokens are still valid.
  currentAccount(): Promise<Account | null>;
  // Profile details from UserProfile (created on first sign-in), falling back to the Cognito attributes.
  getProfile(): Promise<Account>;
  signIn(identifier: string, password: string): Promise<AuthResult>;
  signUp(input: SignUpInput): Promise<AuthResult>;
  // Returns the account when the sign-up can finish signing in automatically, otherwise null.
  confirmSignUp(username: string, code: string): Promise<Account | null>;
  resendSignUpCode(username: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(identifier: string): Promise<void>;
  confirmPasswordReset(identifier: string, code: string, newPassword: string): Promise<void>;
}

// Management operations. The backend enforces the Cognito `admin` group for every one of them.
export type GymInput = Omit<Gym, 'id' | 'rating' | 'reviewCount' | 'openingHours'>;
export type TrainerInput = Omit<Trainer, 'id' | 'rating' | 'reviewCount'>;

export interface AdminRepository {
  // `id` null creates a new record (id derived from the name) and returns its id.
  saveGym(id: string | null, input: GymInput): Promise<string>;
  savePlan(plan: MembershipPlan & { gymId: string }): Promise<void>;
  saveTrainer(id: string | null, input: TrainerInput): Promise<string>;
  listAllBookings(): Promise<Booking[]>;
  cancelBooking(id: string): Promise<Booking>;
}
