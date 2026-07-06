#!/usr/bin/env tsx
/**
 * Create the first Owner user in Cognito after terraform apply.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-owner.ts --username=owner@hangarliquor.com --password='TempPass1!'
 *
 * Requires: COGNITO_USER_POOL_ID env or --pool-id=
 */
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
}

const poolId = arg('pool-id') || process.env.COGNITO_USER_POOL_ID;
const username = arg('username');
const password = arg('password');
const givenName = arg('given-name');
const familyName = arg('family-name');
const displayName = arg('name');

if (!poolId || !username || !password) {
  console.error(
    'Usage: npx tsx scripts/bootstrap-owner.ts --username=EMAIL --password=TempPass1! [--pool-id=...] [--name="Chris Emick"] [--given-name=Chris] [--family-name=Emick]',
  );
  process.exit(1);
}

function buildUserAttributes(): { Name: string; Value: string }[] {
  const attrs: { Name: string; Value: string }[] = [
    { Name: 'email', Value: username },
    { Name: 'email_verified', Value: 'true' },
  ];
  if (givenName) attrs.push({ Name: 'given_name', Value: givenName });
  if (familyName) attrs.push({ Name: 'family_name', Value: familyName });
  const fullName = displayName || [givenName, familyName].filter(Boolean).join(' ').trim();
  if (fullName) attrs.push({ Name: 'name', Value: fullName });
  return attrs;
}

const client = new CognitoIdentityProviderClient({});

async function main() {
  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: poolId,
      Username: username,
      TemporaryPassword: password,
      UserAttributes: buildUserAttributes(),
      MessageAction: 'SUPPRESS',
    }),
  );

  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: poolId,
      Username: username,
      GroupName: 'Owner',
    }),
  );

  const fullName = displayName || [givenName, familyName].filter(Boolean).join(' ').trim();
  console.log(`Owner user created: ${username}${fullName ? ` (${fullName})` : ''}`);
  console.log('First login will require setting a new password in the app.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});