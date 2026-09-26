import { defineFunction } from '@aws-amplify/backend';

// USER_POOL_ID and cognito-idp:ListUsers are granted in backend.ts.
export const phoneLogin = defineFunction({
  name: 'phone-login',
  entry: './handler.ts',
  runtime: 22,
});
