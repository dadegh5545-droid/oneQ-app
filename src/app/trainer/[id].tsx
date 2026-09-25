import { useLocalSearchParams } from 'expo-router';

import { TrainerScreen } from '@/features/trainers/TrainerScreen';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TrainerScreen id={id} />;
}
