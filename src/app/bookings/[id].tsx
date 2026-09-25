import { useLocalSearchParams } from 'expo-router';

import { BookingDetailsScreen } from '@/features/bookings/BookingDetailsScreen';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookingDetailsScreen id={id} />;
}
