import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { consoleRepository } from '@/data';
import type { AdminFacilityInput, SectionInput } from '@/domain/dashboard';

// Platform admin console queries ("dash" prefix: cleared with the session, refreshed after every write).

export const useConsoleStats = () => useQuery({ queryKey: ['dash', 'console', 'stats'], queryFn: () => consoleRepository.stats() });
export const useConsoleFacilities = () => useQuery({ queryKey: ['dash', 'console', 'facilities'], queryFn: () => consoleRepository.listFacilities() });
export const useConsoleSections = () => useQuery({ queryKey: ['dash', 'console', 'sections'], queryFn: () => consoleRepository.listSections() });
export const useSectionCategories = (slug: string | null) =>
  useQuery({ queryKey: ['dash', 'console', 'categories', slug], queryFn: () => consoleRepository.sectionCategories(slug!), enabled: !!slug });
export const useOwners = () => useQuery({ queryKey: ['dash', 'console', 'owners'], queryFn: () => consoleRepository.listOwners() });
export const useAllBookings = () => useQuery({ queryKey: ['dash', 'console', 'bookings'], queryFn: () => consoleRepository.allBookings() });
export const useAllReviews = () => useQuery({ queryKey: ['dash', 'console', 'reviews'], queryFn: () => consoleRepository.allReviews() });

function useConsoleMutation<A, R>(fn: (args: A) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dash'] }),
        queryClient.invalidateQueries({ queryKey: ['gyms'] }),
        queryClient.invalidateQueries({ queryKey: ['gym'] }),
        queryClient.invalidateQueries({ queryKey: ['sections'] }),
        queryClient.invalidateQueries({ queryKey: ['reviews'] }),
      ]),
  });
}

export const useSaveSection = () => useConsoleMutation(({ slug, input }: { slug: string | null; input: SectionInput }) => consoleRepository.saveSection(slug, input));
export const useDeleteSection = () => useConsoleMutation((slug: string) => consoleRepository.deleteSection(slug));
export const useSetFacilityStatus = () =>
  useConsoleMutation(({ id, status, reason }: { id: string; status: 'pending' | 'approved' | 'suspended'; reason: string | null }) =>
    consoleRepository.setFacilityStatus(id, status, reason),
  );
export const useAdminSaveFacility = () =>
  useConsoleMutation(({ id, input }: { id: string | null; input: AdminFacilityInput }) => consoleRepository.saveFacility(id, input));
export const useCreateOwner = () =>
  useConsoleMutation(({ fullName, email, phone }: { fullName: string; email: string; phone: string }) => consoleRepository.createOwner(fullName, email, phone));
export const useSuspendAccount = () =>
  useConsoleMutation(({ username, suspended }: { username: string; suspended: boolean }) => consoleRepository.suspendAccount(username, suspended));
export const useCancelBooking = () => useConsoleMutation(({ id, reason }: { id: string; reason: string | null }) => consoleRepository.cancelBooking(id, reason));
export const useRemoveReview = () => useConsoleMutation((id: string) => consoleRepository.removeReview(id));
