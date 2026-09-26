import { router } from 'expo-router';

import { useSession } from '@/features/auth/sessionStore';

import { useDraft } from './draftStore';

// Plans / Booking "Continue": signed-in users skip S12 and use their account details (03 §3, §5).
export function continueToCheckout() {
  const { user } = useSession.getState();
  if (user) {
    useDraft.getState().setGuest({ fullName: user.fullName, phone: user.phone, email: user.email });
    router.push('/checkout');
  } else {
    router.push('/checkout/guest');
  }
}

// After signing in from S12, go straight to Checkout (fixes the sign-in loop, 01 §5.4).
// The auth modal is closed and S12 is replaced, so Back from Checkout returns to the booking step.
export function finishAuth(next?: string) {
  router.back();
  if (next === 'checkout') {
    const { user } = useSession.getState();
    if (user) useDraft.getState().setGuest({ fullName: user.fullName, phone: user.phone, email: user.email });
    router.replace('/checkout');
  }
}
