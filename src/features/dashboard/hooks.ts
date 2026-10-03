import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardRepository } from '@/data';
import type { AvailabilityInput, FacilityInput, Period, PlanInput, TrainerInput } from '@/domain/dashboard';

// React Query hooks of the facility dashboards. Keys start with "dash" so they are cleared with the session.

export const useMyFacilities = () => useQuery({ queryKey: ['dash', 'facilities'], queryFn: () => dashboardRepository.listFacilities() });

export const useDashFacility = (id: string) =>
  useQuery({ queryKey: ['dash', 'facility', id], queryFn: () => dashboardRepository.getFacility(id), enabled: !!id });

export const useDashSections = () => useQuery({ queryKey: ['dash', 'sections'], queryFn: () => dashboardRepository.listSections() });

export const useInsights = (facilityId: string, period: Period) =>
  useQuery({ queryKey: ['dash', 'insights', facilityId, period], queryFn: () => dashboardRepository.insights(facilityId, period) });

export const useMembers = (facilityId: string) => useQuery({ queryKey: ['dash', 'members', facilityId], queryFn: () => dashboardRepository.members(facilityId) });

export const useFacilityBookings = (facilityId: string, from?: string, to?: string) =>
  useQuery({ queryKey: ['dash', 'bookings', facilityId, from, to], queryFn: () => dashboardRepository.bookings(facilityId, from, to) });

export const useFacilityReviews = (facilityId: string) =>
  useQuery({ queryKey: ['dash', 'reviews', facilityId], queryFn: () => dashboardRepository.reviews(facilityId) });

export const useFacilityTrainers = (facilityId: string) =>
  useQuery({ queryKey: ['dash', 'trainers', facilityId], queryFn: () => dashboardRepository.trainers(facilityId) });

export const useTrainerSchedule = (trainerId: string, from?: string, to?: string) =>
  useQuery({ queryKey: ['dash', 'schedule', trainerId, from, to], queryFn: () => dashboardRepository.trainerSchedule(trainerId, from, to), enabled: !!trainerId });

export const useFacilityPlans = (facilityId: string) => useQuery({ queryKey: ['dash', 'plans', facilityId], queryFn: () => dashboardRepository.plans(facilityId) });

export const useNotifications = () => useQuery({ queryKey: ['dash', 'notifications'], queryFn: () => dashboardRepository.notifications() });

// Writes refresh every dashboard query (counts, lists and the customer catalogue may all change).
function useDashMutation<A, R>(fn: (args: A) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dash'] }),
        queryClient.invalidateQueries({ queryKey: ['gyms'] }),
        queryClient.invalidateQueries({ queryKey: ['gym'] }),
        queryClient.invalidateQueries({ queryKey: ['plans'] }),
        queryClient.invalidateQueries({ queryKey: ['trainers'] }),
      ]),
  });
}

export const useSavePlan = (facilityId: string) => useDashMutation((plan: PlanInput) => dashboardRepository.savePlan(facilityId, plan));
export const useSaveFacility = (facilityId: string) => useDashMutation((input: FacilityInput) => dashboardRepository.saveFacility(facilityId, input));
export const useSaveTrainer = (facilityId: string) => useDashMutation((input: TrainerInput) => dashboardRepository.saveTrainer(facilityId, input));
export const useSetAvailability = () => useDashMutation((input: AvailabilityInput) => dashboardRepository.setTrainerAvailability(input));
export const useReplyReview = () => useDashMutation(({ reviewId, reply }: { reviewId: string; reply: string }) => dashboardRepository.replyReview(reviewId, reply));
export const useMarkNotificationRead = () => useDashMutation((id: string) => dashboardRepository.markNotificationRead(id));
