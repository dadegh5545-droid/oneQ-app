// Seeds the approved catalogue into the deployed sandbox by invoking its `seed-catalogue` function.
// Idempotent: records are keyed by their fixed ids, so running it again never duplicates anything.
//
//   AWS_PROFILE=oneq-dev npm run seed            (PowerShell: $env:AWS_PROFILE='oneq-dev'; npm run seed)
//   npm run seed -- --overwrite                   reset existing records to the approved catalogue (default: create missing only)
//   npm run seed -- --stack <root sandbox stack>  when more than one OneQ sandbox exists
import { invokeSandboxFunction, region } from './lib/sandbox-function.mjs';

const { stack, result } = invokeSandboxFunction('seedcatalogue', { overwrite: process.argv.includes('--overwrite') });
console.log(`Seeded ${stack} (${region}): ${JSON.stringify(result)}`);
