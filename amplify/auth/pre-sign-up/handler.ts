import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { PreSignUpTriggerHandler } from 'aws-lambda';

import { isValidEmail, isValidFullName } from '../../../src/domain/validation';

const cognito = new CognitoIdentityProviderClient();

const QATAR_E164 = /^\+974[3567]\d{7}$/;

// Sandbox only (set in backend.ts): lets automated backend checks create confirmed accounts without a mailbox.
// SES mailbox-simulator addresses cannot belong to a real person.
const TEST_ACCOUNT = /^success\+oneq-autotest-[a-z0-9-]+@simulator\.amazonses\.com$/;

// Server-side sign-up rules: same field rules as the app, and one account per Qatar mobile number.
export const handler: PreSignUpTriggerHandler = async (event) => {
  const { email = '', name = '', phone_number: phone = '' } = event.request.userAttributes;
  if (!isValidEmail(email) || !isValidFullName(name) || !QATAR_E164.test(phone)) throw new Error('VALIDATION');

  // `phone` matched QATAR_E164 above, so it is safe inside the filter string.
  const { Users = [] } = await cognito.send(
    new ListUsersCommand({ UserPoolId: event.userPoolId, Filter: `phone_number = "${phone}"`, Limit: 1 }),
  );
  if (Users.length > 0) throw new Error('PHONE_EXISTS');

  if (process.env.SANDBOX_TEST_ACCOUNTS === 'true' && TEST_ACCOUNT.test(email)) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }
  return event;
};
