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

// Upsert by the fixed catalogue id, so running the seed again never duplicates records.
async function upsert(label: string, get: () => Promise<Result>, create: () => Promise<Result>, update: () => Promise<Result>) {
  const found = await get();
  const result = found.errors?.length ? found : found.data ? await update() : await create();
  if (result.errors?.length) throw new Error(`${label}: ${result.errors.map((e) => e.message).join(', ')}`);
  return found.data ? 'updated' : 'created';
}

export const handler = async () => {
  const outcome = { created: 0, updated: 0 };
  const count = (r: 'created' | 'updated') => (outcome[r] += 1);

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
