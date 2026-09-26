import { defineFunction } from '@aws-amplify/backend';

// Review eligibility, create/edit/remove and rating aggregates; in the data stack because it calls the data API.
export const reviews = defineFunction({
  name: 'reviews',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 15,
  resourceGroupName: 'data',
});
