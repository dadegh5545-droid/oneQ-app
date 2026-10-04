import { useCurrentFacility } from '@/features/dashboard/FacilityDashboard';
import { AppointmentOverviewScreen } from '@/features/dashboard/screens/AppointmentScreens';
import { OverviewScreen } from '@/features/dashboard/screens/OverviewScreen';

export default function Route() {
  const { section } = useCurrentFacility();
  return section && section.presetType !== 'gym' ? <AppointmentOverviewScreen /> : <OverviewScreen />;
}
