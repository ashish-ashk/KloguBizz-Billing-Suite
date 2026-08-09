import { defineConfig } from 'vitest/config';

/**
 * Frontend unit tests (#59's frontend half).
 *
 * **Vitest rather than Karma**, and the reason is what gets tested. Karma runs a
 * real browser, which is the right tool for testing components — and components
 * are not where this codebase's expensive bugs live. The ones that have actually
 * cost time here were in pure logic: a stale-response guard that let an old
 * request overwrite a newer one, a template id map, currency and GSTIN
 * formatting. None of that needs a browser, and a suite that needs one is a
 * suite that is slow enough to stop being run.
 *
 * The genuinely browser-shaped failures this project has hit — a login step that
 * did not exist, an empty dropdown that could not be submitted, a dialog that
 * dismissed itself when you moved the mouse toward its button — are all *whole
 * page* failures. A component unit test would have caught none of them, because
 * each component was individually fine. Those belong in the Playwright smoke
 * test (`e2e/smoke.spec.ts`), which drives the real app.
 *
 * So: fast unit tests for logic, one end-to-end test for the app, and no
 * component-level middle layer that would cost the most and catch the least.
 */
export default defineConfig({
  test: {
    // Node, not jsdom. Nothing under test touches the DOM; adding jsdom would
    // slow every run to serve code that does not exist yet.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Playwright specs live in e2e/ and are run by their own command — they need
    // a server, and sweeping them into the unit run would make `npm test`
    // fail on a developer machine with nothing running.
    exclude: ['e2e/**', 'node_modules/**'],
    reporters: ['default']
  }
});
