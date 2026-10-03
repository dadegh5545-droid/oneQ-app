// Trainer availability from AvailabilityRule records (managed by admins). This is the single source used both
// for the `trainerAvailability` query and for validating bookings.
//
// Rules are keyed by trainerId ("*" = every trainer) and key ("weekday:0".."weekday:6", 0 = Sunday, or
// "date:yyyy-MM-dd"). For a trainer and a day the most specific rule wins:
//   trainer date override → all-trainers date override → trainer weekday → all-trainers weekday → closed.

export type AvailabilityRuleData = { trainerId: string; key: string; closed: boolean; slots: (number | null)[] };
export type DaySchedule = { closed: boolean; slots: number[] };

const isSlotMinute = (m: number | null): m is number => Number.isInteger(m) && m! >= 0 && m! < 1440;

export type TrainerAvailabilityData = {
  unavailable: boolean;
  unavailableFrom?: string | null;
  unavailableUntil?: string | null;
  weeklyHours?: ({ weekday: number; open: string; close: string } | null)[] | null;
};

const minutesOf = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

// The facility's own settings for a trainer (TrainerAvailability), applied on top of the rules: a blocked trainer
// (open-ended or for a period) has no slots; when weekly hours are set, a weekday without hours is closed and
// only start times inside the hours stay.
export function applyTrainerAvailability(day: DaySchedule, a: TrainerAvailabilityData | null, date: string, weekday: number): DaySchedule {
  if (!a || day.closed) return day;
  const blocked = a.unavailable && (!a.unavailableFrom || a.unavailableFrom <= date) && (!a.unavailableUntil || date <= a.unavailableUntil);
  if (blocked) return { closed: true, slots: [] };
  const weekly = (a.weeklyHours ?? []).filter((h): h is NonNullable<typeof h> => !!h);
  if (weekly.length === 0) return day;
  const hours = weekly.filter((h) => h.weekday === weekday);
  const slots = day.slots.filter((m) => hours.some((h) => m >= minutesOf(h.open) && m < minutesOf(h.close)));
  return slots.length > 0 ? { closed: false, slots } : { closed: true, slots: [] };
}

export function resolveDay(rules: AvailabilityRuleData[], trainerId: string, date: string, weekday: number): DaySchedule {
  const find = (owner: string, key: string) => rules.find((r) => r.trainerId === owner && r.key === key);
  const rule =
    find(trainerId, `date:${date}`) ?? find('*', `date:${date}`) ?? find(trainerId, `weekday:${weekday}`) ?? find('*', `weekday:${weekday}`);
  if (!rule || rule.closed) return { closed: true, slots: [] };
  return { closed: false, slots: [...new Set(rule.slots.filter(isSlotMinute))].sort((a, b) => a - b) };
}
