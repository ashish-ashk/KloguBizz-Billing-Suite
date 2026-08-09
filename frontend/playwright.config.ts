import { defineConfig } from '@playwright/test';

/**
 * The end-to-end smoke test (#59's frontend half).
 *
 * **One test, covering the path the business runs on**: sign up, add a customer,
 * raise an invoice, download the PDF. Deliberately not a suite. A broad
 * end-to-end suite is slow, flaky in ways that have nothing to do with the code,
 * and gets muted within a month — at which point it is worse than nothing,
 * because its green tick is trusted and means nothing.
 *
 * What earns its place is the class of bug unit tests structurally cannot see.
 * Every serious frontend failure in this project has been one: a login step that
 * did not exist, a dropdown with no options that could not be submitted, a
 * dialog that dismissed itself when the mouse moved toward its button, a form
 * that silently sent a field the server had started refusing. Each individual
 * component was fine. The *app* was broken.
 *
 * Not wired into `npm run check`, and that is deliberate: it needs a running API
 * and a database, so making the ordinary lint-and-build gate depend on them
 * would mean the gate fails on a laptop with nothing started. Run it with
 * `npm run test:e2e` against a local stack, or in a deploy check.
 */
export default defineConfig({
  testDir: './e2e',
  // Generous: this drives a real browser against a real API, and a timeout tuned
  // to a fast machine is the single commonest source of end-to-end flake.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
    viewport: { width: 1440, height: 950 },
    // Kept only for a failure. Screenshots of passing runs are noise nobody
    // opens, and a directory that fills up is one people delete wholesale.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
});
