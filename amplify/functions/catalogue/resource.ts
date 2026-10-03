import { defineFunction } from '@aws-amplify/backend';

// Customer catalogue reads (visible sections, approved facilities), filtered on the server; in the data stack
// because it calls the data API.
export const catalogue = defineFunction({
  name: 'catalogue',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 15,
  resourceGroupName: 'data',
});
