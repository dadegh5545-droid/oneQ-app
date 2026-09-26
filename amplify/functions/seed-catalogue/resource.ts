import { defineFunction } from '@aws-amplify/backend';

// Idempotent catalogue upsert; invoked by `npm run seed` (scripts/seed-catalogue.mjs), never by the app.
export const seedCatalogue = defineFunction({
  name: 'seed-catalogue',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 120,
  resourceGroupName: 'data',
});
