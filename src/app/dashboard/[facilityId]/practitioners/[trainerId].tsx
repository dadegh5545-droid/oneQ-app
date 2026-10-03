import { useLocalSearchParams } from 'expo-router';

import { PractitionerDetailScreen } from '@/features/dashboard/screens/PractitionerDetailScreen';

export default function Route() {
  const { trainerId } = useLocalSearchParams<{ trainerId: string }>();
  return <PractitionerDetailScreen trainerId={trainerId} />;
}
