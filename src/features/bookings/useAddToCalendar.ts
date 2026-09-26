import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/Toast';
import type { Booking } from '@/domain/models';
import { addBookingToCalendar } from '@/services/calendar';
import { reportError } from '@/services/monitoring';

// "Add to Calendar" on Success (S15) and Booking Details (S17). Calendar permission is requested on tap.
export function useAddToCalendar() {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const add = async (booking: Booking) => {
    if (busy) return;
    setBusy(true);
    try {
      toast(t(`calendar.${await addBookingToCalendar(booking)}`));
    } catch (e) {
      reportError(e, { area: 'calendar' });
      toast(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return { add, busy };
}
