import { expect, test } from '@playwright/test';

/**
 * The path the business runs on: sign up, add a customer, raise an invoice,
 * download the PDF.
 *
 * One test rather than a suite — see `playwright.config.ts` for why. What it is
 * really guarding is the seam between the frontend and the API, which is where
 * every serious failure in this project has actually lived: a request the server
 * had started refusing, a response shape the client no longer matched, a step
 * that simply did not exist. None of those are visible to a unit test, because
 * each piece was individually correct.
 */

/** A fresh tenant per run. Registration is part of what is being tested, and
 *  reusing an account would skip the step most likely to break after a change
 *  to auth. */
const stamp = Date.now();
const account = {
  name: 'Smoke Test',
  email: `smoke-${stamp}@example.test`,
  password: 'Password@123',
  orgName: `Smoke Test Traders ${stamp}`
};

test('a new business can sign up, bill a customer and download the invoice', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', error => consoleErrors.push(error.message));

  // ── Register ──
  await page.goto('/register');
  await page.fill('#name', account.name);
  await page.fill('#email', account.email);
  await page.fill('#password', account.password);
  await page.fill('#orgName', account.orgName);
  const stateSelect = page.locator('select').first();
  if (await stateSelect.count()) await stateSelect.selectOption('27');
  const terms = page.locator('input[type=checkbox]').first();
  if (await terms.count()) await terms.check();
  await page.click('button[type=submit]');

  // Straight to the dashboard, or via the login page — both are acceptable
  // product behaviour and the test should not encode which one is current.
  await page.waitForURL(/\/(dashboard|login)/, { timeout: 30_000 });
  if (page.url().includes('/login')) {
    await page.fill('#email', account.email);
    await page.fill('#password', account.password);
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
  }
  await expect(page.locator('body')).toContainText(account.orgName, { timeout: 20_000 });

  // ── A customer ──
  await page.goto('/clients');
  await page.click('button:has-text("Add Client"), button:has-text("+ Add Client")');
  const clientModal = page.locator('.modal-panel');
  await expect(clientModal).toBeVisible();
  await clientModal.locator('input').first().fill('Smoke Buyer Pvt Ltd');
  await clientModal.locator('.modal-foot button').last().click();
  await expect(page.locator('body')).toContainText('Smoke Buyer Pvt Ltd', { timeout: 20_000 });

  // ── An invoice ──
  await page.goto('/invoices/new');
  const invoiceClient = page.locator('select').first();
  await invoiceClient.selectOption({ index: 1 });

  // The line items table: description, quantity, rate.
  await page.locator('input[placeholder*="escription" i], tbody input[type=text]').first().fill('Consulting');
  const numbers = page.locator('tbody input[type=number]');
  await numbers.nth(0).fill('2');
  await numbers.nth(1).fill('5000');

  // The total is computed server-side from state codes — the point of the
  // product. If this is missing, the tax engine never ran.
  await expect(page.locator('body')).toContainText(/10,000|10000/, { timeout: 20_000 });

  await page.click('button:has-text("Save"), button:has-text("Create Invoice")');
  await page.waitForURL(/\/invoices(\/|$)/, { timeout: 30_000 });

  /**
   * Asserted on the money, not on the line description.
   *
   * The list shows the invoice number, the client and the totals; line items
   * live on the detail view. And the totals are the better assertion anyway:
   * 2 x 5,000 at 18% is 10,000 + 1,800 = 11,800, computed server-side from the
   * two state codes. Seeing that arithmetic on screen is proof the tax engine —
   * the actual product — ran end to end.
   */
  await expect(page.locator('tbody')).toContainText('Smoke Buyer Pvt Ltd', { timeout: 20_000 });
  await expect(page.locator('tbody')).toContainText('10,000');
  await expect(page.locator('tbody')).toContainText('1,800');
  await expect(page.locator('tbody')).toContainText('11,800');

  // ── The PDF ──
  // The one artefact a customer actually receives, and the only step that
  // exercises the whole rendering path end to end — templates, fonts, images,
  // the tax breakdown and the amount in words.
  //
  // Reached through the row's overflow menu, which is where the product puts it;
  // driving the UI as a person would is the entire point of this test, so it
  // does not shortcut to the endpoint.
  await page.locator('tbody tr').first().locator('app-overflow-menu button').first().click();
  const download = page.waitForEvent('download', { timeout: 60_000 });
  await page.click('button:has-text("Download PDF")');
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.pdf$/i);

  // A page that throws during any of this is broken even if every assertion
  // above happened to pass — see the white-screen bug this project shipped once.
  expect(consoleErrors).toEqual([]);
});
