import { expect, test } from './fixtures';

test('scan page loads with SCAN UPC button', async ({ page }) => {
  await page.goto('/scan');

  await expect(page.locator('label[for="hanger-photo-capture"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /live camera/i })).toBeVisible();
  await expect(page.getByLabel('Enter UPC manually')).toBeVisible();
});

test('manual UPC entry shows add form', async ({ page }) => {
  await page.goto('/scan');

  await page.getByLabel('Enter UPC manually').fill('071984000012');
  await page.getByRole('button', { name: 'Apply manual UPC' }).click();

  await expect(page.locator('#scan-upc')).toHaveValue('071984000012');
  await expect(page.locator('#scan-name')).toHaveValue('Coors Light 12pk 12oz Cans');
  await expect(page.getByRole('button', { name: 'Add to inventory' })).toBeVisible();
});

test('catalog product shows image from database', async ({ page }) => {
  await page.goto('/scan');

  await page.getByLabel('Enter UPC manually').fill('018200000103');
  await page.getByRole('button', { name: 'Apply manual UPC' }).click();

  await expect(page.getByText(/Found in product catalog|In stock \+ catalog photo/i)).toBeVisible();
  await expect(page.locator('img[alt*="Bud Light"]')).toBeVisible();
});

test('bottom nav includes scan and inventory', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Scan', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Inventory/i })).toBeVisible();
});

test('offline scan queues add action', async ({ page, context }) => {
  await page.goto('/scan');
  await expect(page.locator('label[for="hanger-photo-capture"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /live camera/i })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText(/Offline — scans will queue/)).toBeVisible();

  await page.getByLabel('Enter UPC manually').fill('071984000012');
  await page.getByRole('button', { name: 'Apply manual UPC' }).click();
  await page.locator('#scan-name').fill('Coors Light 12pk 12oz Cans');
  await page.locator('#scan-qty').fill('2');
  await page.getByRole('button', { name: 'Add to inventory' }).click();

  await expect(page.getByRole('status').getByText(/Offline — queued \+2 for Coors Light/)).toBeVisible();
});
