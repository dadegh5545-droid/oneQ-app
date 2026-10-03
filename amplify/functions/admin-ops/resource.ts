import { defineFunction } from '@aws-amplify/backend';

// Platform administration (owner accounts, facility status, sections); in the data stack because it calls the
// data API. USER_POOL_ID and the Cognito admin permissions are granted in backend.ts.
export const adminOps = defineFunction({
  name: 'admin-ops',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
