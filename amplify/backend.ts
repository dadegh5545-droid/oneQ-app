import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

import { preSignUp } from './auth/pre-sign-up/resource';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { bookings } from './functions/bookings/resource';
import { phoneLogin } from './functions/phone-login/resource';
import { seedCatalogue } from './functions/seed-catalogue/resource';

const backend = defineBackend({ auth, data, preSignUp, bookings, phoneLogin, seedCatalogue });

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

// Sandbox only: auto-confirm SES mailbox-simulator test accounts for the backend checks (never in branch deployments).
if (backend.stack.node.tryGetContext('amplify-backend-type') === 'sandbox') {
  backend.preSignUp.addEnvironment('SANDBOX_TEST_ACCOUNTS', 'true');
}
