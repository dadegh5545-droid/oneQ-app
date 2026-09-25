import { useLocalSearchParams } from 'expo-router';

import { InfoScreen } from '@/features/info/InfoScreen';

export default function Route() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <InfoScreen slug={slug} />;
}
