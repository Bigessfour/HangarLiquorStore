#!/usr/bin/env tsx
/**
 * Store Square Application ID + Secret in SSM (Part A helper).
 *
 * Usage:
 *   npx tsx scripts/setup-square-ssm.ts \
 *     --application-id=sq0idp-... \
 *     --application-secret=sq0csp-...
 *
 * Optional:
 *   --profile=steve
 *   --region=us-east-2
 *   --ssm-prefix=/hanger/prod/square   (defaults to terraform output)
 *   --dry-run
 *
 * Prints the OAuth redirect URI to paste into Square Developer → OAuth.
 */
import { execSync } from 'node:child_process';
import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

function arg(name: string): string | undefined {
  return process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function terraformOutput(name: string): string | null {
  try {
    return execSync(`terraform output -raw ${name}`, {
      cwd: new URL('../terraform', import.meta.url).pathname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

const applicationId = arg('application-id');
const applicationSecret = arg('application-secret');
const profile = arg('profile') || process.env.AWS_PROFILE || 'steve';
const region = arg('region') || process.env.AWS_REGION || 'us-east-2';
const dryRun = hasFlag('dry-run');

if (!applicationId || !applicationSecret) {
  console.error(`Usage:
  npx tsx scripts/setup-square-ssm.ts \\
    --application-id=sq0idp-XXXXXXXX \\
    --application-secret=sq0csp-XXXXXXXX \\
    [--profile=steve] [--region=us-east-2] [--ssm-prefix=/hanger/prod/square] [--dry-run]
`);
  process.exit(1);
}

const ssmPrefix =
  arg('ssm-prefix') || terraformOutput('square_ssm_prefix') || '/hanger/prod/square';
const redirectUri =
  terraformOutput('square_oauth_redirect_uri') ||
  '(run: cd terraform && terraform output -raw square_oauth_redirect_uri)';

console.log('=== Hangar Square Part A helper ===');
console.log('');
console.log('1) Paste this Redirect URL into Square Developer → your app → OAuth → Redirect URL:');
console.log(`   ${redirectUri}`);
console.log('');
console.log('2) Mapping:');
console.log(`   Square "Application ID"     → ${ssmPrefix}/application_id`);
console.log(`   Square "Application secret" → ${ssmPrefix}/application_secret`);
console.log('');
console.log(`AWS profile: ${profile}  region: ${region}`);
console.log('');

if (dryRun) {
  console.log('[dry-run] Would write SSM parameters (no changes made).');
  process.exit(0);
}

const client = new SSMClient({ region });

async function main() {
  process.env.AWS_PROFILE = profile;
  await client.send(
    new PutParameterCommand({
      Name: `${ssmPrefix}/application_id`,
      Value: applicationId!,
      Type: 'String',
      Overwrite: true,
    }),
  );
  console.log(`Wrote ${ssmPrefix}/application_id`);

  await client.send(
    new PutParameterCommand({
      Name: `${ssmPrefix}/application_secret`,
      Value: applicationSecret!,
      Type: 'SecureString',
      Overwrite: true,
    }),
  );
  console.log(`Wrote ${ssmPrefix}/application_secret (SecureString)`);
  console.log('');
  console.log('Done. Confirm in app: Owner → More → Square shows credentials configured.');
  console.log('Then Chris can tap Connect Square account.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
