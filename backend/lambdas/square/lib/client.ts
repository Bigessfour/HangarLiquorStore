import { SQUARE_API_VERSION, squareApiBase } from './config';

export async function squareFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${squareApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': SQUARE_API_VERSION,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Square API ${path} failed (${res.status}): ${text.slice(0, 400)}`);
  }

  return (await res.json()) as T;
}
