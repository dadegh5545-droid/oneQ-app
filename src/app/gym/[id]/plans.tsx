import { useLocalSearchParams } from 'expo-router';

import { PlansScreen } from '@/features/gyms/PlansScreen';

export default function Route() {
  const { id, planId } = useLocalSearchParams<{ id: string; planId?: string }>();
  return <PlansScreen gymId={id} planId={planId} />;
}
