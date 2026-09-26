import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { AdminDeleteUserCommand, CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/sandbox-fixtures';

import type { Schema } from '../../data/resource';
import { check, mutateIf, unwrap } from '../shared/data';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();
const cognito = new CognitoIdentityProviderClient();

// Automated test accounts only: SES mailbox-simulator addresses used by the backend checks and UI tests.
const TEST_EMAIL = /^success\+oneq-(autotest|manual)[a-z0-9-]*@simulator\.amazonses\.com$/;

type Input = { action?: unknown; bookingId?: unknown; date?: unknown };

export const handler = async ({ action, bookingId, date }: Input) => {
  if (process.env.SANDBOX_FIXTURES !== 'true') throw new Error('DISABLED: sandbox fixtures are not available in this environment');

  // Moves a test session into the past (and releases its slot) so review eligibility can be exercised.
  if (action === 'backdate-session' && typeof bookingId === 'string' && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(date)) {
    const booking = await unwrap(client.models.Booking.get({ id: bookingId }));
    if (!booking || booking.type !== 'session' || !booking.trainerId || !booking.date) throw new Error('NOT_FOUND: session booking');
    if (!booking.paymentId.startsWith('mock-')) throw new Error('VALIDATION: only mock (test) bookings');
    await mutateIf(client, 'delete', 'SlotReservation', { trainerId: booking.trainerId, startAt: booking.date }, { bookingId: { eq: booking.id } });
    check(await client.models.Booking.update({ id: booking.id, date }));
    return { ok: true };
  }

  // Deletes the automated test accounts (confirmed or not); never touches any other user.
  if (action === 'purge-test-users') {
    const UserPoolId = process.env.USER_POOL_ID;
    let deleted = 0;
    let PaginationToken: string | undefined;
    do {
      const page = await cognito.send(new ListUsersCommand({ UserPoolId, Filter: 'email ^= "success+oneq-"', PaginationToken }));
      for (const user of page.Users ?? []) {
        const email = user.Attributes?.find((a) => a.Name === 'email')?.Value ?? '';
        if (!TEST_EMAIL.test(email)) continue;
        await cognito.send(new AdminDeleteUserCommand({ UserPoolId, Username: user.Username }));
        deleted += 1;
      }
      PaginationToken = page.PaginationToken;
    } while (PaginationToken);
    return { ok: true, deleted };
  }

  throw new Error('VALIDATION: unknown action');
};
