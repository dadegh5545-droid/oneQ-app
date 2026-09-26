import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

import { toQatarE164 } from '../../../src/domain/validation';
import type { Schema } from '../../data/resource';

const cognito = new CognitoIdentityProviderClient();

// Returns the Cognito username that owns this Qatar mobile number (unique, see auth/pre-sign-up), or null.
export const handler: Schema['signInName']['functionHandler'] = async ({ arguments: { phone } }) => {
  const e164 = toQatarE164(phone);
  if (!e164) return null;
  // `e164` is "+974" followed by 8 digits, so it is safe inside the filter string.
  const { Users = [] } = await cognito.send(
    new ListUsersCommand({ UserPoolId: process.env.USER_POOL_ID, Filter: `phone_number = "${e164}"`, Limit: 1 }),
  );
  return Users[0]?.Username ?? null;
};
