import { useLocalSearchParams } from 'expo-router';

import { ReviewFormScreen } from '@/features/reviews/ReviewFormScreen';

export default function Route() {
  const { type, id, name } = useLocalSearchParams<{ type: string; id: string; name?: string }>();
  return <ReviewFormScreen target={{ type: type === 'trainer' ? 'trainer' : 'gym', id }} name={name ?? ''} />;
}
