import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { Booking } from '@/domain/models';
import { sessionStart } from '@/domain/rules';
import i18n from '@/i18n';
import { localizeTime } from '@/utils/format';

import { reportError } from './monitoring';

// Booking notifications, scheduled on the device. Payloads carry only a kind, the booking id and a scope —
// never names, phone numbers, prices or tokens. Server-sent push (bookings changed elsewhere, marketing)
// plugs in behind these same functions once FCM/APNs credentials exist (docs/PRODUCTION-READINESS.md).

type Scope = 'account' | 'guest';
type Payload = { kind: 'confirmation' | 'reminder'; bookingId: string; scope: Scope };

const CHANNEL = 'bookings';
const ASKED_KEY = 'oneq.notificationsAsked';
// Session reminders; only those still in the future are scheduled.
const REMINDERS = [
  { id: '24h', minutes: 24 * 60, body: 'notifications.reminderTomorrow' },
  { id: '1h', minutes: 60, body: 'notifications.reminderSoon' },
] as const;

const payloadOf = (request: Notifications.NotificationRequest) => request.content.data as Partial<Payload> | undefined;

Notifications.setNotificationHandler({
  // The confirmation goes to the notification list only: the user is already looking at the Success screen.
  handleNotification: async (notification) => ({
    shouldShowBanner: payloadOf(notification.request)?.kind !== 'confirmation',
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Asked once, right after the first booking — never at launch, and never again after a refusal.
async function ensurePermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: i18n.t('notifications.channel'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain || (await AsyncStorage.getItem(ASKED_KEY))) return false;
  await AsyncStorage.setItem(ASKED_KEY, '1');
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function scheduleReminders(booking: Booking, scope: Scope) {
  if (booking.type !== 'session' || !booking.date || booking.status !== 'confirmed') return;
  const start = sessionStart(booking.date).getTime();
  const time = booking.timeLabel ? localizeTime(booking.timeLabel) : '';
  for (const reminder of REMINDERS) {
    const at = start - reminder.minutes * 60_000;
    if (at <= Date.now() + 60_000) continue;
    const data: Payload = { kind: 'reminder', bookingId: booking.id, scope };
    await Notifications.scheduleNotificationAsync({
      identifier: `reminder-${booking.id}-${reminder.id}`,
      content: { title: i18n.t('notifications.reminderTitle'), body: i18n.t(reminder.body, { gym: booking.gymName, time }), data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: CHANNEL },
    });
  }
}

export async function notifyBookingConfirmed(booking: Booking, scope: Scope) {
  try {
    if (!(await ensurePermission())) return;
    const data: Payload = { kind: 'confirmation', bookingId: booking.id, scope };
    const body = booking.type === 'session' ? 'notifications.confirmedSession' : 'notifications.confirmedMembership';
    await Notifications.scheduleNotificationAsync({
      identifier: `confirmation-${booking.id}`,
      content: { title: i18n.t('notifications.confirmedTitle'), body: i18n.t(body, { gym: booking.gymName }), data },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
    await scheduleReminders(booking, scope);
  } catch (e) {
    reportError(e, { area: 'notifications' });
  }
}

async function cancelWhere(match: (payload: Partial<Payload>) => boolean) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const stale = scheduled.filter((request) => match(payloadOf(request) ?? {}));
  await Promise.all(stale.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
}

// Drops reminders for bookings that are no longer confirmed (e.g. cancelled by OneQ).
export async function syncBookingReminders(bookings: Booking[]) {
  try {
    const inactive = new Set(bookings.filter((b) => b.status !== 'confirmed').map((b) => b.id));
    if (inactive.size > 0) await cancelWhere((p) => !!p.bookingId && inactive.has(p.bookingId));
  } catch (e) {
    reportError(e, { area: 'notifications' });
  }
}

// On sign-out: the next person using this device must not get this account's reminders.
export async function clearAccountReminders() {
  try {
    await cancelWhere((p) => p.scope === 'account');
  } catch (e) {
    reportError(e, { area: 'notifications' });
  }
}

// Tapping a booking notification opens its details (also when the app was closed).
export function useNotificationNavigation() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const bookingId = response ? payloadOf(response.notification.request)?.bookingId : undefined;
    if (bookingId && response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      router.push({ pathname: '/bookings/[id]', params: { id: bookingId } });
    }
  }, [response]);
}
