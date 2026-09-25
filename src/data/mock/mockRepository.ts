import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

import type { Booking } from '@/domain/models';
import { buildPlans, isClosed, isSlotAvailable, isSlotInFuture, next14Days, SLOT_MINUTES } from '@/domain/rules';

import type { Repository } from '../repository';
import { GYMS, REVIEWS, TRAINERS } from './seed';

export const BOOKINGS_KEY = 'oneq.bookings';

async function readBookings(): Promise<Booking[]> {
  const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
  return raw ? (JSON.parse(raw) as Booking[]) : [];
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
  async getAvailability(_trainerId, from) {
    const now = new Date();
    return next14Days(from).map((d) => {
      const date = format(d, 'yyyy-MM-dd');
      const closed = isClosed(d);
      return {
        date,
        closed,
        slots: SLOT_MINUTES.map((minutes, i) => ({
          id: `${date}-${i}`,
          minutes,
          available: !closed && isSlotAvailable(d, i) && isSlotInFuture(d, minutes, now),
        })),
      };
    });
  },
  async listBookings() {
    const all = await readBookings();
    return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getBooking(id) {
    return (await readBookings()).find((b) => b.id === id) ?? null;
  },
};
