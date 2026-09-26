// Regression + security checks against the deployed sandbox (reads ./amplify_outputs.json).
//   npm run backend:check        (AWS_PROFILE=oneq-dev enables the admin checks, which grant admin via a Lambda)
// Creates two auto-confirmed test users (SES mailbox-simulator addresses, sandbox only), exercises the
// catalogue, auth, favorites, bookings and authorization rules, then deletes both users.
// Test bookings stay in the sandbox tables (owners cannot delete bookings by design).
import { readFileSync } from 'node:fs';

import { Amplify } from 'aws-amplify';
import * as Auth from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';

import { invokeSandboxFunction } from './lib/sandbox-function.mjs';

Amplify.configure(JSON.parse(readFileSync(new URL('../amplify_outputs.json', import.meta.url), 'utf8')));
const client = generateClient();

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ check: name, result: 'PASS' });
  } catch (e) {
    results.push({ check: name, result: 'FAIL', detail: e?.message ?? String(e) });
  }
}
const assert = (cond, message) => {
  if (!cond) throw new Error(message);
};
const text = (r) => (r.errors ?? []).map((e) => `${e.errorType ?? ''} ${e.message}`).join(' | ');

// Returns { data, errors } whether the client throws or not.
async function call(request) {
  try {
    return await request;
  } catch (e) {
    return { data: null, errors: e?.errors ?? [{ errorType: e?.name, message: e?.message ?? String(e) }] };
  }
}

async function denied(request, what) {
  const r = await call(request);
  assert(/unauthori[sz]ed|not authorized/i.test(text(r)), `${what} was not denied: ${text(r) || JSON.stringify(r.data)}`);
}

async function failsWith(request, code) {
  const r = await call(request);
  assert(new RegExp(`\\b${code}\\b`).test(text(r)), `expected ${code}, got ${text(r) || 'success'}`);
}

async function authFails(request, name) {
  try {
    await request;
  } catch (e) {
    assert(e.name === name, `expected ${name}, got ${e.name}: ${e.message}`);
    return;
  }
  throw new Error(`expected ${name}, got success`);
}

const guest = { authMode: 'identityPool' };
const user = { authMode: 'userPool' };

async function ownerKey() {
  const { tokens } = await Auth.fetchAuthSession();
  return `${tokens.accessToken.payload.sub}::${tokens.accessToken.payload.username}`;
}

const stamp = Date.now().toString(36);
const randomPhone = () => `+9745${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
const makeUser = (tag) => ({
  email: `success+oneq-autotest-${stamp}-${tag}@simulator.amazonses.com`,
  phone: randomPhone(),
  name: `Test User ${tag.toUpperCase()}`,
  password: 'OneqTest2026',
});
const A = makeUser('a');
const B = makeUser('b');
const C = makeUser('c'); // admin
let sessionA; // { id, slot } — cancelled by the admin checks
let guestG1; // first guest booking (with its token)

async function signUpAndIn(u) {
  const { nextStep } = await Auth.signUp({
    username: u.email,
    password: u.password,
    options: { userAttributes: { email: u.email, name: u.name, phone_number: u.phone }, autoSignIn: true },
  });
  assert(nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN', `sign-up step ${nextStep.signUpStep}`);
  const { isSignedIn } = await Auth.autoSignIn();
  assert(isSignedIn, 'auto sign-in failed');
  u.owner = await ownerKey();
}

const signInAs = async (u) => {
  await Auth.signOut();
  const { isSignedIn } = await Auth.signIn({ username: u.email, password: u.password });
  assert(isSignedIn, `sign-in ${u.email} failed`);
};

// Complete inputs, so a denial comes from authorization and not from GraphQL input validation.
const fullGym = { name: 'x', area: 'x', description: 'x', address: 'x', rating: 5, reviewCount: 0, monthlyPrice: 1, trainerFromMonthly: 1, images: [], amenities: [], openingHours: [], isFeatured: false, isNearby: false, sortOrder: 99 };
const fullBooking = { type: 'membership', gymId: 'power-house', gymName: 'x', gymLocation: 'x', sessionCount: 1, priceQar: 1, status: 'confirmed', guest: { fullName: 'x', phone: '+97455500000' }, guestPhone: '+97455500000', paymentMethod: 'card', paymentId: 'x' };

// A fresh contact number per run: memberships from earlier runs stay active in the sandbox.
const runPhone = randomPhone();
const draft = (over) => ({ guestName: 'Test Guest', guestPhone: runPhone, guestEmail: null, ...over });

// First bookable slot for a trainer, searching from the end of the 14-day window.
async function freeSlot(trainerId, mode) {
  const { data: days, errors } = await client.queries.trainerAvailability({ trainerId }, mode);
  assert(!errors?.length && days?.length === 14, `availability: ${JSON.stringify(errors)}`);
  for (const day of [...days].reverse()) {
    const slot = [...day.slots].reverse().find((s) => s.available);
    if (slot) return { date: day.date, minutes: slot.minutes };
  }
  throw new Error('no free slot');
}

await Auth.signOut();

// ── Catalogue (guest) ──
await check('catalogue: 6 gyms with approved ids', async () => {
  const { data, errors } = await client.models.Gym.list({ ...guest, limit: 100 });
  assert(!errors?.length, text({ errors }));
  const ids = data.map((g) => g.id).sort().join(',');
  assert(ids === 'arena-fitness,atlas-athletics,core-studio,oxygen-gym,peak-performance,power-house', ids);
});
await check('catalogue: gym detail (Power House)', async () => {
  const { data } = await client.models.Gym.get({ id: 'power-house' }, guest);
  assert(data?.name === 'Power House' && data.monthlyPrice === 299 && data.openingHours.length === 7, JSON.stringify(data));
});
await check('catalogue: 18 plans, formula prices', async () => {
  const { data } = await client.models.MembershipPlan.list({ ...guest, limit: 100 });
  assert(data.length === 18, `plans ${data.length}`);
  const { data: ph } = await client.models.MembershipPlan.listPlansByGym({ gymId: 'power-house' }, guest);
  assert(ph.map((p) => `${p.id}:${p.price}`).join(',') === 'power-house-monthly:299,power-house-3m:807,power-house-6m:1399', JSON.stringify(ph));
});
await check('catalogue: 8 trainers, valid gym relationships', async () => {
  const { data: trainers } = await client.models.Trainer.list({ ...guest, limit: 100 });
  const { data: gyms } = await client.models.Gym.list({ ...guest, limit: 100 });
  assert(trainers.length === 8, `trainers ${trainers.length}`);
  assert(trainers.every((t) => gyms.some((g) => g.id === t.gymId)), 'trainer with unknown gym');
  const { data: ph } = await client.models.Trainer.listTrainersByGym({ gymId: 'power-house' }, guest);
  assert(ph.map((t) => t.id).join(',') === 'noura-abdullah,james-mitchell', ph.map((t) => t.id).join(','));
});
await check('catalogue: 17 reviews (gym + trainer indexes)', async () => {
  const { data } = await client.models.Review.list({ ...guest, limit: 100 });
  const { data: gym } = await client.models.Review.listReviewsByGym({ gymId: 'power-house' }, guest);
  const { data: trainer } = await client.models.Review.listReviewsByTrainer({ trainerId: 'noura-abdullah' }, guest);
  assert(data.length === 17 && gym.length === 3 && trainer.length === 3, `${data.length}/${gym.length}/${trainer.length}`);
});
await check('availability: 14 days, Sundays closed', async () => {
  const { data } = await client.queries.trainerAvailability({ trainerId: 'noura-abdullah' }, guest);
  assert(data.length === 14, `days ${data.length}`);
  const sundays = data.filter((d) => new Date(`${d.date}T00:00:00Z`).getUTCDay() === 0);
  assert(sundays.length >= 2 && sundays.every((d) => d.closed && d.slots.every((s) => !s.available)), 'sunday rule');
});

// ── Security: guests ──
await check('security: guest cannot create/update/delete catalogue', async () => {
  await denied(client.models.Gym.create({ id: `zz-test-${stamp}`, ...fullGym }, guest), 'guest createGym');
  await denied(client.models.Gym.update({ id: 'power-house', monthlyPrice: 1 }, guest), 'guest updateGym');
  await denied(client.models.Gym.delete({ id: `zz-missing-${stamp}` }, guest), 'guest deleteGym');
  await denied(client.models.MembershipPlan.update({ id: 'power-house-monthly', price: 1 }, guest), 'guest updatePlan');
  await denied(client.models.Trainer.update({ id: 'noura-abdullah', pricePerSession: 1 }, guest), 'guest updateTrainer');
  await denied(client.models.Review.create({ authorName: 'x', rating: 5, date: '2026-01-01', text: 'x' }, guest), 'guest createReview');
});
await check('security: guest cannot touch bookings, reservations, profiles, favorites directly', async () => {
  await denied(client.models.Booking.list(guest), 'guest listBookings');
  await denied(client.models.Booking.create(fullBooking, guest), 'guest createBooking');
  await denied(client.models.SlotReservation.list(guest), 'guest listSlotReservations');
  await denied(client.models.UserProfile.list(guest), 'guest listUserProfiles');
  await denied(client.models.Favorite.list(guest), 'guest listFavorites');
});

// ── Auth ──
await check('auth: sign up (confirmed) + automatic sign-in', () => signUpAndIn(A));
await check('auth: duplicate phone rejected (PHONE_EXISTS)', async () => {
  await Auth.signOut();
  try {
    await Auth.signUp({ username: `success+oneq-autotest-${stamp}-dup@simulator.amazonses.com`, password: 'OneqTest2026', options: { userAttributes: { email: `success+oneq-autotest-${stamp}-dup@simulator.amazonses.com`, name: 'Dup User', phone_number: A.phone } } });
  } catch (e) {
    assert(/PHONE_EXISTS/.test(e.message), e.message);
    return;
  }
  throw new Error('duplicate phone accepted');
});
await check('auth: unconfirmed sign-up needs code; wrong code rejected; resend works', async () => {
  const email = `success+oneq-manual-${stamp}@simulator.amazonses.com`;
  const { nextStep } = await Auth.signUp({ username: email, password: 'OneqTest2026', options: { userAttributes: { email, name: 'Manual User', phone_number: randomPhone() } } });
  assert(nextStep.signUpStep === 'CONFIRM_SIGN_UP', nextStep.signUpStep);
  await authFails(Auth.confirmSignUp({ username: email, confirmationCode: '000000' }), 'CodeMismatchException');
  await Auth.resendSignUpCode({ username: email });
});
await check('auth: bad password rejected', () => authFails(Auth.signIn({ username: A.email, password: 'Wrong12345' }), 'NotAuthorizedException'));
await check('auth: sign in with Qatar phone number', async () => {
  const { data: username } = await client.queries.signInName({ phone: A.phone.replace('+974', '') }, guest);
  assert(username, 'phone not resolved');
  const { isSignedIn } = await Auth.signIn({ username, password: A.password });
  assert(isSignedIn && (await ownerKey()) === A.owner, 'phone sign-in');
  const { data: unknown } = await client.queries.signInName({ phone: '33000001' }, guest).catch(() => ({ data: 'err' }));
  assert(unknown === null || unknown === 'err', 'unknown phone resolved');
});
await check('auth: sign out and sign back in (email)', async () => {
  await Auth.signOut();
  assert(!(await Auth.fetchAuthSession()).tokens, 'still signed in');
  await signInAs(A);
});
await check('auth: forgot password sends code; wrong code rejected', async () => {
  await Auth.signOut();
  const { nextStep } = await Auth.resetPassword({ username: A.email });
  assert(nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE', nextStep.resetPasswordStep);
  await authFails(Auth.confirmResetPassword({ username: A.email, confirmationCode: '000000', newPassword: 'OneqTest2027' }), 'CodeMismatchException');
  await signInAs(A);
});

// ── Profile & favorites (user A) ──
await check('profile: owner creates, reads and updates own profile', async () => {
  const created = await client.models.UserProfile.create({ profileOwner: A.owner, fullName: A.name, email: A.email, phone: A.phone }, user);
  assert(!created.errors?.length, text(created));
  const updated = await client.models.UserProfile.update({ profileOwner: A.owner, fullName: 'Test User A2' }, user);
  assert(updated.data?.fullName === 'Test User A2', text(updated));
  await denied(client.models.UserProfile.create({ profileOwner: 'someone-else::x', fullName: 'x', email: 'x@y.z', phone: '+97455500000' }, user), 'profile for another owner');
});
await check('favorites: add, duplicate prevented, list', async () => {
  const add = await client.models.Favorite.create({ owner: A.owner, gymId: 'power-house' }, user);
  assert(!add.errors?.length, text(add));
  const dup = await call(client.models.Favorite.create({ owner: A.owner, gymId: 'power-house' }, user));
  assert(/ConditionalCheckFailed/.test(text(dup)), `duplicate favorite: ${text(dup) || 'accepted'}`);
  const { data } = await client.models.Favorite.list({ owner: A.owner, ...user });
  assert(data.map((f) => f.gymId).join() === 'power-house', JSON.stringify(data));
});
await check('favorites: survive sign-out / sign-in', async () => {
  await signInAs(A);
  const { data } = await client.models.Favorite.list({ owner: A.owner, ...user });
  assert(data.length === 1, `favorites after re-sign-in: ${data.length}`);
});

// ── Bookings (user A) ──
let bookingA;
await check('bookings: quote uses server price', async () => {
  const { data, errors } = await client.queries.quoteBooking(draft({ type: 'membership', gymId: 'power-house', planId: 'power-house-3m' }), user);
  assert(data?.priceQar === 807, text({ errors }));
});
await check('bookings: authenticated membership booking (owned)', async () => {
  const { data, errors } = await client.mutations.placeBooking(draft({ type: 'membership', gymId: 'power-house', planId: 'power-house-3m', paymentMethod: 'card', paymentId: `mock-${stamp}-1` }), user);
  assert(data && !data.guestToken && data.priceQar === 807 && data.membershipEnd, text({ errors }));
  bookingA = data;
  const mine = await client.models.Booking.listBookingsByOwner({ owner: A.owner }, user);
  assert(mine.data.some((b) => b.id === data.id), 'booking not listed for owner');
});
await check('bookings: duplicate membership rejected', () =>
  failsWith(client.mutations.placeBooking(draft({ type: 'membership', gymId: 'power-house', planId: 'power-house-monthly', paymentMethod: 'card', paymentId: `mock-${stamp}-2` }), user), 'DUPLICATE_BOOKING'),
);
await check('bookings: authenticated trainer session keeps date/time; slot then taken', async () => {
  const slot = await freeSlot('hassan-elamin', user);
  const args = draft({ type: 'session', gymId: 'atlas-athletics', trainerId: 'hassan-elamin', ...slot, paymentMethod: 'card', paymentId: `mock-${stamp}-3` });
  const { data, errors } = await client.mutations.placeBooking(args, user);
  const hh = String(Math.floor(slot.minutes / 60)).padStart(2, '0');
  const mm = String(slot.minutes % 60).padStart(2, '0');
  assert(data?.date === `${slot.date}T${hh}:${mm}:00` && data.timeLabel && data.priceQar === 160, text({ errors }) || JSON.stringify(data));
  sessionA = { id: data.id, slot };
  await failsWith(client.mutations.placeBooking({ ...args, paymentId: `mock-${stamp}-4` }, user), 'SLOT_TAKEN');
  const { data: days } = await client.queries.trainerAvailability({ trainerId: 'hassan-elamin' }, user);
  const day = days.find((d) => d.date === slot.date);
  assert(day.slots.some((s) => s.minutes === slot.minutes && !s.available), 'booked slot still available');
});
await check('bookings: invalid drafts rejected server-side', async () => {
  const base = { paymentMethod: 'card', paymentId: `mock-${stamp}-x` };
  const slot = await freeSlot('noura-abdullah', user);
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'membership', gymId: 'power-house', planId: 'oxygen-gym-3m' }), user), 'INVALID_BOOKING');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'membership', gymId: 'power-house', planId: 'no-such-plan' }), user), 'INVALID_BOOKING');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'membership', gymId: 'no-such-gym', planId: 'power-house-3m' }), user), 'INVALID_BOOKING');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'session', gymId: 'oxygen-gym', trainerId: 'noura-abdullah', ...slot }), user), 'INVALID_BOOKING');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'session', gymId: 'power-house', trainerId: 'no-such-trainer', ...slot }), user), 'INVALID_BOOKING');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'session', gymId: 'power-house', trainerId: 'noura-abdullah', date: '2026-02-30', minutes: 540 }), user), 'VALIDATION');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'session', gymId: 'power-house', trainerId: 'noura-abdullah', date: slot.date, minutes: 545 }), user), 'VALIDATION');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'session', gymId: 'power-house', trainerId: 'noura-abdullah', date: '2020-01-01', minutes: 540 }), user), 'SLOT_UNAVAILABLE');
  const { data: days } = await client.queries.trainerAvailability({ trainerId: 'noura-abdullah' }, user);
  const sunday = days.find((d) => d.closed);
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'session', gymId: 'power-house', trainerId: 'noura-abdullah', date: sunday.date, minutes: 720 }), user), 'SLOT_UNAVAILABLE');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'yoga', gymId: 'power-house' }), user), 'VALIDATION');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'membership', gymId: 'power-house', planId: 'power-house-3m', guestPhone: '12345678' }), user), 'VALIDATION');
  await failsWith(client.mutations.placeBooking(draft({ ...base, type: 'membership', gymId: 'power-house', planId: 'power-house-3m', paymentMethod: 'cash' }), user), 'VALIDATION');
});
await check('security: owner cannot modify bookings, reservations or catalogue', async () => {
  await denied(client.models.Booking.update({ id: bookingA.id, priceQar: 1 }, user), 'owner updateBooking');
  await denied(client.models.Booking.delete({ id: bookingA.id }, user), 'owner deleteBooking');
  await denied(client.models.Booking.create(fullBooking, user), 'user createBooking');
  await denied(client.models.Gym.create({ id: `zz-test-${stamp}`, ...fullGym }, user), 'user createGym');
  await denied(client.models.SlotReservation.create({ trainerId: 'noura-abdullah', startAt: '2030-01-01T09:00:00', bookingId: 'x' }, user), 'user createSlotReservation');
  await denied(client.models.Gym.update({ id: 'power-house', monthlyPrice: 1 }, user), 'user updateGym');
});

// ── User B vs user A ──
await check('auth: second user signs up', async () => {
  await Auth.signOut();
  await signUpAndIn(B);
});
await check('security: B cannot read or change A favorites', async () => {
  const { data } = await client.models.Favorite.list({ owner: B.owner, ...user });
  assert(data.length === 0, 'B sees favorites');
  const scan = await call(client.models.Favorite.list(user));
  assert(!(scan.data ?? []).some((f) => f.owner === A.owner), 'B listed A favorites');
  const get = await call(client.models.Favorite.get({ owner: A.owner, gymId: 'power-house' }, user));
  assert(!get.data, 'B read A favorite');
  await denied(client.models.Favorite.create({ owner: A.owner, gymId: 'oxygen-gym' }, user), 'B create favorite for A');
  await denied(client.models.Favorite.delete({ owner: A.owner, gymId: 'power-house' }, user), 'B delete A favorite');
});
await check('security: B cannot read A bookings', async () => {
  const get = await call(client.models.Booking.get({ id: bookingA.id }, user));
  assert(!get.data, 'B read A booking');
  const byOwner = await call(client.models.Booking.listBookingsByOwner({ owner: A.owner }, user));
  assert(!(byOwner.data ?? []).length, 'B listed A bookings by owner');
  const all = await call(client.models.Booking.list(user));
  assert(!(all.data ?? []).some((b) => b.id === bookingA.id), 'B listed A booking');
  const { data: viaToken } = await client.queries.guestBookings({ tokens: [`${bookingA.id}.forged-secret`] }, user);
  assert(viaToken.length === 0, 'owned booking readable via forged guest token');
});
await check('security: B cannot read or modify A profile', async () => {
  const get = await call(client.models.UserProfile.get({ profileOwner: A.owner }, user));
  assert(!get.data, 'B read A profile');
  await denied(client.models.UserProfile.update({ profileOwner: A.owner, fullName: 'Hacked' }, user), 'B update A profile');
  await signInAs(A);
  const { data } = await client.models.UserProfile.get({ profileOwner: A.owner }, user);
  assert(data?.fullName === 'Test User A2', `A profile changed: ${data?.fullName}`);
});

// ── Guest bookings ──
await check('bookings: guest membership + token lookup; forged token rejected', async () => {
  await Auth.signOut();
  const { data, errors } = await client.mutations.placeBooking(draft({ type: 'membership', gymId: 'core-studio', planId: 'core-studio-monthly', guestPhone: randomPhone(), paymentMethod: 'card', paymentId: `mock-${stamp}-g1` }), guest);
  assert(data?.guestToken?.startsWith(`${data.id}.`) && data.priceQar === 229, text({ errors }));
  guestG1 = data;
  const { data: found } = await client.queries.guestBookings({ tokens: [data.guestToken] }, guest);
  assert(found.length === 1 && found[0].id === data.id && !found[0].guestToken, 'token lookup');
  const { data: forged } = await client.queries.guestBookings({ tokens: [`${data.id}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`] }, guest);
  assert(forged.length === 0, 'forged token accepted');
  await denied(client.models.Booking.get({ id: data.id }, guest), 'guest getBooking');
});
await check('bookings: guest trainer session', async () => {
  const slot = await freeSlot('maya-fernandes', guest);
  const { data, errors } = await client.mutations.placeBooking(draft({ type: 'session', gymId: 'core-studio', trainerId: 'maya-fernandes', ...slot, paymentMethod: 'card', paymentId: `mock-${stamp}-g2` }), guest);
  assert(data?.guestToken && data.trainerName === 'Maya Fernandes' && data.priceQar === 170, text({ errors }));
});

// ── Idempotency and payment boundary ──
await check('bookings: guest retry with the same payment returns the same booking; old token revoked', async () => {
  const args = draft({ type: 'membership', gymId: 'core-studio', planId: 'core-studio-monthly', paymentMethod: 'card', paymentId: `mock-${stamp}-g1` });
  const { data, errors } = await client.mutations.placeBooking(args, guest);
  assert(data?.id === guestG1.id && data.guestToken && data.guestToken !== guestG1.guestToken, text({ errors }) || 'no replay');
  const { data: oldToken } = await client.queries.guestBookings({ tokens: [guestG1.guestToken] }, guest);
  const { data: newToken } = await client.queries.guestBookings({ tokens: [data.guestToken] }, guest);
  assert(oldToken.length === 0 && newToken.length === 1, 'token rotation');
});
await check('bookings: owner retry with the same payment returns the same booking (no duplicate)', async () => {
  await signInAs(A);
  const args = draft({ type: 'membership', gymId: 'power-house', planId: 'power-house-3m', paymentMethod: 'card', paymentId: `mock-${stamp}-1` });
  const { data, errors } = await client.mutations.placeBooking(args, user);
  assert(data?.id === bookingA.id && !data.guestToken, text({ errors }) || 'no replay');
  const mine = await client.models.Booking.listBookingsByOwner({ owner: A.owner }, user);
  assert(mine.data.filter((b) => b.paymentId === `mock-${stamp}-1`).length === 1, 'duplicate booking created');
  assert(mine.data.every((b) => b.guestTokenHash == null), 'guestTokenHash exposed to owner');
});
await check('security: another caller cannot replay a payment id', async () => {
  await signInAs(B);
  await failsWith(client.mutations.placeBooking(draft({ type: 'membership', gymId: 'power-house', planId: 'power-house-3m', paymentMethod: 'card', paymentId: `mock-${stamp}-1` }), user), 'VALIDATION');
});
await check('payments: non-mock payment ids are rejected', async () => {
  await failsWith(client.mutations.placeBooking(draft({ type: 'membership', gymId: 'peak-performance', planId: 'peak-performance-monthly', guestPhone: randomPhone(), paymentMethod: 'card', paymentId: `real-${stamp}` }), user), 'PAYMENT_FAILED');
});

// ── Admin (needs AWS_PROFILE: the admin group is granted through the admin-access Lambda) ──
if (process.env.AWS_PROFILE) {
  await check('security: regular users and guests cannot cancel bookings (admin only)', async () => {
    await signInAs(A);
    await denied(client.mutations.adminCancelBooking({ id: sessionA.id }, user), 'user adminCancelBooking');
    await Auth.signOut();
    await denied(client.mutations.adminCancelBooking({ id: sessionA.id }, guest), 'guest adminCancelBooking');
  });
  await check('admin: granted through the admin-access function', async () => {
    await Auth.signOut();
    await signUpAndIn(C);
    invokeSandboxFunction('adminaccess', { action: 'grant', email: C.email });
    await signInAs(C);
    const { tokens } = await Auth.fetchAuthSession();
    assert((tokens.accessToken.payload['cognito:groups'] ?? []).includes('admin'), 'admin group missing from token');
  });
  await check('admin: can edit the catalogue (edit reverted)', async () => {
    const { data: gym } = await client.models.Gym.get({ id: 'power-house' }, user);
    const edited = await client.models.Gym.update({ id: 'power-house', description: `${gym.description} (check)` }, user);
    assert(!edited.errors?.length && edited.data.description.endsWith('(check)'), text(edited));
    const reverted = await client.models.Gym.update({ id: 'power-house', description: gym.description }, user);
    assert(reverted.data?.description === gym.description, 'revert failed');
  });
  await check('admin: sees all bookings and cancelling releases the trainer slot', async () => {
    const all = await client.models.Booking.list({ ...user, limit: 1000 });
    assert(all.data.some((b) => b.id === bookingA.id) && all.data.some((b) => b.id === sessionA.id), 'admin booking overview incomplete');
    const { data, errors } = await client.mutations.adminCancelBooking({ id: sessionA.id }, user);
    assert(data?.status === 'cancelled', text({ errors }));
    const { data: days } = await client.queries.trainerAvailability({ trainerId: 'hassan-elamin' }, user);
    const day = days.find((d) => d.date === sessionA.slot.date);
    assert(day.slots.some((s) => s.minutes === sessionA.slot.minutes && s.available), 'slot not released');
  });
  await check('hygiene: cancel the bookings created by this run', async () => {
    const all = await client.models.Booking.list({ ...user, limit: 1000 });
    const mine = all.data.filter((b) => b.paymentId.startsWith(`mock-${stamp}`) && b.status === 'confirmed');
    for (const b of mine) await client.mutations.adminCancelBooking({ id: b.id }, user);
    invokeSandboxFunction('adminaccess', { action: 'revoke', email: C.email });
    await Auth.deleteUser();
  });
} else {
  results.push({ check: 'admin checks', result: 'SKIP', detail: 'set AWS_PROFILE to run' });
}

// ── Cleanup ──
await check('cleanup: remove favorites and delete test users', async () => {
  await signInAs(A);
  await client.models.Favorite.delete({ owner: A.owner, gymId: 'power-house' }, user);
  await Auth.deleteUser();
  await signInAs(B);
  await Auth.deleteUser();
});

console.table(results);
const failed = results.filter((r) => r.result === 'FAIL').length;
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
