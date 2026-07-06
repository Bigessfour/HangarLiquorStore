import { devices } from '@playwright/test';
import { expect, test } from './fixtures';
import { mockForecastApis } from './helpers/mock-api';

test.beforeEach(async ({ page }) => {
  await mockForecastApis(page);
});

test('iOS home screen PWA prefers photo scan over live camera', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await context.addInitScript(() => {
    Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });
    window.matchMedia = (query: string) => ({
      matches: query.includes('standalone'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
    localStorage.setItem(
      'hanger_auth_user',
      JSON.stringify({ username: 'demo-owner', token: 'demo-token', role: 'Owner' }),
    );
  });
  const page = await context.newPage();
  await page.goto('/scan');

  await expect(page.getByLabel('Tap to open camera and photograph barcode')).toBeVisible();
  await expect(page.getByRole('button', { name: /start live camera/i })).toHaveCount(0);
  await expect(page.getByText(/iPhone tip/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /open in Safari for live scan/i })).toBeVisible();

  await context.close();
});

test('iOS home screen FAB modal hides live camera', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await context.addInitScript(() => {
    Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });
    window.matchMedia = (query: string) => ({
      matches: query.includes('standalone'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
    localStorage.setItem(
      'hanger_auth_user',
      JSON.stringify({ username: 'demo-owner', token: 'demo-token', role: 'Owner' }),
    );
  });
  const page = await context.newPage();
  await mockForecastApis(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Scan Bottle' }).click();

  await expect(page.getByRole('dialog', { name: 'Scan bottle barcode' })).toBeVisible();
  await expect(page.getByLabel('Tap to open camera and photograph barcode')).toBeVisible();
  await expect(page.getByRole('button', { name: /start live camera/i })).toHaveCount(0);

  await context.close();
});

test('iOS Safari browser shows both photo and live camera scan', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      'hanger_auth_user',
      JSON.stringify({ username: 'demo-owner', token: 'demo-token', role: 'Owner' }),
    );
  });
  const page = await context.newPage();
  await page.goto('/scan');

  await expect(page.getByRole('button', { name: /start live camera/i })).toBeVisible();
  await expect(page.getByText(/take photo instead/i)).toBeVisible();
  await expect(page.getByText(/iPhone tip/i)).toHaveCount(0);

  await context.close();
});

test('Android Chrome more page shows install instructions', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      'hanger_auth_user',
      JSON.stringify({ username: 'demo-owner', token: 'demo-token', role: 'Owner' }),
    );
  });
  const page = await context.newPage();
  await page.goto('/more');

  await expect(page.getByText('Install the app', { exact: true })).toBeVisible();
  await expect(page.getByText(/Chrome/i).first()).toBeVisible();
  await expect(page.getByText(/Staff QR/i)).toBeVisible();
  await expect(page.getByText('PWABuilder (Android APK)')).toBeVisible();

  await context.close();
});

test('iOS Safari more page shows Add to Home Screen steps', async ({ browser }) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      'hanger_auth_user',
      JSON.stringify({ username: 'demo-owner', token: 'demo-token', role: 'Owner' }),
    );
  });
  const page = await context.newPage();
  await page.goto('/more');

  await expect(page.getByText(/Add to Home Screen/i).first()).toBeVisible();
  await expect(page.getByText(/tap the frame to open camera/i)).toBeVisible();

  await context.close();
});

test('Square setup page is owner-only with Chris label', async ({ page }) => {
  await page.goto('/square-setup');
  await expect(page.getByText(/Chris Emick/i)).toBeVisible();
  await expect(page.getByText(/chris\.emick\.owner@hangar\.demo/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Connect Square POS/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Square OAuth docs/i })).toBeVisible();
});