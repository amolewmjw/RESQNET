import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  const response = await request.post('http://127.0.0.1:8000/api/simulation/reset', { data: { scenario_id: 'flood' } });
  expect(response.ok()).toBeTruthy();
});

test('loads live backend data and resets all three scenarios', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Patients 6', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ambulance fleet 4' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hospitals 3' })).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('.leaflet-interactive')).not.toHaveCount(0);
  for (const [id, title, count] of [['building_collapse','Building collapse',5], ['industrial_gas_leak','Industrial gas leak',4], ['flood','Flood response',6]] as const) {
    const oldRevision = await page.getByTestId('revision').innerText();
    await page.getByLabel('Predefined scenario').selectOption(id);
    await page.getByRole('button', { name: 'Reset simulation' }).click();
    await expect(page.getByRole('status')).toContainText(`${title} restored`);
    await expect(page.getByRole('heading', { name: `Patients ${count}`, exact: true })).toBeVisible();
    await expect(page.getByTestId('revision')).not.toHaveText(oldRevision);
  }
  await page.screenshot({ path: '../docs/dashboard-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('shows API failure and recovers on retry', async ({ page }) => {
  await page.route('**/api/simulation', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('503');
  await page.unroute('**/api/simulation');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { name: 'Patients 6', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('failed reset retains displayed scenario and retry succeeds', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Patients 6', exact: true })).toBeVisible();
  await page.route('**/api/simulation/reset', route => route.fulfill({ status: 500, body: 'Failed' }));
  await page.getByLabel('Predefined scenario').selectOption('building_collapse');
  await page.getByRole('button', { name: 'Reset simulation' }).click();
  await expect(page.getByRole('alert')).toContainText('500');
  await expect(page.getByRole('heading', { name: 'Patients 6', exact: true })).toBeVisible();
  await page.unroute('**/api/simulation/reset');
  await page.getByRole('button', { name: 'Reset simulation' }).click();
  await expect(page.getByRole('heading', { name: 'Patients 5', exact: true })).toBeVisible();
});

test('mobile dashboard fits viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Patients 6', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: '../docs/dashboard-mobile.png', fullPage: true });
});
