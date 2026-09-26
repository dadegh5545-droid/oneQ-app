import { useLocalSearchParams } from 'expo-router';

import { AdminGymScreen } from '@/features/admin/AdminScreens';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AdminGymScreen id={id} />;
}
