import type { Booking, Gym, MembershipPlan, Review, Specialty, TimeSlot, Trainer } from '@/domain/models';

export type AvailabilityDay = { date: string; closed: boolean; slots: TimeSlot[] };

// Screens depend only on this interface; Phase 4 adds an Amplify implementation.
export interface Repository {
  listGyms(): Promise<Gym[]>;
  getGym(id: string): Promise<Gym | null>;
  getPlans(gymId: string): Promise<MembershipPlan[]>;
  listTrainers(gymId: string, specialty?: Specialty | null): Promise<Trainer[]>;
  getTrainer(id: string): Promise<Trainer | null>;
  listReviews(by: { gymId: string } | { trainerId: string }): Promise<Review[]>;
  getAvailability(trainerId: string, from: Date, days: number): Promise<AvailabilityDay[]>;
  listBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
}
