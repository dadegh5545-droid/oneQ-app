import { defineFunction } from '@aws-amplify/backend';

// Test fixtures for `npm run backend:check`. Operator-only (IAM invoke, no GraphQL operation) and inert unless
// SANDBOX_FIXTURES=true, which backend.ts sets for personal sandboxes only.
export const sandboxFixtures = defineFunction({
  name: 'sandbox-fixtures',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 60,
  resourceGroupName: 'data',
});
