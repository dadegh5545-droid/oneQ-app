// Seeds the approved catalogue into the deployed sandbox by invoking its `seed-catalogue` function.
// Idempotent: records are upserted by their fixed ids, so running it again never duplicates anything.
//
//   AWS_PROFILE=oneq-dev npm run seed            (PowerShell: $env:AWS_PROFILE='oneq-dev'; npm run seed)
//   npm run seed -- --stack <root sandbox stack>  when more than one OneQ sandbox exists
//
// Uses only the AWS CLI permissions of the Amplify deploy role (CloudFormation read + lambda:InvokeFunction).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const region = process.env.AWS_REGION ?? 'ap-south-1';
const stackArg = process.argv.indexOf('--stack');

const aws = (...args) => JSON.parse(execFileSync('aws', [...args, '--region', region, '--output', 'json'], { encoding: 'utf8' }) || '{}');

function findRootStack() {
  if (stackArg > 0) return process.argv[stackArg + 1];
  const { StackSummaries = [] } = aws('cloudformation', 'list-stacks', '--stack-status-filter', 'CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE');
  const roots = StackSummaries.filter((s) => !s.ParentId && /^amplify-oneq-.+-sandbox-/.test(s.StackName)).map((s) => s.StackName);
  if (roots.length !== 1) throw new Error(`Expected one OneQ sandbox stack in ${region}, found: ${roots.join(', ') || 'none'}. Pass --stack.`);
  return roots[0];
}

function findSeedFunction(rootStack) {
  const resources = (stack) => aws('cloudformation', 'list-stack-resources', '--stack-name', stack).StackResourceSummaries ?? [];
  for (const nested of resources(rootStack).filter((r) => r.ResourceType === 'AWS::CloudFormation::Stack')) {
    const fn = resources(nested.PhysicalResourceId).find(
      (r) => r.ResourceType === 'AWS::Lambda::Function' && /^seedcatalogue/i.test(r.LogicalResourceId),
    );
    if (fn) return fn.PhysicalResourceId;
  }
  throw new Error(`seed-catalogue function not found in ${rootStack}`);
}

const stack = findRootStack();
const functionName = findSeedFunction(stack);
const out = join(mkdtempSync(join(tmpdir(), 'oneq-seed-')), 'result.json');
console.log(`Seeding ${stack} (${region}) via ${functionName}…`);

const invoke = aws('lambda', 'invoke', '--function-name', functionName, '--cli-binary-format', 'raw-in-base64-out', '--payload', '{}', out);
const result = readFileSync(out, 'utf8');
if (invoke.FunctionError) {
  console.error(`Seed failed: ${result}`);
  process.exit(1);
}
console.log(`Seed complete: ${result}`);
