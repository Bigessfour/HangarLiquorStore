import { describe, expect, it } from 'vitest';

describe('Square OAuth scopes', () => {
  it('requests read-only POS scopes for forecasting', async () => {
    const { SQUARE_OAUTH_SCOPES } = await import('../lambdas/square/lib/config');
    expect(SQUARE_OAUTH_SCOPES).toContain('ORDERS_READ');
    expect(SQUARE_OAUTH_SCOPES).toContain('PAYMENTS_READ');
    expect(SQUARE_OAUTH_SCOPES).not.toContain('ORDERS_WRITE');
    expect(SQUARE_OAUTH_SCOPES).not.toContain('PAYMENTS_WRITE');
  });
});