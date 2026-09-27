// Finds a Lambda of the deployed OneQ sandbox (CloudFormation read) and invokes it with the AWS CLI.
// Needs only the Amplify deploy role permissions. Pass `--stack <root stack>` if several OneQ sandboxes exist.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const region = process.env.AWS_REGION ?? 'ap-south-1';

const aws = (...args) => JSON.parse(execFileSync('aws', [...args, '--region', region, '--output', 'json'], { encoding: 'utf8' }) || '{}');

function findRootStack() {
  const flag = process.argv.indexOf('--stack');
  if (flag > 0) return process.argv[flag + 1];
  const { StackSummaries = [] } = aws('cloudformation', 'list-stacks', '--stack-status-filter', 'CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE');
  // In an Amplify Hosting build (AWS_APP_ID and AWS_BRANCH are set) the branch's own backend; otherwise the sandbox.
  const { AWS_APP_ID: appId, AWS_BRANCH: branch } = process.env;
  const matches = appId && branch ? (name) => name.startsWith(`amplify-${appId}-${branch}-branch-`) : (name) => /^amplify-oneq-.+-sandbox-/.test(name);
  const roots = StackSummaries.filter((s) => !s.ParentId && matches(s.StackName)).map((s) => s.StackName);
  if (roots.length !== 1) throw new Error(`Expected one OneQ backend stack in ${region}, found: ${roots.join(', ') || 'none'}. Pass --stack.`);
  return roots[0];
}

function findFunction(rootStack, logicalPrefix) {
  const resources = (stack) => aws('cloudformation', 'list-stack-resources', '--stack-name', stack).StackResourceSummaries ?? [];
  for (const nested of resources(rootStack).filter((r) => r.ResourceType === 'AWS::CloudFormation::Stack')) {
    const fn = resources(nested.PhysicalResourceId).find((r) => r.ResourceType === 'AWS::Lambda::Function' && r.LogicalResourceId.toLowerCase().startsWith(logicalPrefix));
    if (fn) return fn.PhysicalResourceId;
  }
  throw new Error(`${logicalPrefix} function not found in ${rootStack}`);
}

// Returns the parsed function result; exits with an error message if the function failed.
export function invokeSandboxFunction(logicalPrefix, payload) {
  const stack = findRootStack();
  const functionName = findFunction(stack, logicalPrefix);
  const out = join(mkdtempSync(join(tmpdir(), 'oneq-')), 'result.json');
  const invoke = aws('lambda', 'invoke', '--function-name', functionName, '--cli-binary-format', 'raw-in-base64-out', '--payload', JSON.stringify(payload), out);
  const result = readFileSync(out, 'utf8');
  if (invoke.FunctionError) throw new Error(`${logicalPrefix} failed: ${result}`);
  return { stack, result: JSON.parse(result) };
}
