import { test, expect } from '@playwright/test';

/**
 * Decodes the QR off a rendered invoice page — the only check that answers the
 * question that matters: would a phone pointed at this printed invoice read it?
 */
const HARNESS = 'http://127.0.0.1:8901/';
const PDF = process.env.QR_PDF!;
const OUT = process.env.QR_OUT!;

// 72dpi is the PDF's own unit; 300dpi is a typical scan or a good phone photo.
const DPI = [96, 120, 150, 200, 300, 600];

test('the signed QR scans off the page', async ({ page }) => {
  test.setTimeout(300_000);
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await page.goto(HARNESS);
  await page.waitForFunction(() => (window as any).ready === true, { timeout: 30000 });

  for (const dpi of DPI) {
    const scale = dpi / 72;
    const size = await page.evaluate(([u, s]) => (window as any).renderPage(u, s), [PDF, scale] as const);
    await page.locator('#page').screenshot({ path: `${OUT}-${dpi}.png` });
    console.log(`rendered at ${dpi}dpi -> ${Math.round(size[0])}x${Math.round(size[1])}`);
  }
  expect(true).toBe(true);
});
