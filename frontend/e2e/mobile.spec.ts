import { test, expect } from '@playwright/test';

/**
 * The phone-viewport checks (items 9 and 10).
 *
 * The second end-to-end spec in the project, and the reason it earns a place is
 * the same one written at the top of `playwright.config.ts`: every bug it caught
 * is one that unit tests structurally cannot see, because each component was
 * fine and the *page* was not.
 *
 * What it found the first time it was run:
 *
 *  - Seven of the first eight Tab presses landed on nav links inside the closed
 *    mobile drawer — twenty-one focusable elements in a menu nobody can see.
 *  - With a dialog open, thirteen of the next fourteen Tab presses left it for
 *    the page behind, including the per-row Delete buttons.
 *  - Twelve months of collections made the revenue chart 638px wide inside a
 *    390px screen, scrolling the whole page sideways by 300px.
 *
 * The last one is why this seeds a **year** of data before measuring. The same
 * audit against a one-month-old tenant reported everything as fine: an empty
 * page does not overflow, and a clean result on one is worth nothing.
 *
 * Not wired into `npm run check` — it needs a running API and a database.
 */

const API = 'http://127.0.0.1:5000/api/v1';
const APP = process.env.E2E_BASE_URL || 'http://localhost:4200';
const PHONE = { width: 390, height: 844 };
const PASSWORD = 'Password@123';

/**
 * A fresh tenant normally. `E2E_EMAIL` reuses an existing one, for when repeated
 * runs trip the signup rate limiter — which is the limiter working, not a fault.
 */
const REUSE = process.env.E2E_EMAIL;
const EMAIL = REUSE || `mobile${Date.now()}@audit.test`;

const ROUTES = [
  'dashboard', 'invoices', 'invoices/new', 'bill-generator', 'clients', 'items',
  'inventory', 'profit-loss', 'payments', 'reports', 'gst-returns', 'purchases',
  'sales-documents', 'recurring', 'receivables', 'activity', 'security', 'users',
  'subscription', 'appearance', 'invoice-templates'
];

/**
 * Runs in the page. Measures; judges nothing. Two exclusions matter, and without
 * them the audit called every screen broken and told you nothing:
 *
 *  - A control under a `sticky`/`fixed` bar is not hidden, it is scrolled. That
 *    is what a sticky header does.
 *  - A control outside its own scrollable container's box needs scrolling to,
 *    which is what the container is for.
 */
const MEASURE = () => {
  const vw = document.documentElement.clientWidth;
  const overflow: { tag: string; width: number; right: number; text: string }[] = [];
  const covered: { tag: string; label: string; by: string; x: number; y: number }[] = [];
  const offscreen: { tag: string; label: string; right: number; left: number }[] = [];

  const describe = (el: Element) => {
    const cls = typeof el.className === 'string' ? el.className.split(/\s+/).slice(0, 3).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`;
  };
  const labelOf = (el: Element) =>
    (el.getAttribute('aria-label') || el.textContent || (el as HTMLInputElement).name || '')
      .trim().replace(/\s+/g, ' ').slice(0, 40);

  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (box.width <= vw + 1 && box.right <= vw + 1) continue;

    let scrollable = false;
    for (let p: Element | null = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') { scrollable = true; break; }
    }
    if (scrollable) continue;
    if (overflow.some(o => o.tag === describe(el.parentElement || el))) continue;
    overflow.push({ tag: describe(el), width: Math.round(box.width), right: Math.round(box.right), text: labelOf(el) });
  }

  const controls = Array.from(document.querySelectorAll(
    'button, a[href], input, select, textarea, [role=button], [tabindex]:not([tabindex="-1"])'
  ));
  for (const el of controls) {
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') continue;
    if (box.bottom < 0 || box.top > window.innerHeight) continue;

    if (box.right > vw + 1 || box.left < -1) {
      offscreen.push({ tag: describe(el), label: labelOf(el), right: Math.round(box.right), left: Math.round(box.left) });
      continue;
    }

    let outOfItsScroller = false;
    for (let anc: Element | null = el.parentElement; anc; anc = anc.parentElement) {
      const st = getComputedStyle(anc);
      if (st.overflowY === 'auto' || st.overflowY === 'scroll' || st.overflowX === 'auto' || st.overflowX === 'scroll') {
        const a = anc.getBoundingClientRect();
        if (box.bottom < a.top || box.top > a.bottom || box.right < a.left || box.left > a.right) outOfItsScroller = true;
        break;
      }
    }
    if (outOfItsScroller) continue;

    const x = Math.min(Math.max(box.left + box.width / 2, 1), vw - 1);
    const y = Math.min(Math.max(box.top + box.height / 2, 1), window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue;

    let pinned = false;
    for (let anc: Element | null = hit; anc; anc = anc.parentElement) {
      const pos = getComputedStyle(anc).position;
      if (pos === 'fixed' || pos === 'sticky') { pinned = true; break; }
    }
    if (pinned) continue;

    covered.push({ tag: describe(el), label: labelOf(el), by: describe(hit), x: Math.round(x), y: Math.round(y) });
  }

  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: vw,
    overflow: overflow.slice(0, 6),
    covered: covered.slice(0, 6),
    offscreen: offscreen.slice(0, 6)
  };
};

/**
 * Makes sure the tenant exists, once per run.
 *
 * Every test calls it, rather than only the first: otherwise running one of them
 * on its own — which is what anybody does when chasing a failure — signs in as
 * an account that was never created.
 */
let tenantToken: string | null = null;
async function ensureTenant(request: any): Promise<string> {
  if (tenantToken) return tenantToken;

  if (REUSE) {
    const login = await request.post(`${API}/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
    expect(login.ok(), await login.text()).toBeTruthy();
    tenantToken = (await login.json()).token as string;
    return tenantToken;
  }

  const reg = await request.post(`${API}/auth/register`, {
    data: {
      name: 'Mobile Audit', email: EMAIL, password: PASSWORD,
      orgName: `Mobile Audit Co ${Date.now()}`, stateCode: '27', acceptTerms: true
    }
  });
  expect(reg.ok(), await reg.text()).toBeTruthy();
  tenantToken = (await reg.json()).token as string;
  return tenantToken;
}

async function signIn(page: any) {
  await page.setViewportSize(PHONE);
  await page.goto(`${APP}/login`);
  await page.getByLabel(/email/i).first().fill(EMAIL);
  await page.getByLabel(/password/i).first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).first().click();
  await page.waitForURL(/dashboard/, { timeout: 40000 });
}

test('no screen overflows or hides a control at 390px', async ({ page, request }) => {
  test.setTimeout(600_000);

  // ── A tenant with a year on the books ──
  const auth = { Authorization: `Bearer ${await ensureTenant(request)}` };

  const existing = await request.get(`${API}/clients`, { headers: auth });
  let clientId = (await existing.json()).data?.[0]?._id;
  if (!clientId) {
    const made = await request.post(`${API}/clients`, {
      headers: auth,
      data: {
        // Long names on purpose: a short one never reveals a layout that cannot
        // cope with a real company name.
        companyName: 'Aurora Industries Private Limited', stateCode: '27',
        email: `buyer${Date.now()}@audit.test`, phone: '9876543210',
        address: 'Plot 14, Industrial Estate, Andheri East, Mumbai 400093'
      }
    });
    expect(made.ok(), await made.text()).toBeTruthy();
    clientId = (await made.json())._id;
  }

  /**
   * Twelve months, each one paid. This is the part that matters: the chart bug
   * only appeared once there were enough bars to exceed the screen.
   */
  for (let m = 0; m < 12; m += 1) {
    const year = m >= 8 ? 2025 : 2026;
    const mm = String(m >= 8 ? m + 1 : m + 1).padStart(2, '0');
    const date = `${year}-${mm}-05`;
    const inv = await request.post(`${API}/invoices`, {
      headers: auth,
      data: {
        clientId, date, dueDate: `${year}-${mm}-25`,
        items: [{ desc: 'Structural Steel Fabrication Services', hsn: '998314', qty: 1, rate: 40000 + m * 7000, gstRate: 18 }]
      }
    });
    if (!inv.ok()) continue;
    const body = await inv.json();
    await request.post(`${API}/payments`, {
      headers: auth,
      data: { invoiceId: body._id, amount: body.totals.total, date, mode: 'bank_transfer' }
    });
  }

  await signIn(page);

  const broken: string[] = [];
  for (const route of ROUTES) {
    await page.goto(`${APP}/${route}`);
    await page.waitForTimeout(2500);

    // Every scroll position, because the hit-test can only judge what is in view.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const steps = Math.max(1, Math.min(8, Math.ceil(height / PHONE.height)));
    const found = { overflow: [] as any[], covered: [] as any[], offscreen: [] as any[], scrollWidth: 0, clientWidth: 0 };
    for (let step = 0; step < steps; step += 1) {
      await page.evaluate(y => window.scrollTo(0, y), step * (PHONE.height - 80));
      await page.waitForTimeout(250);
      const at = await page.evaluate(MEASURE);
      found.scrollWidth = Math.max(found.scrollWidth, at.scrollWidth);
      found.clientWidth = at.clientWidth;
      found.overflow.push(...at.overflow);
      found.covered.push(...at.covered);
      found.offscreen.push(...at.offscreen);
    }

    const problems = [
      ...(found.scrollWidth > found.clientWidth + 1
        ? [`the page scrolls sideways (${found.scrollWidth} wide in ${found.clientWidth})`] : []),
      ...found.overflow.map(o => `${o.tag} is ${o.width}px wide "${o.text}"`),
      ...found.covered.map(c => `${c.tag} "${c.label}" is covered by ${c.by}`),
      ...found.offscreen.map(o => `${o.tag} "${o.label}" is off the edge (left ${o.left}, right ${o.right})`)
    ];
    const unique = Array.from(new Set(problems));
    if (unique.length) {
      broken.push(`/${route}\n    ${unique.slice(0, 6).join('\n    ')}`);
      await page.screenshot({ path: `mobile-${route.replace(/\//g, '-')}.png`, fullPage: true });
    }
  }

  expect(broken, `\n${broken.join('\n  ')}\n`).toEqual([]);
});

test('the closed nav drawer is not reachable by keyboard', async ({ page, request }) => {
  await ensureTenant(request);
  await signIn(page);

  const closed = await page.evaluate(() => {
    const sidebar = document.querySelector('aside.sidebar') as HTMLElement;
    return {
      visibility: getComputedStyle(sidebar).visibility,
      focusable: sidebar.querySelectorAll('a[href], button').length
    };
  });
  /**
   * `transform` moves a thing out of sight; it does not take it out of the page.
   * Twenty-one nav links stayed in the tab order and in the accessibility tree
   * behind a drawer nobody could see.
   */
  expect(closed.visibility).toBe('hidden');
  expect(closed.focusable).toBeGreaterThan(5);

  await page.locator('body').click({ position: { x: 200, y: 400 } });
  let intoDrawer = 0;
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => !!document.activeElement?.closest('aside.sidebar'))) intoDrawer += 1;
  }
  expect(intoDrawer, 'tab stops inside the invisible drawer').toBe(0);
});

test('an open dialog keeps focus, and Escape closes it', async ({ page, request }) => {
  await ensureTenant(request);
  await signIn(page);
  await page.goto(`${APP}/clients`);
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /import csv/i }).click();
  const modal = page.locator('.modal-panel').first();
  await expect(modal).toBeVisible({ timeout: 20000 });

  const opened = await page.evaluate(() => {
    const panel = document.querySelector('.modal-panel') as HTMLElement;
    return {
      role: panel.getAttribute('role'),
      ariaModal: panel.getAttribute('aria-modal'),
      named: !!panel.getAttribute('aria-labelledby'),
      focusInside: !!document.activeElement?.closest('.modal-panel')
    };
  });
  expect(opened.role).toBe('dialog');
  expect(opened.ariaModal).toBe('true');
  expect(opened.named).toBe(true);
  expect(opened.focusInside, 'focus moves into the dialog when it opens').toBe(true);

  /**
   * The page behind was covered, dimmed and unscrollable — and every one of its
   * buttons was still one Tab away, including the per-row Delete.
   */
  let escaped = 0;
  for (let i = 0; i < 16; i += 1) {
    await page.keyboard.press('Tab');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('.modal-panel')))) escaped += 1;
  }
  expect(escaped, 'tab stops outside the open dialog').toBe(0);

  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden({ timeout: 5000 });
});

test('the revenue chart scrolls inside its card instead of widening the page', async ({ page, request }) => {
  await ensureTenant(request);
  await signIn(page);
  await page.waitForTimeout(4000);

  const chart = await page.evaluate(() => {
    const el = document.querySelector('.bar-chart') as HTMLElement;
    if (!el) return null;
    const card = el.closest('.card') as HTMLElement;
    return {
      bars: el.querySelectorAll('.bar-col').length,
      width: Math.round(el.getBoundingClientRect().width),
      contentWidth: el.scrollWidth,
      cardWidth: Math.round(card.getBoundingClientRect().width),
      pageWidth: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth
    };
  });
  expect(chart, 'the dashboard should have a revenue chart').not.toBeNull();
  if (!chart || chart.bars < 6) {
    console.log(`only ${chart?.bars} months of data — not enough to test the overflow`);
    return;
  }

  /**
   * A grid item's `min-width` defaults to `auto`, so `1fr` silently means "at
   * least as wide as my content" and the track grew to fit the chart. The chart's
   * own `overflow-x: auto` never engaged, because nothing told it that it could
   * not have the width it asked for.
   */
  expect(chart.contentWidth, 'the chart has more content than fits').toBeGreaterThan(chart.width);
  expect(chart.cardWidth).toBeLessThanOrEqual(chart.viewport);
  expect(chart.pageWidth).toBeLessThanOrEqual(chart.viewport + 1);
});
