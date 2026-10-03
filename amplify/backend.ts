import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

import { preSignUp } from './auth/pre-sign-up/resource';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { adminAccess } from './functions/admin-access/resource';
import { adminOps } from './functions/admin-ops/resource';
import { bookings } from './functions/bookings/resource';
import { catalogue } from './functions/catalogue/resource';
import { completeBookings } from './functions/complete-bookings/resource';
import { facilityOwner } from './functions/facility-owner/resource';
import { phoneLogin } from './functions/phone-login/resource';
import { reviews } from './functions/reviews/resource';
import { sandboxFixtures } from './functions/sandbox-fixtures/resource';
import { seedCatalogue } from './functions/seed-catalogue/resource';

const backend = defineBackend({
  auth,
  data,
  preSignUp,
  bookings,
  reviews,
  phoneLogin,
  seedCatalogue,
  adminAccess,
  sandboxFixtures,
  catalogue,
  adminOps,
  completeBookings,
  facilityOwner,
});

const { userPool, cfnResources } = backend.auth.resources;

// App rule (06-FORMS-AND-FIELDS): at least 8 characters with a letter and a number. The app checks the
// letter; Cognito's default policy (upper + lower + symbol) would reject passwords the app accepts.
cfnResources.cfnUserPool.policies = {
  passwordPolicy: {
    minimumLength: 8,
    requireNumbers: true,
    requireLowercase: false,
    requireUppercase: false,
    requireSymbols: false,
    temporaryPasswordValidityDays: 7,
  },
};

// Phone sign-in lookup: read-only access to this user pool.
backend.phoneLogin.addEnvironment('USER_POOL_ID', userPool.userPoolId);
backend.phoneLogin.resources.lambda.addToRolePolicy(
  new PolicyStatement({ actions: ['cognito-idp:ListUsers'], resources: [userPool.userPoolArn] }),
);

// Operator tool: add/remove users in the admin group (no GraphQL exposure).
backend.adminAccess.addEnvironment('USER_POOL_ID', userPool.userPoolId);
backend.adminAccess.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminAddUserToGroup', 'cognito-idp:AdminRemoveUserFromGroup'],
    resources: [userPool.userPoolArn],
  }),
);

// Platform administration from the app (admin group only): invite facility owners by email, suspend accounts.
backend.adminOps.addEnvironment('USER_POOL_ID', userPool.userPoolId);
backend.adminOps.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminDisableUser',
      'cognito-idp:AdminEnableUser',
      'cognito-idp:ListUsers',
      'cognito-idp:ListUsersInGroup',
    ],
    resources: [userPool.userPoolArn],
  }),
);

// Payments are mock-only until a real provider is integrated (docs/PRODUCTION-READINESS.md). A production
// environment must set a real provider here; the bookings function rejects mock payment ids otherwise.
backend.bookings.addEnvironment('PAYMENT_PROVIDER', 'mock');

// Sandbox only: auto-confirm SES mailbox-simulator test accounts for the backend checks (never in branch deployments).
if (backend.stack.node.tryGetContext('amplify-backend-type') === 'sandbox') {
  backend.preSignUp.addEnvironment('SANDBOX_TEST_ACCOUNTS', 'true');
  // Test fixtures (backdate a test session, purge test accounts) exist only here.
  backend.sandboxFixtures.addEnvironment('SANDBOX_FIXTURES', 'true');
  backend.sandboxFixtures.addEnvironment('USER_POOL_ID', userPool.userPoolId);
  backend.sandboxFixtures.resources.lambda.addToRolePolicy(
    new PolicyStatement({ actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminDeleteUser'], resources: [userPool.userPoolArn] }),
  );
}
