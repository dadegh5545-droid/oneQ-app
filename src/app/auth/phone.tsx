import { useLocalSearchParams } from 'expo-router';

import { PhoneSignInScreen } from '@/features/auth/PhoneSignInScreen';

export default function Route() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  return <PhoneSignInScreen next={next} />;
}
