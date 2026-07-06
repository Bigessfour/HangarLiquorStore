import { expect, test } from '@playwright/test';

test('inventory page loads with mock items', async ({ page }) => {
  await page.goto('/inventory');

  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
  await expect(page.getByText('Coors Light 12pk 12oz Cans')).toBeVisible();
  await expect(page.getByText("Jack Daniel's Tennessee Whiskey 750ml")).toBeVisible();
});

test('inventory search filters items', async ({ page }) => {
  await page.goto('/inventory');

  await page.getByLabel('Search inventory').fill('Coors');
  await expect(page.getByText('Coors Light 12pk 12oz Cans')).toBeVisible();
  await expect(page.getByText("Jack Daniel's Tennessee Whiskey 750ml")).not.toBeVisible();
});

test('inventory category filter shows beer only', async ({ page }) => {
  await page.goto('/inventory');

  await page.getByRole('button', { name: 'Beer', exact: true }).click();
  await expect(page.getByText('Coors Light 12pk 12oz Cans')).toBeVisible();
  await expect(page.getByText("Jack Daniel's Tennessee Whiskey 750ml")).not.toBeVisible();
});

test('inventory edit dialog opens', async ({ page }) => {
  await page.goto('/inventory');

  await page.getByRole('button', { name: /Edit Coors Light/ }).click();
  await expect(page.getByRole('heading', { name: 'Edit item' })).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue('Coors Light 12pk 12oz Cans');
});

test('import CSV dialog opens from inventory page', async ({ page }) => {
  await page.goto('/inventory');

  await page.getByRole('button', { name: 'Import CSV' }).click();
  await expect(page.getByRole('heading', { name: 'Import inventory CSV' })).toBeVisible();
  await expect(page.getByText('Drag & drop a CSV file')).toBeVisible();
});

test('inventory shows pack size badge for case items', async ({ page }) => {
  await page.goto('/inventory');

  await expect(page.getByText('pack of 12').first()).toBeVisible(); // for Coors or Bud
  await expect(page.getByText("Jack Daniel's Tennessee Whiskey 750ml")).toBeVisible(); // no pack badge
});

test('inventory shows shrinkage risk for low stock items', async ({ page }) => {
  await page.goto('/inventory');

  // Multiple low stock items (e.g. Jack and Bud)
  await expect(page.getByText('LOW / Shrink risk').first()).toBeVisible();
  await expect(page.getByText("Jack Daniel's Tennessee Whiskey 750ml")).toBeVisible();
});

test('inventory edit dialog shows pack size field', async ({ page }) => {
  await page.goto('/inventory');

  await page.getByRole('button', { name: /Edit Coors Light/ }).click();
  await expect(page.getByRole('heading', { name: 'Edit item' })).toBeVisible();
  await expect(page.getByLabel('Pack size (case-break)')).toBeVisible();
  await expect(page.getByLabel('Pack size (case-break)')).toHaveValue('12');
});

test('inventory CSV import dialog mentions pack size', async ({ page }) => {
  await page.goto('/inventory');

  await page.getByRole('button', { name: 'Import CSV' }).click();
  await expect(page.getByRole('heading', { name: 'Import inventory CSV' })).toBeVisible();
  await expect(page.getByText(/packSize.*case-break/i)).toBeVisible();
});
