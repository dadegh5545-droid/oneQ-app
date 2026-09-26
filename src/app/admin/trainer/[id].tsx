import { useLocalSearchParams } from 'expo-router';

import { AdminTrainerScreen } from '@/features/admin/AdminScreens';

export default function Route() {
  // id "new" creates a trainer for gymId.
  const { id, gymId } = useLocalSearchParams<{ id: string; gymId?: string }>();
  return <AdminTrainerScreen id={id} gymId={gymId} />;
}
