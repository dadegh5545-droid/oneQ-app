import { RepositoryError } from '@/data/repository';
import type { PaymentMethod } from '@/domain/models';

export type PaymentRequest = { amountQar: number; method: PaymentMethod; idempotencyKey: string };
export type PaymentResult = { paymentId: string };

// Client side of the payment boundary. A real Qatar-compatible provider (e.g. Tap, SkipCash, CyberSource/QNB —
// a business decision, 11 §5) implements this by presenting its card / Apple Pay / Google Pay sheet and returning
// the provider's payment id. The backend then verifies that id and the amount (bookings function, verifyPayment)
// before creating the booking; payment status, webhooks, failures and refunds are handled server-side.
export interface PaymentProvider {
  pay(request: PaymentRequest): Promise<PaymentResult>;
}

const SIMULATED_DELAY_MS = 900; // 09 §6

// DEVELOPMENT / TESTING ONLY: always succeeds after a short delay. The backend accepts these ids only while
// its PAYMENT_PROVIDER is "mock".
const mockPaymentProvider: PaymentProvider = {
  async pay({ idempotencyKey }) {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));
    return { paymentId: `mock-${idempotencyKey}` };
  },
};

// Production builds (EXPO_PUBLIC_APP_ENV=production, eas.json) never fall back to the mock.
const unconfiguredProvider: PaymentProvider = {
  async pay() {
    throw new RepositoryError('PAYMENT_FAILED');
  },
};

export const paymentProvider: PaymentProvider = process.env.EXPO_PUBLIC_APP_ENV === 'production' ? unconfiguredProvider : mockPaymentProvider;
