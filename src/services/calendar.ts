import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { Booking } from '@/domain/models';
import { SESSION_MINUTES, sessionStart } from '@/domain/rules';
import i18n from '@/i18n';

export type CalendarResult = 'added' | 'exists' | 'denied' | 'unavailable';

type CalendarModule = typeof import('expo-calendar');

// bookingId → calendar event id, so tapping again does not create a duplicate.
const EVENTS_KEY = 'oneq.calendarEvents';

// Loaded on first use: a build without the native module reports "unavailable" instead of crashing.
function calendarModule(): CalendarModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-calendar') as CalendarModule;
  } catch {
    return null;
  }
}

async function storedEvents(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(EVENTS_KEY);
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
}

// Title, place and time only — no guest name, phone or payment details.
function eventDetails(b: Booking) {
  const trainer = b.trainerName ? i18n.t('calendar.notesTrainer', { name: b.trainerName }) : null;
  const notes = [trainer, i18n.t('calendar.notesBooked')].filter(Boolean).join('\n');
  const location = `${b.gymName}, ${b.gymLocation}`;
  if (b.type === 'session' && b.date) {
    const start = sessionStart(b.date);
    const end = new Date(start.getTime() + SESSION_MINUTES * 60_000);
    return { title: i18n.t('calendar.sessionTitle', { gym: b.gymName }), startDate: start, endDate: end, location, notes, timeZone: 'Asia/Qatar' };
  }
  // Memberships: an all-day event on the first day.
  const first = new Date(`${b.membershipStart ?? b.createdAt.slice(0, 10)}T00:00:00`);
  return { title: i18n.t('calendar.membershipTitle', { gym: b.gymName }), startDate: first, endDate: new Date(first.getTime() + 86_400_000), allDay: true, location, notes };
}

async function androidCalendar(Calendar: CalendarModule) {
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((c) => c.allowsModifications && c.isVisible !== false);
  return writable.find((c) => c.isPrimary) ?? writable[0] ?? null;
}

// Permission is requested here, i.e. only when the user taps "Add to Calendar". iOS asks for write-only access.
export async function addBookingToCalendar(booking: Booking): Promise<CalendarResult> {
  const Calendar = calendarModule();
  if (!Calendar) return 'unavailable';
  const writeOnly = Platform.OS === 'ios';
  const { granted } = await Calendar.requestCalendarPermissions(writeOnly);
  if (!granted) return 'denied';

  const events = await storedEvents();
  const previous = events[booking.id];
  if (previous) {
    // Write-only access cannot read events back; on Android an event the user deleted is added again.
    if (writeOnly) return 'exists';
    const stillThere = await Calendar.ExpoCalendarEvent.get(previous).then(
      () => true,
      () => false,
    );
    if (stillThere) return 'exists';
  }

  const calendar = writeOnly ? Calendar.getDefaultCalendarSync() : await androidCalendar(Calendar);
  if (!calendar) return 'unavailable';
  const event = await calendar.createEvent(eventDetails(booking));
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify({ ...events, [booking.id]: event.id }));
  return 'added';
}
