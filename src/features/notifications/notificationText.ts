import type { TFunction } from 'i18next';

import type { AppNotification } from '@/domain/dashboard';
import { formatDate } from '@/utils/format';

// In-app notification copy (notifications are stored as a kind + parameters, so they read in either language).
export function notificationText(t: TFunction, n: AppNotification) {
  const p = n.params;
  const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : '');
  const when = str('date') ? formatDate(`${str('date').slice(0, 10)}T00:00:00`, 'd MMM') : '';
  switch (n.kind) {
    case 'facilityStatus':
      return t('notifications.facilityStatus', { name: str('facilityName'), status: t(`dashboard.facilityStatus.${str('status') || 'pending'}`) }) + (str('reason') ? ` — ${str('reason')}` : '');
    case 'trainerUnavailable':
      return t('notifications.trainerUnavailable', { trainer: str('trainerName'), gym: str('gymName'), date: when });
    case 'trainerReassigned':
      return t('notifications.trainerReassigned', { trainer: str('trainerName'), gym: str('gymName'), date: when });
    case 'trainerBlocked':
      return t('notifications.trainerBlocked', { trainer: str('trainerName'), count: Number(p.bookings ?? 0) });
    case 'bookingCancelled':
      return t('notifications.bookingCancelled', { gym: str('gymName') }) + (str('reason') ? ` — ${str('reason')}` : '');
    case 'freezeLimit':
      return t('notifications.freezeLimit', { name: str('customerName'), plan: str('planName') });
    default:
      return t('notifications.generic');
  }
}
