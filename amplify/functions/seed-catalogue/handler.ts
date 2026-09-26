import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/seed-catalogue';

import { buildPlans, PLAN_MONTHS } from '../../../src/domain/rules';
import type { Schema } from '../../data/resource';
import { GYMS, REVIEWS, TRAINERS } from '../../seed/catalogue';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

type Result = { data: unknown; errors?: readonly { message: string }[] };

// Keyed by the fixed catalogue ids, so running the seed again never duplicates records. Existing records are
// left alone (admins may have edited them) unless the payload is { "overwrite": true }.
let overwrite = false;

async function upsert(label: string, get: () => Promise<Result>, create: () => Promise<Result>, update: () => Promise<Result>) {
  const found = await get();
  if (found.errors?.length) throw new Error(`${label}: ${found.errors.map((e) => e.message).join(', ')}`);
  if (found.data && !overwrite) return 'unchanged';
  const result = found.data ? await update() : await create();
  if (result.errors?.length) throw new Error(`${label}: ${result.errors.map((e) => e.message).join(', ')}`);
  return found.data ? 'updated' : 'created';
}

export const handler = async (event?: { overwrite?: boolean }) => {
  overwrite = event?.overwrite === true;
  const outcome = { created: 0, updated: 0, unchanged: 0 };
  const count = (r: 'created' | 'updated' | 'unchanged') => (outcome[r] += 1);

  for (const [sortOrder, { id, ...gym }] of GYMS.entries()) {
    const record = { id, ...gym, sortOrder };
    count(await upsert(`Gym ${id}`, () => client.models.Gym.get({ id }), () => client.models.Gym.create(record), () => client.models.Gym.update(record)));

    for (const { id: planId, kind, name, price, description, badge } of buildPlans(id, gym.monthlyPrice)) {
      const plan = { id: planId, gymId: id, kind, name, price, description, badge, durationMonths: PLAN_MONTHS[kind] };
      count(
        await upsert(
          `MembershipPlan ${planId}`,
          () => client.models.MembershipPlan.get({ id: planId }),
          () => client.models.MembershipPlan.create(plan),
          () => client.models.MembershipPlan.update(plan),
        ),
      );
    }
  }

  for (const [sortOrder, trainer] of TRAINERS.entries()) {
    const record = { ...trainer, sortOrder };
    count(
      await upsert(
        `Trainer ${trainer.id}`,
        () => client.models.Trainer.get({ id: trainer.id }),
        () => client.models.Trainer.create(record),
        () => client.models.Trainer.update(record),
      ),
    );
  }

  for (const { gymId, trainerId, ...review } of REVIEWS) {
    // Null index keys are omitted, not written.
    const record = { ...review, ...(gymId ? { gymId } : {}), ...(trainerId ? { trainerId } : {}) };
    count(
      await upsert(
        `Review ${review.id}`,
        () => client.models.Review.get({ id: review.id }),
        () => client.models.Review.create(record),
        () => client.models.Review.update(record),
      ),
    );
  }

  const plans = GYMS.length * 3;
  return { ...outcome, gyms: GYMS.length, plans, trainers: TRAINERS.length, reviews: REVIEWS.length };
};
