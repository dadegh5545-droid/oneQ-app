import type { Booking } from '@/domain/models';

export type CalendarResult = 'added' | 'exists' | 'denied' | 'unavailable';

// Calendar access is native only (expo-calendar has no web implementation).
export const addBookingToCalendar = async (_booking: Booking): Promise<CalendarResult> => 'unavailable';
