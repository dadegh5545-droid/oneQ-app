// Data isolation check against the deployed backend in ./amplify_outputs.json (Phase 2 roles):
//   - guests and signed-in customers cannot read Section / Gym directly, and the customer queries never return a
//     hidden section, a pending or suspended facility, or a facility of a hidden section;
//   - a facility owner reads only their own facilities and cannot write them directly.
//
//   AWS_PROFILE=oneQ-2 node scripts/isolation-check.mjs --stack <root stack of the backend>
//
// Operator setup (AWS CLI): creates or reuses three test accounts (SES mailbox-simulator addresses, so no real
// person can own them; no email is sent) with a random password for this run, puts the two owners in
// FACILITY_OWNER, and writes the isolation fixtures through the seed-catalogue function. Nothing is deleted.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { Amplify } from 'aws-amplify';
import * as Auth from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';

import { invokeSandboxFunction, region } from './lib/sandbox-function.mjs';

const outputs = JSON.parse(readFileSync(new URL('../amplify_outputs.json', import.meta.url), 'utf8'));
const userPoolId = outputs.auth.user_pool_id;
Amplify.configure(outputs);
const client = generateClient();

const aws = (...args) => {
  const out = execFileSync('aws', [...args, '--region', region, '--output', 'json'], { encoding: 'utf8' });
  return out ? JSON.parse(out) : {};
};

const password = `Iso${randomBytes(9).toString('base64url')}9`;
const accounts = {
  customer: { email: 'success+oneq-isolation-customer@simulator.amazonses.com', phone: '+97455000101', group: null },
  ownerA: { email: 'success+oneq-isolation-owner-a@simulator.amazonses.com', phone: '+97455000102', group: 'FACILITY_OWNER' },
  ownerB: { email: 'success+oneq-isolation-owner-b@simulator.amazonses.com', phone: '+97455000103', group: 'FACILITY_OWNER' },
};

function ensureUser({ email, phone, group }) {
  let user;
  try {
    user = aws('cognito-idp', 'admin-get-user', '--user-pool-id', userPoolId, '--username', email);
  } catch {
    user = aws(
      'cognito-idp', 'admin-create-user', '--user-pool-id', userPoolId, '--username', email, '--message-action', 'SUPPRESS',
      '--user-attributes', `Name=email,Value=${email}`, 'Name=email_verified,Value=true', 'Name=name,Value=Isolation Test', `Name=phone_number,Value=${phone}`,
    ).User;
  }
  const attrs = user.UserAttributes ?? user.Attributes ?? [];
  const sub = attrs.find((a) => a.Name === 'sub').Value;
  aws('cognito-idp', 'admin-set-user-password', '--user-pool-id', userPoolId, '--username', user.Username, '--password', password, '--permanent');
  if (group) aws('cognito-idp', 'admin-add-user-to-group', '--user-pool-id', userPoolId, '--username', user.Username, '--group-name', group);
  return `${sub}::${user.Username}`;
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ check: name, result: 'PASS' });
  } catch (e) {
    results.push({ check: name, result: 'FAIL', detail: e?.message ?? String(e) });
  }
}
const assert = (cond, message) => {
  if (!cond) throw new Error(message);
};
const text = (r) => (r.errors ?? []).map((e) => `${e.errorType ?? ''} ${e.message}`).join(' | ');
async function call(request) {
  try {
    return await request;
  } catch (e) {
    return { data: null, errors: e?.errors ?? [{ errorType: e?.name, message: e?.message ?? String(e) }] };
  }
}
async function denied(request, what) {
  const r = await call(request);
  assert(/unauthori[sz]ed|not authorized/i.test(text(r)), `${what} was not denied: ${text(r) || JSON.stringify(r.data)?.slice(0, 200)}`);
}

const HIDDEN_SECTION = 'isolation-hidden';
const NEVER_PUBLIC = ['isolation-a-pending', 'isolation-b-suspended', 'isolation-b-hidden'];

async function customerChecks(label, authMode) {
  await check(`${label}: Section model list denied`, () => denied(client.models.Section.list({ authMode }), 'Section.list'));
  await check(`${label}: Gym model list denied`, () => denied(client.models.Gym.list({ authMode }), 'Gym.list'));
  await check(`${label}: Gym model get denied`, () => denied(client.models.Gym.get({ id: 'isolation-a-pending' }, { authMode }), 'Gym.get'));
  await check(`${label}: listVisibleSections has no hidden section`, async () => {
    const r = await call(client.queries.listVisibleSections({ authMode }));
    assert(!r.errors?.length, text(r));
    assert(r.data.length > 0, 'no visible sections');
    assert(!r.data.some((s) => s.slug === HIDDEN_SECTION || s.slug === 'hospital'), `hidden section returned: ${r.data.map((s) => s.slug)}`);
  });
  await check(`${label}: listApprovedFacilities excludes pending/suspended/hidden-section facilities`, async () => {
    const r = await call(client.queries.listApprovedFacilities({}, { authMode }));
    assert(!r.errors?.length, text(r));
    assert(r.data.length > 0, 'no approved facilities');
    const leaked = r.data.filter((f) => NEVER_PUBLIC.includes(f.id) || f.sectionId === HIDDEN_SECTION);
    assert(leaked.length === 0, `leaked: ${leaked.map((f) => f.id)}`);
  });
  for (const id of NEVER_PUBLIC) {
    await check(`${label}: getApprovedFacility(${id}) is null`, async () => {
      const r = await call(client.queries.getApprovedFacility({ id }, { authMode }));
      assert(!r.errors?.length, text(r));
      assert(r.data == null, `returned ${id}`);
    });
  }
}

async function signedIn(email, fn) {
  await Auth.signOut().catch(() => undefined);
  const { isSignedIn, nextStep } = await Auth.signIn({ username: email, password });
  assert(isSignedIn, `sign-in for ${email} stopped at ${nextStep?.signInStep}`);
  try {
    await fn();
  } finally {
    await Auth.signOut();
  }
}

const user = { authMode: 'userPool' };

const keys = Object.fromEntries(Object.entries(accounts).map(([name, a]) => [name, ensureUser(a)]));
const seeded = invokeSandboxFunction('seedcatalogue', { isolationFixtures: { ownerA: keys.ownerA, ownerB: keys.ownerB } });
console.log(`fixtures: ${JSON.stringify(seeded.result)}`);

await customerChecks('guest', 'identityPool');
await signedIn(accounts.customer.email, () => customerChecks('customer', 'userPool'));

await signedIn(accounts.ownerA.email, async () => {
  await check('ownerA: lists only own facilities', async () => {
    const r = await call(client.models.Gym.list({ ...user, limit: 1000 }));
    assert(!r.errors?.length, text(r));
    const ids = r.data.map((g) => g.id);
    assert(ids.includes('isolation-a-pending'), `own facility missing: ${ids}`);
    assert(!ids.some((id) => id.startsWith('isolation-b')), `other owner's facility listed: ${ids}`);
    assert(r.data.every((g) => g.ownerId === keys.ownerA || g.ownerId === keys.ownerA.split('::')[1]), 'facility of another owner listed');
  });
  await check("ownerA: cannot read ownerB's facility", async () => {
    const r = await call(client.models.Gym.get({ id: 'isolation-b-suspended' }, user));
    assert(r.data == null, 'read the other owner facility');
  });
  await check('ownerA: cannot update own facility directly (status)', () =>
    denied(client.models.Gym.update({ id: 'isolation-a-pending', status: 'approved' }, user), 'Gym.update'));
  await check('ownerA: cannot create a facility directly', () =>
    denied(
      client.models.Gym.create(
        { id: `isolation-a-self-${Date.now()}`, name: 'x', area: 'x', description: 'x', address: 'x', monthlyPrice: 0, trainerFromMonthly: 0, images: [], amenities: [], openingHours: [], isFeatured: false, isNearby: false, sortOrder: 999, status: 'approved' },
        user,
      ),
      'Gym.create',
    ));
  await check('ownerA: admin operations denied', () =>
    denied(client.mutations.adminSetFacilityStatus({ facilityId: 'isolation-a-pending', status: 'approved' }, user), 'adminSetFacilityStatus'));
});

await signedIn(accounts.ownerB.email, async () => {
  await check('ownerB: lists only own facilities', async () => {
    const r = await call(client.models.Gym.list({ ...user, limit: 1000 }));
    assert(!r.errors?.length, text(r));
    const ids = r.data.map((g) => g.id);
    assert(ids.includes('isolation-b-suspended') && ids.includes('isolation-b-hidden'), `own facilities missing: ${ids}`);
    assert(!ids.includes('isolation-a-pending'), `other owner's facility listed: ${ids}`);
  });
});

console.table(results);
const failed = results.filter((r) => r.result === 'FAIL');
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
