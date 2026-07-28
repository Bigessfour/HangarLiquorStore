import { expect, test } from './fixtures';

test('events page loads', async ({ page }) => {
  await page.goto('/events');
  await expect(page.getByRole('heading', { name: 'Local Events', exact: true })).toBeVisible();
});

test('events page shows demo july 4th event', async ({ page }) => {
  await page.goto('/events');
  await expect(page.getByText(/July 4th/i).first()).toBeVisible();
});

test('events page shows football season event', async ({ page }) => {
  await page.goto('/events');
  await expect(page.getByText(/Football|Wiley/i).first()).toBeVisible();
});

test('add event button visible for owner demo', async ({ page }) => {
  await page.goto('/events');
  await expect(page.getByRole('button', { name: 'Add Event' })).toBeVisible();
});

test('hunting season example opens form', async ({ page }) => {
  await page.goto('/events');
  await page.getByTestId('add-hunting-example').click();
  await expect(page.getByRole('heading', { name: /Add Local Event Multiplier/i })).toBeVisible();
  await expect(page.locator('#name')).toHaveValue('Hunting Season Opener');
  await expect(page.getByRole('button', { name: 'Spirits', pressed: true })).toBeVisible();
});

test('events multiplier displayed', async ({ page }) => {
  await page.goto('/events');
  await expect(page.getByText(/2\.8|×|multiplier/i).first()).toBeVisible();
});

test('events reachable via more page link', async ({ page }) => {
  await page.goto('/more');
  await page.getByRole('link', { name: /Local Events/i }).click();
  await expect(page).toHaveURL(/events/);
});
