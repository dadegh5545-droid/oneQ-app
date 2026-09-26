import { useLocalSearchParams } from 'expo-router';

import { SignUpScreen } from '@/features/auth/SignUpScreen';

export default function Route() {
  // `confirm`: an unconfirmed account sent here from Sign In to enter its email code.
  const { next, confirm, destination } = useLocalSearchParams<{ next?: string; confirm?: string; destination?: string }>();
  return <SignUpScreen next={next} confirm={confirm} destination={destination} />;
}
