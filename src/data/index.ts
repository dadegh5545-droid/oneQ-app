import { QueryClient, useQuery } from '@tanstack/react-query';

import type { Specialty } from '@/domain/models';

import { amplifyRepository } from './amplify/amplifyRepository';
import { RepositoryError, type Repository } from './repository';

export const repository: Repository = amplifyRepository;

// Only transient failures are retried; validation, auth and not-found errors are final.
const retryable = (e: unknown) => !(e instanceof RepositoryError) || e.code === 'NETWORK';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (failures, e) => failures < 2 && retryable(e) } },
});

export const useGyms = () => useQuery({ queryKey: ['gyms'], queryFn: () => repository.listGyms() });

export const useGym = (id: string) => useQuery({ queryKey: ['gym', id], queryFn: () => repository.getGym(id) });

export const usePlans = (gymId: string) => useQuery({ queryKey: ['plans', gymId], queryFn: () => repository.getPlans(gymId) });

export const useTrainers = (gymId: string, specialty: Specialty | null) =>
  useQuery({ queryKey: ['trainers', gymId, specialty], queryFn: () => repository.listTrainers(gymId, specialty) });

export const useTrainer = (id: string) => useQuery({ queryKey: ['trainer', id], queryFn: () => repository.getTrainer(id) });

export const useGymReviews = (gymId: string) =>
  useQuery({ queryKey: ['reviews', 'gym', gymId], queryFn: () => repository.listReviews({ gymId }) });

export const useTrainerReviews = (trainerId: string) =>
  useQuery({ queryKey: ['reviews', 'trainer', trainerId], queryFn: () => repository.listReviews({ trainerId }) });

export const useAvailability = (trainerId: string) =>
  useQuery({ queryKey: ['availability', trainerId], queryFn: () => repository.getAvailability(trainerId) });

// Bookings belong to the current user (or this device's guest), so they are cleared on every auth change.
export const useBookings = () => useQuery({ queryKey: ['bookings'], queryFn: () => repository.listBookings() });

export const useBooking = (id: string) => useQuery({ queryKey: ['booking', id], queryFn: () => repository.getBooking(id) });
