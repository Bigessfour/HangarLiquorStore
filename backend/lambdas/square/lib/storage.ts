import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { connectionTable, ssmPrefix, storeId } from './config';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ssm = new SSMClient({});

export interface SquareConnectionRecord {
  storeId: string;
  connected: boolean;
  merchantId?: string;
  merchantName?: string;
  locationId?: string;
  locationName?: string;
  connectedAt?: string;
  connectedBy?: string;
  oauthState?: string;
  oauthStateExpiresAt?: number;
}

export async function getConnection(): Promise<SquareConnectionRecord | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: connectionTable(),
      Key: { storeId: storeId() },
    }),
  );
  return (res.Item as SquareConnectionRecord) ?? null;
}

export async function saveConnection(record: SquareConnectionRecord): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: connectionTable(),
      Item: record,
    }),
  );
}

export async function clearConnection(): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: connectionTable(),
      Key: { storeId: storeId() },
    }),
  );
}

async function getSecureParam(name: string): Promise<string | null> {
  try {
    const res = await ssm.send(
      new GetParameterCommand({ Name: `${ssmPrefix()}/${name}`, WithDecryption: true }),
    );
    const value = res.Parameter?.Value;
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function putSecureParam(name: string, value: string): Promise<void> {
  await ssm.send(
    new PutParameterCommand({
      Name: `${ssmPrefix()}/${name}`,
      Value: value,
      Type: 'SecureString',
      Overwrite: true,
    }),
  );
}

export async function getSquareAppCredentials(): Promise<{ applicationId: string; applicationSecret: string } | null> {
  const applicationId = await getSecureParam('application_id');
  const applicationSecret = await getSecureParam('application_secret');
  if (!applicationId || !applicationSecret) return null;
  return { applicationId, applicationSecret };
}

export async function saveSquareTokens(accessToken: string, refreshToken: string): Promise<void> {
  await putSecureParam('access_token', accessToken);
  await putSecureParam('refresh_token', refreshToken);
}

export async function getSquareAccessToken(): Promise<string | null> {
  return getSecureParam('access_token');
}

export async function clearSquareTokens(): Promise<void> {
  await putSecureParam('access_token', 'cleared');
  await putSecureParam('refresh_token', 'cleared');
}