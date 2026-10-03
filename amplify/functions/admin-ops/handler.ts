import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/admin-ops';

import { isValidEmail, isValidFullName, toQatarE164 } from '../../../src/domain/validation';
import type { Schema } from '../../data/resource';
import { check, fail, isAdmin, text, unwrap, type Args, type ResolverEvent } from '../shared/data';
import { listAll, sectionOf } from '../shared/facilities';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();
const cognito = new CognitoIdentityProviderClient();

// Platform administration (Cognito `admin` group only: resolver rule + the check in the handler).
// Facility owners are invited by email only; no SMS is sent.

const OWNER_GROUP = 'FACILITY_OWNER';
const FACILITY_STATUSES = ['pending', 'approved', 'suspended'] as const;
type FacilityStatus = (typeof FACILITY_STATUSES)[number];

const userPoolId = () => process.env.USER_POOL_ID ?? fail('VALIDATION');
const attribute = (attrs: { Name?: string; Value?: string }[] | undefined, name: string) => attrs?.find((a) => a.Name === name)?.Value ?? null;

const listFacilities = () => listAll((nextToken) => client.models.Gym.list({ nextToken, limit: 100 }));

async function notify(recipient: string | null | undefined, kind: string, params: Record<string, unknown>) {
  if (!recipient) return;
  check(await client.models.Notification.create({ recipient, kind, params: JSON.stringify(params) }));
}

// Creates a confirmed-email account with a temporary password sent by Cognito's email invitation, in the
// FACILITY_OWNER group. Returns the owner key stored in Gym.ownerId.
async function createFacilityOwner(args: Args) {
  const fullName = typeof args.fullName === 'string' ? args.fullName.trim() : '';
  const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
  const phone = typeof args.phone === 'string' ? toQatarE164(args.phone) : null;
  if (!isValidFullName(fullName) || !isValidEmail(email) || !phone) fail('VALIDATION');
  let user;
  try {
    ({ User: user } = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId(),
        Username: email,
        DesiredDeliveryMediums: ['EMAIL'],
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: fullName },
          { Name: 'phone_number', Value: phone },
        ],
      }),
    ));
  } catch (e) {
    const name = (e as Error).name;
    if (name === 'UsernameExistsException' || /PHONE_EXISTS/.test((e as Error).message)) fail('ACCOUNT_EXISTS');
    throw e;
  }
  const username = user?.Username ?? fail('CONFLICT');
  const sub = attribute(user?.Attributes, 'sub') ?? fail('CONFLICT');
  await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId(), Username: username, GroupName: OWNER_GROUP }));
  return { username, ownerKey: `${sub}::${username}`, email, fullName };
}

// Disabling an account suspends every facility it owns; enabling it again does not re-approve them.
async function suspendAccount(args: Args) {
  const username = text(args.username, 128) ?? fail('VALIDATION');
  const suspended = args.suspended !== false;
  const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId(), Username: username })).catch(() => fail('NOT_FOUND'));
  const key = `${attribute(user.UserAttributes, 'sub') ?? ''}::${user.Username ?? username}`;
  const Command = suspended ? AdminDisableUserCommand : AdminEnableUserCommand;
  await cognito.send(new Command({ UserPoolId: userPoolId(), Username: user.Username ?? username }));
  let facilities = 0;
  if (suspended) {
    for (const g of (await listFacilities()).filter((f) => f.ownerId === key || f.ownerId === user.Username)) {
      check(await client.models.Gym.update({ id: g.id, status: 'suspended', statusReason: 'accountSuspended' }));
      facilities += 1;
    }
  }
  return { username: user.Username ?? username, suspended, facilities };
}

async function setFacilityStatus(args: Args) {
  const id = text(args.facilityId, 64) ?? fail('VALIDATION');
  const status = FACILITY_STATUSES.includes(args.status as FacilityStatus) ? (args.status as FacilityStatus) : fail('VALIDATION');
  const reason = args.reason == null ? null : (text(args.reason, 500) ?? fail('VALIDATION'));
  const gym = (await unwrap(client.models.Gym.get({ id }))) ?? fail('NOT_FOUND');
  check(await client.models.Gym.update({ id, status, statusReason: reason }));
  await notify(gym.ownerId, 'facilityStatus', { facilityId: id, facilityName: gym.name, status, reason });
  return { id, status, statusReason: reason };
}

// A section can only be deleted while no facility (in any status) belongs to it.
async function deleteSection(args: Args) {
  const slug = text(args.slug, 64) ?? fail('VALIDATION');
  if ((await listFacilities()).some((g) => sectionOf(g) === slug)) fail('SECTION_NOT_EMPTY');
  const categories = await listAll((nextToken) => client.models.SectionCategory.listCategoriesBySection({ sectionId: slug }, { nextToken }));
  for (const c of categories) check(await client.models.SectionCategory.delete({ id: c.id }));
  const deleted = await client.models.Section.delete({ slug });
  check(deleted);
  return !!deleted.data;
}

export const handler = async (event: ResolverEvent) => {
  if (!isAdmin(event.identity)) fail('UNAUTHORIZED');
  const args = event.arguments;
  switch (event.fieldName) {
    case 'adminCreateFacilityOwner':
      return createFacilityOwner(args);
    case 'adminSuspendAccount':
      return suspendAccount(args);
    case 'adminSetFacilityStatus':
      return setFacilityStatus(args);
    case 'adminDeleteSection':
      return deleteSection(args);
    default:
      throw new Error('UNSUPPORTED_OPERATION');
  }
};
