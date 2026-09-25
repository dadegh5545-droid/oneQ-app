import { create } from 'zustand';

import type { BookingDraft, Gym, GuestInfo, MembershipPlan, PaymentMethod, TimeSlot, Trainer } from '@/domain/models';

type DraftState = BookingDraft & {
  startWithGym: (gym: Gym) => void;
  selectPlan: (plan: MembershipPlan, gym: Gym) => void;
  selectTrainer: (trainer: Trainer, gym: Gym) => void;
  selectDate: (date: string) => void;
  selectSlot: (slot: TimeSlot) => void;
  setGuest: (guest: GuestInfo) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
};

export const useDraft = create<DraftState>()((set) => ({
  paymentMethod: 'card',
  // Opening a gym resets the draft to that gym (03-NAVIGATION §3); guest details are kept.
  startWithGym: (gym) =>
    set({ gym, path: undefined, plan: undefined, trainer: undefined, date: undefined, slot: undefined }),
  selectPlan: (plan, gym) => set({ gym, plan, path: 'membership', trainer: undefined, date: undefined, slot: undefined }),
  // The gym always comes from trainer.gymId, so booking works from any entry point.
  selectTrainer: (trainer, gym) =>
    set((s) => ({
      gym,
      trainer,
      path: 'membershipPlusTrainer',
      plan: undefined,
      ...(s.trainer?.id === trainer.id ? {} : { date: undefined, slot: undefined }),
    })),
  selectDate: (date) => set((s) => (s.date === date ? {} : { date, slot: undefined })),
  selectSlot: (slot) => set({ slot }),
  setGuest: (guest) => set({ guest }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
}));
