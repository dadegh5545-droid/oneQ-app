import {
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import { isValidEmail } from '../../../src/domain/validation';

const cognito = new CognitoIdentityProviderClient();
const GROUP = 'admin';

type Input = { email?: unknown; action?: unknown };

export const handler = async ({ email, action }: Input) => {
  if (typeof email !== 'string' || !isValidEmail(email) || (action !== 'grant' && action !== 'revoke')) {
    throw new Error('VALIDATION: expected { email, action: "grant" | "revoke" }');
  }
  const UserPoolId = process.env.USER_POOL_ID;
  // Emails are validated above, so they are safe inside the filter string.
  const { Users = [] } = await cognito.send(new ListUsersCommand({ UserPoolId, Filter: `email = "${email.trim().toLowerCase()}"`, Limit: 1 }));
  const user = Users[0];
  if (!user?.Username) throw new Error('NOT_FOUND: no account with that email');
  // Only real, usable accounts: never an unconfirmed sign-up or a disabled user.
  if (action === 'grant' && (user.UserStatus !== 'CONFIRMED' || user.Enabled === false)) {
    throw new Error(`NOT_ELIGIBLE: account is ${user.Enabled === false ? 'disabled' : (user.UserStatus ?? 'not confirmed').toLowerCase()}`);
  }
  const Username = user.Username;
  const Command = action === 'grant' ? AdminAddUserToGroupCommand : AdminRemoveUserFromGroupCommand;
  await cognito.send(new Command({ UserPoolId, Username, GroupName: GROUP }));
  // The user must sign in again for the group to appear in their tokens.
  return { ok: true, action, group: GROUP };
};
