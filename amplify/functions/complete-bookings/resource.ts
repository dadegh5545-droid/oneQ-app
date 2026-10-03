import { defineFunction } from '@aws-amplify/backend';

// Scheduled: marks finished bookings "completed" (every 30 minutes); in the data stack because it calls the data API.
export const completeBookings = defineFunction({
  name: 'complete-bookings',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 120,
  schedule: 'every 30m',
  resourceGroupName: 'data',
});
