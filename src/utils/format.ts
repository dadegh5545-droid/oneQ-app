import { format } from 'date-fns';
import { ar, enGB } from 'date-fns/locale';

import i18n, { currentLanguage } from '@/i18n';

const isAr = () => currentLanguage() === 'ar';

const number = (n: number) => new Intl.NumberFormat('en').format(n);

// "QAR 1,399" / "1,399 ر.ق" (10-MOBILE-APP-REQUIREMENTS §6)
export const qar = (n: number) => (isAr() ? `${number(n)} ر.ق` : `QAR ${number(n)}`);

export const perMonthLabel = (n: number) => i18n.t('common.perMonth', { price: qar(n) });
export const perSessionLabel = (n: number) => i18n.t('common.perSession', { price: qar(n) });

export const formatDate = (d: Date | string, pattern: string) =>
  format(typeof d === 'string' ? new Date(d) : d, pattern, { locale: isAr() ? ar : enGB });

// Short date "d MMM y", long date "d MMMM y"
export const shortDate = (d: Date | string) => formatDate(d, 'd MMM y');
export const longDate = (d: Date | string) => formatDate(d, 'd MMMM y');

// Time labels stay in Latin digits; only the AM/PM marker is localized.
export const localizeTime = (label: string) => (isAr() ? label.replace('AM', 'ص').replace('PM', 'م') : label);

export const rating = (n: number) => n.toFixed(1);
