import { defineFunction } from '@aws-amplify/backend';

// Facility dashboards (FACILITY_OWNER for their own facilities, admins for all); in the data stack because it
// calls the data API.
export const facilityOwner = defineFunction({
  name: 'facility-owner',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
