import { useLocalSearchParams } from 'expo-router';

import { GymDetailScreen } from '@/features/gyms/GymDetailScreen';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GymDetailScreen id={id} />;
}
