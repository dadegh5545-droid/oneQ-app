import { useLocalSearchParams } from 'expo-router';

import { SignUpScreen } from '@/features/auth/SignUpScreen';

export default function Route() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  return <SignUpScreen next={next} />;
}
