import { useLocalSearchParams } from 'expo-router';

import { TrainersScreen } from '@/features/gyms/TrainersScreen';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TrainersScreen gymId={id} />;
}
