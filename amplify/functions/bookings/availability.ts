// Trainer availability from AvailabilityRule records (managed by admins). This is the single source used both
// for the `trainerAvailability` query and for validating bookings.
//
// Rules are keyed by trainerId ("*" = every trainer) and key ("weekday:0".."weekday:6", 0 = Sunday, or
// "date:yyyy-MM-dd"). For a trainer and a day the most specific rule wins:
//   trainer date override → all-trainers date override → trainer weekday → all-trainers weekday → closed.

export type AvailabilityRuleData = { trainerId: string; key: string; closed: boolean; slots: (number | null)[] };
export type DaySchedule = { closed: boolean; slots: number[] };

const isSlotMinute = (m: number | null): m is number => Number.isInteger(m) && m! >= 0 && m! < 1440;

export function resolveDay(rules: AvailabilityRuleData[], trainerId: string, date: string, weekday: number): DaySchedule {
  const find = (owner: string, key: string) => rules.find((r) => r.trainerId === owner && r.key === key);
  const rule =
    find(trainerId, `date:${date}`) ?? find('*', `date:${date}`) ?? find(trainerId, `weekday:${weekday}`) ?? find('*', `weekday:${weekday}`);
  if (!rule || rule.closed) return { closed: true, slots: [] };
  return { closed: false, slots: [...new Set(rule.slots.filter(isSlotMinute))].sort((a, b) => a - b) };
}
