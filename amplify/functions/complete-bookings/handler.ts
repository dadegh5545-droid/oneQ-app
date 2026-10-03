import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { EventBridgeHandler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/complete-bookings';

import { SESSION_MINUTES, sessionStart } from '../../../src/domain/rules';
import type { Schema } from '../../data/resource';
import { mutateIf, qatarNow, ymd } from '../shared/data';
import { listAll } from '../shared/facilities';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

// Marks confirmed bookings "completed" once they are over: a timed booking when its duration has passed
// (60 minutes unless the booking says otherwise), a membership the day after its last day. Completed bookings
// unlock the one-time rating prompt. The conditional update never overrides a cancellation made meanwhile.
export const handler: EventBridgeHandler<'Scheduled Event', null, { completed: number }> = async () => {
  const now = Date.now();
  const today = ymd(qatarNow());
  const confirmed = await listAll((nextToken) => client.models.Booking.list({ filter: { status: { eq: 'confirmed' } }, nextToken, limit: 500 }));
  let completed = 0;
  for (const b of confirmed) {
    const over = b.date
      ? sessionStart(b.date).getTime() + (b.durationMinutes ?? SESSION_MINUTES) * 60_000 <= now
      : !!b.membershipEnd && b.membershipEnd < today;
    if (over && (await mutateIf(client, 'update', 'Booking', { id: b.id, status: 'completed' }, { status: { eq: 'confirmed' } }))) completed += 1;
  }
  return { completed };
};
