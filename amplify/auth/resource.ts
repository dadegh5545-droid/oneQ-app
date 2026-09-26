import { defineAuth } from '@aws-amplify/backend';

import { preSignUp } from './pre-sign-up/resource';

// Email is the Cognito username. The Qatar mobile (+974XXXXXXXX) is a required, unique attribute;
// signing in with it resolves the username through the `signInName` query (functions/phone-login).
// Email confirmation codes use the default Cognito sender; no SMS is sent.
export const auth = defineAuth({
  loginWith: { email: true },
  userAttributes: {
    fullname: { required: true, mutable: true },
    phoneNumber: { required: true, mutable: true },
  },
  groups: ['admin'],
  triggers: { preSignUp },
  access: (allow) => [allow.resource(preSignUp).to(['listUsers'])],
});
