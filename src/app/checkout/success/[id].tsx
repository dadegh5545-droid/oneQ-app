import { useLocalSearchParams } from 'expo-router';

import { SuccessScreen } from '@/features/checkout/SuccessScreen';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SuccessScreen id={id} />;
}
