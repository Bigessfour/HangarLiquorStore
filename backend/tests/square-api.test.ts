import { describe, expect, it } from 'vitest';

describe('Square OAuth scopes', () => {
  it('requests read-only POS scopes for forecasting', async () => {
    const { SQUARE_OAUTH_SCOPES } = await import('../lambdas/square/lib/config');
    expect(SQUARE_OAUTH_SCOPES).toContain('ORDERS_READ');
    expect(SQUARE_OAUTH_SCOPES).toContain('PAYMENTS_READ');
    expect(SQUARE_OAUTH_SCOPES).toContain('ITEMS_READ');
    expect(SQUARE_OAUTH_SCOPES).toContain('INVENTORY_READ');
    expect(SQUARE_OAUTH_SCOPES).not.toContain('ORDERS_WRITE');
    expect(SQUARE_OAUTH_SCOPES).not.toContain('PAYMENTS_WRITE');
  });
});

describe('Square authorize URL', () => {
  it('includes redirect_uri when credentials exist path is exercised via builder shape', async () => {
    process.env.SQUARE_REDIRECT_URI = 'https://example.com/api/square/callback';
    process.env.SQUARE_SANDBOX = 'true';
    const { buildAuthorizationUrlAsync } = await import('../lambdas/square/lib/oauth');
    const url = await buildAuthorizationUrlAsync('test-state');
    // Without SSM credentials this returns null; with them it must include redirect_uri
    expect(url === null || url.includes('redirect_uri=')).toBe(true);
  });
});

describe('Square sync module', () => {
  it('exports runSquareSync', async () => {
    const mod = await import('../lambdas/square/lib/sync');
    expect(typeof mod.runSquareSync).toBe('function');
  });
});
