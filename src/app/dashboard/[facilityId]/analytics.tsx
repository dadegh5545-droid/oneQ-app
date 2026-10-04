import { useCurrentFacility } from '@/features/dashboard/FacilityDashboard';
import { AnalyticsScreen } from '@/features/dashboard/screens/AnalyticsScreen';
import { AppointmentAnalyticsScreen } from '@/features/dashboard/screens/AppointmentScreens';

export default function Route() {
  const { section } = useCurrentFacility();
  return section && section.presetType !== 'gym' ? <AppointmentAnalyticsScreen /> : <AnalyticsScreen />;
}
