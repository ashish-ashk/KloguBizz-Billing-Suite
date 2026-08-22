#!/usr/bin/env node
/**
 * Renders the two customer-facing HTML pages to PDF.
 *
 *   node docs/build-pdfs.js
 *
 * Produces `docs/KloguBizz-Sales-Deck.pdf` and `docs/KloguBizz-User-Guide.pdf`.
 * Run it after changing either page — the PDFs are built artefacts, not
 * separately maintained documents, so the HTML stays the single source.
 *
 * Uses the Chromium that Playwright already installed for the end-to-end tests,
 * so there is nothing extra to add. Run from the repo root; it resolves
 * Playwright out of `frontend/node_modules`.
 *
 * ── Three things this has to get right ──────────────────────────────────
 *
 *  - **Light theme, forced.** Both pages follow the reader's OS theme, which is
 *    correct on screen and wrong in a file you send someone. `colorScheme:
 *    'light'` renders the light palette regardless of the machine building it.
 *
 *  - **Backgrounds on.** Chromium omits background colours from a PDF by
 *    default, which would print the sales deck's dark spreads as white pages
 *    with white text on them. `printBackground: true` is not optional here.
 *
 *  - **Lazy images.** The guide's screenshots are `loading="lazy"`, so the ones
 *    below the fold have never been decoded when `page.pdf()` is called and
 *    come out blank. The page is scrolled end to end first, then every image is
 *    awaited on its `decode()`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLAYWRIGHT = path.join(ROOT, 'frontend', 'node_modules', 'playwright');

if (!fs.existsSync(PLAYWRIGHT)) {
  console.error('Playwright not found. Run "npm install" in frontend/ first.');
  process.exit(1);
}
const { chromium } = require(PLAYWRIGHT);

const DOCS = [
  {
    source: 'sales-deck.html',
    output: 'KloguBizz-Sales-Deck.pdf',
    // Landscape: the spreads are two-column bands, and portrait would stack
    // every pair and double the page count.
    pdf: {
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      /**
       * Explicit, because Chromium's printToPDF defaults to 1cm all round.
       * With margins the content box is 277x190mm, so a spread sized to the
       * full 210mm page overflows onto the next sheet — and every page after
       * it drifts, ending in a blank one. `preferCSSPageSize` sets the paper,
       * not the margins.
       */
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    }
  },
  {
    source: 'user-guide.html',
    output: 'KloguBizz-User-Guide.pdf',
    // Portrait, with a footer: fifteen steps is a document somebody refers back
    // to, and "page 9 of 21" is how they find their place again.
    pdf: {
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width:100%;padding:0 13mm;font-family:Arial,sans-serif;font-size:8pt;color:#8C93A8;
                    display:flex;justify-content:space-between;">
          <span>KloguBizz &mdash; how to use it, step by step</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
      margin: { top: '14mm', bottom: '16mm', left: '13mm', right: '13mm' }
    }
  }
];

/** Scrolls the page end to end and waits for every image to finish decoding. */
async function loadEverything(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });

  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images).map(img =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : img.decode().catch(() => undefined)
      )
    )
  );

  // The webfonts, which otherwise render as the fallback stack in the PDF.
  await page.evaluate(() => document.fonts.ready);
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const doc of DOCS) {
      const source = path.join(ROOT, 'docs', doc.source);
      const output = path.join(ROOT, 'docs', doc.output);
      if (!fs.existsSync(source)) {
        throw new Error(`Missing ${doc.source}. For the guide, run "node docs/build-user-guide.js" first.`);
      }

      const page = await browser.newPage({
        colorScheme: 'light',
        viewport: { width: 1240, height: 1754 }
      });
      await page.goto(`file://${source.split(path.sep).join('/')}`, { waitUntil: 'load' });
      await loadEverything(page);
      // Chromium's `page.pdf()` already renders print media; setting it here too
      // means the scroll and decode above happen against the same layout.
      await page.emulateMedia({ media: 'print', colorScheme: 'light' });
      await page.waitForTimeout(600);

      await page.pdf({ path: output, ...doc.pdf });
      await page.close();

      const kb = Math.round(fs.statSync(output).size / 1024);
      console.log(`${doc.output.padEnd(30)} ${String(kb).padStart(5)}KB  (from ${doc.source})`);
    }
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
