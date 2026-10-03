import { addDays, addMonths, format } from 'date-fns';

// Sample data for the test branch only, so the facility dashboards are not empty. Every id starts with
// "sample-"; facility and people names are invented. Generated relative to the day the seed runs, with a fixed
// pseudo-random sequence, so running the seed again rewrites the same records.

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

function sequence(seed: number) {
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  return { next, int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)), pick: <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)]! };
}

const FIRST = ['Ahmed', 'Fatima', 'Omar', 'Mariam', 'Yousef', 'Noor', 'Khalid', 'Sara', 'Hamad', 'Aisha', 'Ali', 'Reem', 'Faisal', 'Hessa', 'Nasser', 'Dana', 'Majed', 'Latifa', 'Saad', 'Huda'] as const;
const LAST = ['Haddad', 'Saleh', 'Mansour', 'Nasser', 'Karim', 'Yousef', 'Hamdan', 'Aziz', 'Rahman', 'Fares'] as const;

const unsplash = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const HOURS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({
  day,
  open: day === 'Friday' ? '8:00 AM' : '6:00 AM',
  close: day === 'Friday' ? '10:00 PM' : '11:00 PM',
}));

export const SAMPLE_GYM_ID = 'sample-gym';

export const sampleGym = (ownerId: string | null) => ({
  id: SAMPLE_GYM_ID,
  name: 'Sample Fitness Club',
  area: 'Al Sadd',
  description: 'Sample data for the OneQ dashboards (test branch). Members, bookings and reviews are invented.',
  address: 'Sample Street, Al Sadd, Doha',
  monthlyPrice: 250,
  trainerFromMonthly: 450,
  images: [unsplash('1593079831268-3381b0db4a77', 1400), unsplash('1554344728-77cf90d9ed26', 1400), unsplash('1571019614242-c5c5dee9f50b', 1400)],
  amenities: ['weights', 'cardio', 'sauna', 'lockers', 'parking'],
  openingHours: HOURS,
  isFeatured: false,
  isNearby: false,
  sortOrder: 800,
  sectionId: 'gym',
  // Not public until the client screens for sections exist (Phase 5); owners and admins see it in the dashboards.
  status: 'pending' as const,
  statusReason: 'sample',
  createdBy: 'admin' as const,
  categoryIds: [],
  phone: '+97455000201',
  whatsapp: '+97455000201',
  region: 'Al Sadd',
  lat: 25.2846,
  lng: 51.4947,
  ...(ownerId ? { ownerId } : {}),
});

export const SAMPLE_PLANS = [
  { months: 1, name: 'Monthly', price: 250, badge: null },
  { months: 2, name: '2 Months', price: 470, badge: null },
  { months: 3, name: '3 Months', price: 675, badge: 'popular' },
  { months: 6, name: '6 Months', price: 1250, badge: null },
  { months: 12, name: 'Annual', price: 2300, badge: 'bestValue' },
].map((p) => ({
  id: `sample-gym-plan-${p.months}m`,
  gymId: SAMPLE_GYM_ID,
  kind: p.months === 1 ? 'monthly' : `${p.months}m`,
  name: p.name,
  description: 'Sample plan',
  price: p.price,
  durationMonths: p.months,
  badge: p.badge,
  visible: true,
  allowFreeze: p.months >= 3,
  autoRenew: p.months === 1,
  ...(p.months === 12 ? { discountType: 'percent', discountValue: 10 } : {}),
}));

export const SAMPLE_TRAINERS = [
  { id: 'sample-trainer-rami', name: 'Rami Haddad', title: 'Strength Coach', image: unsplash('1571019614242-c5c5dee9f50b', 900), specialties: ['Strength Training'], skills: ['Powerlifting', 'Mobility'], years: 8, price: 220, languages: ['English', 'Arabic'] },
  { id: 'sample-trainer-lina', name: 'Lina Saleh', title: 'Functional Training Coach', image: unsplash('1518611012118-696072aa579a', 900), specialties: ['Functional Training', 'Mobility'], skills: ['HIIT', 'Rehab'], years: 6, price: 200, languages: ['English', 'Arabic'] },
  { id: 'sample-trainer-tariq', name: 'Tariq Mansour', title: 'Weight Loss Coach', image: unsplash('1583454110551-21f2fa2afe61', 900), specialties: ['Weight Loss'], skills: ['Nutrition', 'Cardio'], years: 5, price: 180, languages: ['Arabic'] },
].map((t, i) => ({
  id: t.id,
  gymId: SAMPLE_GYM_ID,
  name: t.name,
  title: t.title,
  bio: 'Sample trainer profile for the dashboards.',
  image: t.image,
  yearsExperience: t.years,
  languages: t.languages,
  specialties: t.specialties,
  skills: t.skills,
  certifications: ['Sample certification'],
  pricePerSession: t.price,
  sortOrder: i,
}));

const TIMES = [360, 420, 1020, 1080, 1140, 1200];
const timeLabel = (min: number) => {
  const h = Math.floor(min / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(min % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const startAt = (day: Date, min: number) => `${ymd(day)}T${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`;

type Guest = { fullName: string; phone: string; email: string | null };

// Members (membership bookings) over the last 12 months, trainer sessions from 60 days ago to 2 weeks ahead,
// a few frozen memberships and reviews.
export function sampleActivity(today: Date) {
  const r = sequence(20261004);
  const guests: Guest[] = [...Array(48)].map((_, i) => ({
    fullName: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
    phone: `+97455${String(100000 + i).slice(-6)}`,
    email: null,
  }));

  const memberships = guests.map((guest, i) => {
    const plan = SAMPLE_PLANS[r.pick([0, 0, 1, 2, 2, 2, 3, 4] as const)]!;
    const start = addDays(today, -r.int(0, 360));
    const end = addDays(addMonths(start, plan.durationMonths), -1);
    const cancelled = i % 13 === 5;
    const ended = ymd(end) < ymd(today);
    return {
      id: `sample-gym-member-${i + 1}`,
      type: 'membership',
      gymId: SAMPLE_GYM_ID,
      gymName: 'Sample Fitness Club',
      gymLocation: 'Al Sadd, Doha',
      planId: plan.id,
      planName: plan.name,
      sessionCount: 1,
      priceQar: plan.price,
      status: cancelled ? 'cancelled' : ended ? 'completed' : 'confirmed',
      guest,
      guestPhone: guest.phone,
      membershipStart: ymd(start),
      membershipEnd: ymd(end),
      paymentMethod: 'card',
      paymentId: `sample-pay-member-${i + 1}`,
      sectionId: 'gym',
    };
  });

  const sessions = [...Array(34)].map((_, i) => {
    const trainer = SAMPLE_TRAINERS[i % SAMPLE_TRAINERS.length]!;
    const day = addDays(today, r.int(-60, 14));
    const minutes = r.pick(TIMES);
    const guest = guests[r.int(0, guests.length - 1)]!;
    const past = ymd(day) < ymd(today);
    const cancelled = i % 11 === 3;
    return {
      id: `sample-gym-session-${i + 1}`,
      type: 'session',
      gymId: SAMPLE_GYM_ID,
      gymName: 'Sample Fitness Club',
      gymLocation: 'Al Sadd, Doha',
      trainerId: trainer.id,
      trainerName: trainer.name,
      date: startAt(day, minutes),
      timeLabel: timeLabel(minutes),
      sessionCount: 1,
      priceQar: trainer.pricePerSession,
      status: cancelled ? 'cancelled' : past ? 'completed' : 'confirmed',
      guest,
      guestPhone: guest.phone,
      paymentMethod: 'card',
      paymentId: `sample-pay-session-${i + 1}`,
      sectionId: 'gym',
    };
  });
  // Two upcoming sessions never collide on the same trainer and start time.
  const seen = new Set<string>();
  const uniqueSessions = sessions.filter((s) => {
    const key = `${s.trainerId}|${s.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const active = memberships.filter((m) => m.status === 'confirmed' && m.membershipStart <= ymd(today));
  const freezes = active.slice(0, 2).map((m, i) => ({
    id: `sample-gym-freeze-${i + 1}`,
    bookingId: m.id,
    gymId: SAMPLE_GYM_ID,
    startDate: ymd(addDays(today, -3)),
    endDate: ymd(addDays(today, 10 + i * 5)),
    days: 14 + i * 5,
  }));

  const TEXTS = [
    'Clean, calm and well equipped.',
    'Great coaches and friendly staff.',
    'Busy in the evenings but worth it.',
    'Excellent strength area.',
    'Good value for the annual plan.',
    'Changing rooms could be bigger.',
    'Love the sauna after training.',
    'Trainer sessions are very professional.',
  ];
  const reviews = [...Array(10)].map((_, i) => {
    const trainer = i >= 7 ? SAMPLE_TRAINERS[i - 7]! : null;
    return {
      id: `sample-gym-review-${i + 1}`,
      ...(trainer ? { trainerId: trainer.id } : { gymId: SAMPLE_GYM_ID }),
      authorName: `${FIRST[(i * 3) % FIRST.length]} ${LAST[i % LAST.length]![0]}.`,
      rating: [5, 5, 4, 5, 4, 3, 5, 5, 4, 5][i]!,
      date: ymd(addDays(today, -r.int(1, 120))),
      text: TEXTS[i % TEXTS.length]!,
      satisfied: i !== 5,
      ...(i === 1 ? { ownerReply: 'Thank you! See you at the club.', ownerReplyAt: today.toISOString() } : {}),
    };
  });

  return { memberships, sessions: uniqueSessions, freezes, reviews };
}
