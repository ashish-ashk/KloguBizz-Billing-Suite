import { test, expect } from '@playwright/test';

/**
 * Captures the screenshots the user guide is built from.
 *
 * Real screens with real data, taken from the seeded demo tenant — not mockups.
 * A guide illustrated with drawings of a product goes stale the first time a
 * button moves, and nobody notices.
 */

const APP = 'http://localhost:4200';
const API = 'http://127.0.0.1:5000/api/v1';
const EMAIL = 'owner@auroraindustries.in';
const PASSWORD = 'Password@123';
const OUT = 'guide-shots';

/**
 * Captured at the size the guide displays them, so the build step needs no image
 * library — the whole page is data URIs and most of its weight is these files.
 * Comfortably above the 880px breakpoint, so the layout is the desktop one.
 */
const DESK = { width: 1000, height: 730 };

test('capture the guide screenshots', async ({ page, request }) => {
  test.setTimeout(600_000);

  // ── The signed-out screens first ──
  await page.setViewportSize(DESK);
  await page.goto(`${APP}/register`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/01-signup.png` });

  await page.goto(`${APP}/login`);
  await page.getByLabel(/email/i).first().fill(EMAIL);
  await page.getByLabel(/password/i).first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).first().click();
  await page.waitForURL(/dashboard/, { timeout: 40000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/02-dashboard.png` });

  // ── Business profile ──
  await page.goto(`${APP}/business`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/03-business.png` });

  // ── Numbering, on the templates page ──
  await page.goto(`${APP}/invoice-templates`);
  await page.waitForTimeout(3500);
  const numbering = page.locator('section.card').filter({ hasText: /document numbering/i }).first();
  if (await numbering.count()) {
    await numbering.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await numbering.screenshot({ path: `${OUT}/04-numbering.png` });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/05-templates.png` });

  // ── Customers ──
  await page.goto(`${APP}/clients`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/06-clients.png` });

  await page.getByRole('button', { name: /add client/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/07-add-client.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);

  await page.getByRole('button', { name: /import csv/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/08-import-csv.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);

  // ── Items ──
  await page.goto(`${APP}/items`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/09-items.png` });

  // ── Making an invoice ──
  await page.goto(`${APP}/invoices/new`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/10-new-invoice-empty.png` });

  // Fill it in the way the guide will describe, so the screenshot matches the words.
  const clientSelect = page.locator('select').first();
  await clientSelect.selectOption({ index: 1 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/11-new-invoice-filled.png` });

  // ── The invoice list, and one invoice ──
  await page.goto(`${APP}/invoices`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/12-invoice-list.png` });

  const list = await request.post(`${API}/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
  const auth = { Authorization: `Bearer ${(await list.json()).token}` };
  const invs = await request.get(`${API}/invoices`, { headers: auth });
  const first = (await invs.json()).data[0];
  expect(first, 'the demo tenant should have an invoice').toBeTruthy();

  await page.goto(`${APP}/invoices/${first._id}/print`);
  await page.waitForTimeout(3000);
  const doc = page.locator('app-invoice-document').first();
  await doc.screenshot({ path: `${OUT}/13-invoice-document.png` });

  // ── Payments ──
  await page.goto(`${APP}/payments`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/14-payments.png` });

  // ── GST returns ──
  await page.goto(`${APP}/gst-returns`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/15-gst-returns.png` });

  // ── Reports ──
  await page.goto(`${APP}/reports`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/16-reports.png` });

  // ── On a phone ──
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${APP}/dashboard`);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/17-phone-dashboard.png` });

  await page.getByRole('button', { name: /toggle menu/i }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/18-phone-menu.png` });

  console.log('captured');
});
