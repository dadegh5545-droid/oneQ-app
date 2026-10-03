import { useLocalSearchParams } from 'expo-router';

import { FacilityDashboardLayout } from '@/features/dashboard/FacilityDashboard';

export default function Layout() {
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  return <FacilityDashboardLayout facilityId={facilityId} />;
}
