import AsyncStorage from '@react-native-async-storage/async-storage';
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

type NotificationsModule = typeof import('expo-notifications');
type Scope = 'account' | 'guest';
type Payload = { kind: 'confirmation' | 'reminder'; bookingId: string; scope: Scope };

const CHANNEL = 'bookings';
const ASKED_KEY = 'oneq.notificationsAsked';
// Session reminders; only those still in the future are scheduled.
const REMINDERS = [
  { id: '24h', minutes: 24 * 60, body: 'notifications.reminderTomorrow' },
  { id: '1h', minutes: 60, body: 'notifications.reminderSoon' },
] as const;

// Loaded lazily and defensively: a build without the native module (e.g. an older development build) must
// not crash at start-up — notifications are then simply unavailable.
let loaded: NotificationsModule | null | undefined;
function notifications(): NotificationsModule | null {
  if (loaded === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('expo-notifications') as NotificationsModule;
      loaded.setNotificationHandler({
        // The confirmation goes to the notification list only: the user is already on the Success screen.
        handleNotification: async (notification) => ({
          shouldShowBanner: payloadOf(notification.request)?.kind !== 'confirmation',
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    } catch (e) {
      loaded = null;
      reportError(e, { area: 'notifications-unavailable' });
    }
  }
  return loaded;
}

const payloadOf = (request: { content: { data?: unknown } }) => request.content.data as Partial<Payload> | undefined;

// Asked once, right after the first booking — never at launch, and never again after a refusal.
async function ensurePermission(n: NotificationsModule) {
  if (Platform.OS === 'android') {
    await n.setNotificationChannelAsync(CHANNEL, { name: i18n.t('notifications.channel'), importance: n.AndroidImportance.DEFAULT });
  }
  const current = await n.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain || (await AsyncStorage.getItem(ASKED_KEY))) return false;
  await AsyncStorage.setItem(ASKED_KEY, '1');
  return (await n.requestPermissionsAsync()).granted;
}

async function scheduleReminders(n: NotificationsModule, booking: Booking, scope: Scope) {
  if (booking.type !== 'session' || !booking.date || booking.status !== 'confirmed') return;
  const start = sessionStart(booking.date).getTime();
  const time = booking.timeLabel ? localizeTime(booking.timeLabel) : '';
  for (const reminder of REMINDERS) {
    const at = start - reminder.minutes * 60_000;
    if (at <= Date.now() + 60_000) continue;
    const data: Payload = { kind: 'reminder', bookingId: booking.id, scope };
    await n.scheduleNotificationAsync({
      identifier: `reminder-${booking.id}-${reminder.id}`,
      content: { title: i18n.t('notifications.reminderTitle'), body: i18n.t(reminder.body, { gym: booking.gymName, time }), data },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: CHANNEL },
    });
  }
}

export async function notifyBookingConfirmed(booking: Booking, scope: Scope) {
  const n = notifications();
  if (!n) return;
  try {
    if (!(await ensurePermission(n))) return;
    const data: Payload = { kind: 'confirmation', bookingId: booking.id, scope };
    const body = booking.type === 'session' ? 'notifications.confirmedSession' : 'notifications.confirmedMembership';
    await n.scheduleNotificationAsync({
      identifier: `confirmation-${booking.id}`,
      content: { title: i18n.t('notifications.confirmedTitle'), body: i18n.t(body, { gym: booking.gymName }), data },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
    });
    await scheduleReminders(n, booking, scope);
  } catch (e) {
    reportError(e, { area: 'notifications' });
  }
}

async function cancelWhere(n: NotificationsModule, match: (payload: Partial<Payload>) => boolean) {
  const scheduled = await n.getAllScheduledNotificationsAsync();
  const stale = scheduled.filter((request) => match(payloadOf(request) ?? {}));
  await Promise.all(stale.map((request) => n.cancelScheduledNotificationAsync(request.identifier)));
}

// Drops reminders for bookings that are no longer confirmed (e.g. cancelled by OneQ).
export async function syncBookingReminders(bookings: Booking[]) {
  const n = notifications();
  if (!n) return;
  try {
    const inactive = new Set(bookings.filter((b) => b.status !== 'confirmed').map((b) => b.id));
    if (inactive.size > 0) await cancelWhere(n, (p) => !!p.bookingId && inactive.has(p.bookingId));
  } catch (e) {
    reportError(e, { area: 'notifications' });
  }
}

// On sign-out: the next person using this device must not get this account's reminders.
export async function clearAccountReminders() {
  const n = notifications();
  if (!n) return;
  try {
    await cancelWhere(n, (p) => p.scope === 'account');
  } catch (e) {
    reportError(e, { area: 'notifications' });
  }
}

// Tapping a booking notification opens its details — while running and when it launched the app.
export function useNotificationNavigation() {
  useEffect(() => {
    const n = notifications();
    if (!n) return undefined;
    const open = (response: { actionIdentifier: string; notification: { request: { content: { data?: unknown } } } } | null) => {
      const bookingId = response ? payloadOf(response.notification.request)?.bookingId : undefined;
      if (bookingId && response?.actionIdentifier === n.DEFAULT_ACTION_IDENTIFIER) {
        router.push({ pathname: '/bookings/[id]', params: { id: bookingId } });
      }
    };
    n.getLastNotificationResponseAsync().then(open, () => undefined);
    const subscription = n.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}
