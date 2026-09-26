import { useLocalSearchParams } from 'expo-router';

import { SignInScreen } from '@/features/auth/SignInScreen';

export default function Route() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  return <SignInScreen next={next} />;
}
