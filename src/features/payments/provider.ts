import type { PaymentMethod } from '@/domain/models';

export type PaymentRequest = { amountQar: number; method: PaymentMethod; idempotencyKey: string };
export type PaymentResult = { paymentId: string };

// A real provider (Tap, SkipCash, Stripe…) implements this interface later (11 §5).
export interface PaymentProvider {
  pay(request: PaymentRequest): Promise<PaymentResult>;
}

const SIMULATED_DELAY_MS = 900; // 09 §6

// Always succeeds after a short delay.
const mockPaymentProvider: PaymentProvider = {
  async pay({ idempotencyKey }) {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));
    return { paymentId: `mock-${idempotencyKey}` };
  },
};

export const paymentProvider: PaymentProvider = mockPaymentProvider;
