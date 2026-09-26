// Grants or revokes the `admin` group for an existing account in the deployed sandbox.
//   AWS_PROFILE=oneq-dev npm run admin:grant -- someone@example.com
//   AWS_PROFILE=oneq-dev npm run admin:revoke -- someone@example.com
// Grants only to confirmed, enabled accounts. The user must sign out and in again for the change to reach
// their tokens.
import { invokeSandboxFunction, region } from './lib/sandbox-function.mjs';

const [action, email] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!['grant', 'revoke'].includes(action) || !email) {
  console.error('Usage: node scripts/admin-access.mjs grant|revoke <email>');
  process.exit(1);
}
try {
  const { stack } = invokeSandboxFunction('adminaccess', { action, email });
  console.log(`${action === 'grant' ? 'Granted' : 'Revoked'} admin in ${stack} (${region}).`);
} catch (e) {
  // e.g. NOT_FOUND (no such account) or NOT_ELIGIBLE (unconfirmed / disabled): nothing was changed.
  const reason = /"errorMessage":"([^"]+)"/.exec(e.message)?.[1] ?? e.message.split(/\r?\n/)[0];
  console.error(`admin:${action} failed — ${reason}`);
  process.exit(1);
}
