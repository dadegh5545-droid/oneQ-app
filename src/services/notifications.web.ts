import type { Booking } from '@/domain/models';

// expo-notifications does not support the web; booking notifications are native only.
export const notifyBookingConfirmed = async (_booking: Booking, _scope: 'account' | 'guest') => undefined;
export const syncBookingReminders = async (_bookings: Booking[]) => undefined;
export const clearAccountReminders = async () => undefined;
export const useNotificationNavigation = () => undefined;
