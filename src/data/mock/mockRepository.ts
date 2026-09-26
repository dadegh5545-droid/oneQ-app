import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, addMonths, format, startOfDay } from 'date-fns';
import * as Crypto from 'expo-crypto';

import type { Account, Booking, BookingDraft } from '@/domain/models';
import {
  buildPlans,
  draftTotal,
  isClosed,
  isSlotAvailable,
  isSlotInFuture,
  isUpcoming,
  next14Days,
  PLAN_MONTHS,
  SLOT_MINUTES,
  slotLabel,
} from '@/domain/rules';
import { isValidQatarMobile, normaliseQatarPhone } from '@/domain/validation';

import { RepositoryError, type Repository } from '../repository';
import { GYMS, REVIEWS, TRAINERS } from './seed';

// Persistence keys from 09 §2 (plus local mock accounts).
const BOOKINGS_KEY = 'oneq.bookings';
const ACCOUNTS_KEY = 'oneq.accounts';

type StoredAccount = Account & { passwordHash: string };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

const readBookings = () => readJson<Booking[]>(BOOKINGS_KEY, []);
const readAccounts = () => readJson<StoredAccount[]>(ACCOUNTS_KEY, []);

const hashPassword = (email: string, password: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `oneq:${email.toLowerCase()}:${password}`);

// Identifier is an email or a Qatar phone number.
const findAccount = (accounts: StoredAccount[], identifier: string) => {
  const id = identifier.trim();
  if (id.includes('@')) return accounts.find((a) => a.email.toLowerCase() === id.toLowerCase());
  return isValidQatarMobile(id) ? accounts.find((a) => a.phone === normaliseQatarPhone(id)) : undefined;
};

const toAccount = ({ passwordHash: _, ...account }: StoredAccount): Account => account;

// Pending reset codes live in memory only.
const resetCodes = new Map<string, string>();

const slotStart = (date: string, minutes: number) =>
  `${date}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;

// Server-style checks: complete draft, slot still bookable, no duplicate booking.
function assertBookable(draft: BookingDraft, bookings: Booking[]) {
  const { gym, guest } = draft;
  if (!gym || !guest) throw new RepositoryError('INVALID_BOOKING');

  if (draft.path === 'membershipPlusTrainer') {
    const { trainer, date, slot } = draft;
    if (!trainer || !date || !slot || trainer.gymId !== gym.id) throw new RepositoryError('INVALID_BOOKING');
    const day = new Date(`${date}T00:00:00`);
    const index = SLOT_MINUTES.indexOf(slot.minutes);
    const open = index >= 0 && !isClosed(day) && isSlotAvailable(day, index) && isSlotInFuture(day, slot.minutes);
    const start = slotStart(date, slot.minutes);
    const taken = bookings.some((b) => b.status === 'confirmed' && b.trainerId === trainer.id && b.date === start);
    if (!open || taken) throw new RepositoryError('SLOT_TAKEN');
    return;
  }

  const { plan } = draft;
  if (!plan || !plan.id.startsWith(`${gym.id}-`)) throw new RepositoryError('INVALID_BOOKING');
  const now = new Date();
  const hasActive = bookings.some(
    (b) => b.type === 'membership' && b.gymId === gym.id && b.guest.phone === guest.phone && isUpcoming(b, now),
  );
  if (hasActive) throw new RepositoryError('DUPLICATE_BOOKING');
}

export const mockRepository: Repository = {
  async listGyms() {
    return GYMS;
  },
  async getGym(id) {
    return GYMS.find((g) => g.id === id) ?? null;
  },
  async getPlans(gymId) {
    const gym = GYMS.find((g) => g.id === gymId);
    return gym ? buildPlans(gym.id, gym.monthlyPrice) : [];
  },
  async listTrainers(gymId, specialty) {
    return TRAINERS.filter((t) => t.gymId === gymId && (!specialty || t.specialties.includes(specialty)));
  },
  async getTrainer(id) {
    return TRAINERS.find((t) => t.id === id) ?? null;
  },
  async listReviews(by) {
    return 'gymId' in by ? REVIEWS.filter((r) => r.gymId === by.gymId) : REVIEWS.filter((r) => r.trainerId === by.trainerId);
  },
  async getAvailability(trainerId, from) {
    const now = new Date();
    const booked = new Set(
      (await readBookings()).filter((b) => b.status === 'confirmed' && b.trainerId === trainerId && b.date).map((b) => b.date),
    );
    return next14Days(from).map((d) => {
      const date = format(d, 'yyyy-MM-dd');
      const closed = isClosed(d);
      return {
        date,
        closed,
        slots: SLOT_MINUTES.map((minutes, i) => ({
          id: `${date}-${i}`,
          minutes,
          available: !closed && isSlotAvailable(d, i) && isSlotInFuture(d, minutes, now) && !booked.has(slotStart(date, minutes)),
        })),
      };
    });
  },

  async quoteBooking(draft) {
    assertBookable(draft, await readBookings());
    return { priceQar: draftTotal(draft) };
  },
  async createBooking(draft, payment) {
    const bookings = await readBookings();
    assertBookable(draft, bookings);
    const { gym, guest } = draft as Required<Pick<BookingDraft, 'gym' | 'guest'>> & BookingDraft;
    const session = draft.path === 'membershipPlusTrainer';
    const now = new Date();
    const start = startOfDay(now);
    const months = draft.plan ? PLAN_MONTHS[draft.plan.kind] : 1;

    const booking: Booking = {
      id: `bk-${now.getTime()}`,
      type: session ? 'session' : 'membership',
      gymId: gym.id,
      gymName: gym.name,
      gymLocation: `${gym.area}, Doha`,
      trainerId: session ? (draft.trainer?.id ?? null) : null,
      trainerName: session ? (draft.trainer?.name ?? null) : null,
      planId: session ? null : (draft.plan?.id ?? null),
      planName: session ? null : (draft.plan?.name ?? null),
      date: session && draft.date && draft.slot ? slotStart(draft.date, draft.slot.minutes) : null,
      timeLabel: session && draft.slot ? slotLabel(draft.slot.minutes) : null,
      sessionCount: 1,
      priceQar: draftTotal(draft),
      status: 'confirmed',
      guest,
      createdAt: now.toISOString(),
      membershipStart: session ? null : format(start, 'yyyy-MM-dd'),
      membershipEnd: session ? null : format(addDays(addMonths(start, months), -1), 'yyyy-MM-dd'),
      paymentMethod: payment.method,
      paymentId: payment.paymentId,
    };
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify([booking, ...bookings]));
    return booking;
  },
  async listBookings() {
    const all = await readBookings();
    return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getBooking(id) {
    return (await readBookings()).find((b) => b.id === id) ?? null;
  },

  async signIn(identifier, password) {
    const account = findAccount(await readAccounts(), identifier);
    if (!account || account.passwordHash !== (await hashPassword(account.email, password))) {
      throw new RepositoryError('INVALID_CREDENTIALS');
    }
    return toAccount(account);
  },
  async signUp({ password, ...input }) {
    const accounts = await readAccounts();
    const email = input.email.trim().toLowerCase();
    const phone = normaliseQatarPhone(input.phone);
    if (accounts.some((a) => a.email.toLowerCase() === email || a.phone === phone)) {
      throw new RepositoryError('ACCOUNT_EXISTS');
    }
    const account: StoredAccount = { fullName: input.fullName.trim(), email, phone, passwordHash: await hashPassword(email, password) };
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
    return toAccount(account);
  },
  async requestPasswordReset(identifier) {
    const account = findAccount(await readAccounts(), identifier);
    if (!account) throw new RepositoryError('ACCOUNT_NOT_FOUND');
    const code = String(Crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(6, '0');
    resetCodes.set(account.email, code);
    return { demoCode: code };
  },
  async confirmPasswordReset(identifier, code, newPassword) {
    const accounts = await readAccounts();
    const account = findAccount(accounts, identifier);
    if (!account || resetCodes.get(account.email) !== code.trim()) throw new RepositoryError('INVALID_CODE');
    resetCodes.delete(account.email);
    account.passwordHash = await hashPassword(account.email, newPassword);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  },
};
