import { defineFunction } from '@aws-amplify/backend';

// Grants/revokes the Cognito `admin` group. Invoked only by operators with lambda:InvokeFunction
// (`npm run admin:grant`); it has no GraphQL operation, so the app cannot reach it.
export const adminAccess = defineFunction({
  name: 'admin-access',
  entry: './handler.ts',
  runtime: 22,
});
