import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  ListUsersInGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/admin-ops';

import { isValidEmail, isValidFullName, toQatarE164 } from '../../../src/domain/validation';
import type { Schema } from '../../data/resource';
import { check, fail, isAdmin, qatarNow, text, unwrap, ymd, type Args, type ResolverEvent } from '../shared/data';
import { listAll, sectionOf, statusOf } from '../shared/facilities';

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

// ── Sections (wizard), facilities, owner accounts, overview ──

const SECTION_STATUSES = ['visible', 'hidden'] as const;
const BOOKING_MODES = ['appointment', 'subscription', 'both'] as const;
const PRESETS = ['gym', 'hospital', 'clinic', 'salon', 'other'] as const;
const MAX_SECTIONS = 20;
const MAX_CATEGORIES = 12;
const oneOf = <T extends string>(list: readonly T[], value: unknown) => (list.includes(value as T) ? (value as T) : fail('VALIDATION'));
const flag = (value: unknown) => value === true;
const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

type CategoryInput = { id?: string | null; nameAr?: unknown; nameEn?: unknown };

// Creates or edits a section and its categories (at most 12). Switching blocks off keeps their data hidden;
// the booking mode cannot change while the section has facilities (ENG-REVIEW v2 §3.5).
async function saveSection(args: Args) {
  const input = (typeof args.input === 'string' ? JSON.parse(args.input) : args.input) as Record<string, unknown>;
  const existingSlug = args.slug == null ? null : (text(args.slug, 64) ?? fail('VALIDATION'));
  const nameAr = text(input.nameAr, 60) ?? fail('VALIDATION');
  const nameEn = input.nameEn == null || input.nameEn === '' ? null : (text(input.nameEn, 60) ?? fail('VALIDATION'));
  const record = {
    nameAr,
    nameEn,
    descAr: input.descAr ? (text(input.descAr, 160) ?? fail('VALIDATION')) : null,
    descEn: input.descEn ? (text(input.descEn, 160) ?? fail('VALIDATION')) : null,
    icon: text(input.icon, 64) ?? fail('VALIDATION'),
    colorKey: text(input.colorKey, 32) ?? fail('VALIDATION'),
    order: typeof input.order === 'number' && Number.isInteger(input.order) && input.order >= 0 ? input.order : fail('VALIDATION'),
    status: oneOf(SECTION_STATUSES, input.status),
    bookingMode: oneOf(BOOKING_MODES, input.bookingMode),
    hasPractitioners: flag(input.hasPractitioners),
    hasServices: flag(input.hasServices),
    hasDepartments: flag(input.hasDepartments),
    hasPackages: flag(input.hasPackages),
    hasGallery: flag(input.hasGallery),
    practitionerLabelAr: input.practitionerLabelAr ? (text(input.practitionerLabelAr, 40) ?? fail('VALIDATION')) : null,
    practitionerLabelEn: input.practitionerLabelEn ? (text(input.practitionerLabelEn, 40) ?? fail('VALIDATION')) : null,
    presetType: oneOf(PRESETS, input.presetType),
  };
  const categories = (Array.isArray(input.categories) ? input.categories : []) as CategoryInput[];
  if (categories.length > MAX_CATEGORIES) fail('VALIDATION');
  const cleanCategories = categories.map((c, i) => ({
    id: c.id ? (text(c.id, 80) ?? fail('VALIDATION')) : null,
    nameAr: text(c.nameAr, 60) ?? fail('VALIDATION'),
    nameEn: c.nameEn ? (text(c.nameEn, 60) ?? fail('VALIDATION')) : null,
    order: i + 1,
  }));

  const sections = await listAll((nextToken) => client.models.Section.list({ nextToken, limit: 100 }));
  let slug = existingSlug;
  if (slug) {
    const current = sections.find((s) => s.slug === slug) ?? fail('NOT_FOUND');
    if (current.bookingMode !== record.bookingMode && (await listFacilities()).some((g) => sectionOf(g) === slug)) fail('CONFLICT');
    check(await client.models.Section.update({ slug, ...record }));
  } else {
    if (sections.length >= MAX_SECTIONS) fail('VALIDATION');
    const base = slugOf(nameEn ?? '') || `section-${Date.now().toString(36)}`;
    slug = base;
    for (let n = 2; sections.some((s) => s.slug === slug); n += 1) slug = `${base}-${n}`;
    check(await client.models.Section.create({ slug, ...record }));
  }
  // Categories: update kept ones, create new ones; removed categories are deleted (their services keep working
  // without a category).
  const existing = await listAll((nextToken) => client.models.SectionCategory.listCategoriesBySection({ sectionId: slug! }, { nextToken }));
  const keep = new Set(cleanCategories.map((c) => c.id).filter(Boolean));
  for (const c of existing.filter((e) => !keep.has(e.id))) check(await client.models.SectionCategory.delete({ id: c.id }));
  for (const c of cleanCategories) {
    const data = { sectionId: slug!, nameAr: c.nameAr, nameEn: c.nameEn, order: c.order };
    if (c.id && existing.some((e) => e.id === c.id)) check(await client.models.SectionCategory.update({ id: c.id, ...data }));
    else check(await client.models.SectionCategory.create({ id: `${slug}-cat-${Date.now().toString(36)}-${c.order}`, ...data }));
  }
  return slug!;
}

async function listOwners() {
  const users: { Username?: string; Attributes?: { Name?: string; Value?: string }[]; Enabled?: boolean; UserCreateDate?: Date }[] = [];
  let NextToken: string | undefined;
  do {
    const page = await cognito.send(new ListUsersInGroupCommand({ UserPoolId: userPoolId(), GroupName: OWNER_GROUP, NextToken }));
    users.push(...(page.Users ?? []));
    NextToken = page.NextToken;
  } while (NextToken);
  const facilities = await listFacilities();
  return users.map((u) => {
    const key = `${attribute(u.Attributes, 'sub') ?? ''}::${u.Username ?? ''}`;
    return {
      username: u.Username ?? '',
      ownerKey: key,
      email: attribute(u.Attributes, 'email') ?? '',
      fullName: attribute(u.Attributes, 'name') ?? '',
      phone: attribute(u.Attributes, 'phone_number'),
      enabled: u.Enabled !== false,
      createdAt: u.UserCreateDate ? new Date(u.UserCreateDate).toISOString() : null,
      facilities: facilities.filter((g) => g.ownerId === key || g.ownerId === u.Username).length,
    };
  });
}

// Creates or edits a facility as an admin. A facility always has an owner; one created by an admin is approved.
async function saveFacility(args: Args) {
  const input = (typeof args.input === 'string' ? JSON.parse(args.input) : args.input) as Record<string, unknown>;
  const id = args.facilityId == null ? null : (text(args.facilityId, 64) ?? fail('VALIDATION'));
  const ownerId = text(input.ownerId, 200) ?? fail('VALIDATION');
  const sectionId = text(input.sectionId, 64) ?? fail('VALIDATION');
  if (!(await unwrap(client.models.Section.get({ slug: sectionId })))) fail('VALIDATION');
  const record = {
    ownerId,
    sectionId,
    name: text(input.name, 80) ?? fail('VALIDATION'),
    area: text(input.area, 80) ?? fail('VALIDATION'),
    address: text(input.address, 200) ?? fail('VALIDATION'),
    description: text(input.description, 1000) ?? fail('VALIDATION'),
    phone: input.phone ? (text(input.phone, 16) ?? fail('VALIDATION')) : null,
    whatsapp: input.whatsapp ? (text(input.whatsapp, 16) ?? fail('VALIDATION')) : null,
    region: input.region ? (text(input.region, 80) ?? fail('VALIDATION')) : null,
    monthlyPrice: typeof input.monthlyPrice === 'number' && Number.isInteger(input.monthlyPrice) && input.monthlyPrice >= 0 ? input.monthlyPrice : 0,
    serviceMode: input.serviceMode == null ? null : oneOf(['inShop', 'home', 'both'] as const, input.serviceMode),
  };
  if (id) {
    (await unwrap(client.models.Gym.get({ id }))) ?? fail('NOT_FOUND');
    check(await client.models.Gym.update({ id, ...record }));
    return id;
  }
  const all = await listFacilities();
  const base = slugOf(record.name) || `facility-${Date.now().toString(36)}`;
  let newIdValue = base;
  for (let n = 2; all.some((g) => g.id === newIdValue); n += 1) newIdValue = `${base}-${n}`;
  check(
    await client.models.Gym.create({
      id: newIdValue,
      ...record,
      trainerFromMonthly: record.monthlyPrice,
      images: [],
      amenities: [],
      openingHours: [],
      isFeatured: false,
      isNearby: false,
      sortOrder: all.length,
      status: 'approved',
      createdBy: 'admin',
      categoryIds: [],
    }),
  );
  return newIdValue;
}

async function stats() {
  const today = ymd(qatarNow());
  const [facilities, bookings] = await Promise.all([listFacilities(), listAll((nextToken) => client.models.Booking.list({ nextToken, limit: 500 }))]);
  const since = Date.now() - 30 * 86_400_000;
  let newCustomers = 0;
  let PaginationToken: string | undefined;
  do {
    const page = await cognito.send(new ListUsersCommand({ UserPoolId: userPoolId(), PaginationToken, Limit: 60 }));
    newCustomers += (page.Users ?? []).filter((u) => u.UserCreateDate && new Date(u.UserCreateDate).getTime() >= since).length;
    PaginationToken = page.PaginationToken;
  } while (PaginationToken);
  const day = (b: (typeof bookings)[number]) => (b.date ? b.date.slice(0, 10) : (b.membershipStart ?? b.createdAt.slice(0, 10)));
  return {
    bookingsToday: bookings.filter((b) => b.status !== 'cancelled' && day(b) === today).length,
    pendingFacilities: facilities.filter((g) => statusOf(g) === 'pending').length,
    activeFacilities: facilities.filter((g) => statusOf(g) === 'approved').length,
    newCustomers,
  };
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
    case 'adminSaveSection':
      return saveSection(args);
    case 'adminListOwners':
      return listOwners();
    case 'adminSaveFacility':
      return saveFacility(args);
    case 'adminStats':
      return stats();
    default:
      throw new Error('UNSUPPORTED_OPERATION');
  }
};
