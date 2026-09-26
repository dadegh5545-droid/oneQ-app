import { defineFunction } from '@aws-amplify/backend';

// Resolver for the booking operations; lives in the data stack because it also calls the data API.
export const bookings = defineFunction({
  name: 'bookings',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 15,
  resourceGroupName: 'data',
});
