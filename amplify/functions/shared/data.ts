import { createHash } from 'node:crypto';

import type { AppSyncResolverEvent } from 'aws-lambda';
import { format } from 'date-fns';

// Helpers shared by the data functions (bookings, reviews). Errors thrown with a code as the message are
// mapped to RepositoryError codes by the app.

export type ErrorCode =
  | 'VALIDATION'
  | 'INVALID_BOOKING'
  | 'SLOT_TAKEN'
  | 'SLOT_UNAVAILABLE'
  | 'DUPLICATE_BOOKING'
  | 'NOT_FOUND'
  | 'PAYMENT_FAILED'
  | 'UNAUTHORIZED'
  | 'REVIEW_NOT_ELIGIBLE'
  | 'DUPLICATE_REVIEW'
  | 'CONFLICT';

export function fail(code: ErrorCode): never {
  throw new Error(code);
}

export type DataErrors = readonly { message: string; errorType?: string | null }[] | undefined;

// Data-client calls resolve with `errors` instead of throwing.
export function check<T extends { errors?: DataErrors }>(result: T): T {
  if (result.errors?.length) throw new Error(`DATA_ERROR: ${result.errors.map((e) => e.errorType ?? e.message).join(', ')}`);
  return result;
}

export const unwrap = async <T>(request: Promise<{ data: T; errors?: DataErrors }>) => check(await request).data;

export const isConditionalFailure = (errors: DataErrors) =>
  !!errors?.some((e) => `${e.errorType ?? ''} ${e.message}`.includes('ConditionalCheckFailed'));

type GraphqlClient = { graphql: (options: { query: string; variables: Record<string, unknown> }) => unknown };

// Update/delete with a DynamoDB condition (not exposed by the typed model API). Returns false when the
// condition failed, so callers can retry or report a conflict; other errors throw.
export async function mutateIf(
  client: GraphqlClient,
  operation: 'update' | 'delete',
  model: string,
  input: Record<string, unknown>,
  condition: Record<string, unknown>,
) {
  const query = `mutation Conditional($input: ${capitalize(operation)}${model}Input!, $condition: Model${model}ConditionInput) {
    ${operation}${model}(input: $input, condition: $condition) { __typename }
  }`;
  // client.graphql rejects with the GraphQL result when it contains errors.
  const result = (await Promise.resolve(client.graphql({ query, variables: { input, condition } })).catch((e: unknown) => e)) as { errors?: DataErrors };
  if (isConditionalFailure(result.errors)) return false;
  check(result);
  return true;
}

const capitalize = (s: string) => s[0]!.toUpperCase() + s.slice(1);

// Qatar is UTC+3 all year. The shared date rules use device-local time, so they run against a Date whose
// local wall clock reads Qatar time, whatever the Lambda time zone is.
export const qatarNow = () => new Date(Date.now() + 3 * 3_600_000 + new Date().getTimezoneOffset() * 60_000);

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export const text = (value: unknown, max = 128) => (typeof value === 'string' && value.length > 0 && value.length <= max ? value : null);

export const sha256 = (value: string) => createHash('sha256').update(value).digest();

export type Args = Record<string, unknown>;
// Payload of the Lambda data source that Amplify generates for custom operations (fieldName at the top level).
export type ResolverEvent = { fieldName: string; arguments: Args; identity: AppSyncResolverEvent<Args>['identity'] };

// Signed-in callers (Cognito user pool) as "<sub>::<username>"; guests (identity-pool role) → null.
export const ownerOf = (identity: ResolverEvent['identity']) =>
  identity && 'sub' in identity && 'username' in identity && identity.sub && identity.username ? `${identity.sub}::${identity.username}` : null;

export const isAdmin = (identity: ResolverEvent['identity']) =>
  !!identity && 'groups' in identity && (identity.groups ?? []).includes('admin');

// Owner fields are stored as "<sub>::<username>" but read back as the username alone.
export const sameOwner = (stored: string | null | undefined, owner: string | null) =>
  !stored || !owner ? !stored && !owner : stored === owner || stored === owner.split('::')[1];
