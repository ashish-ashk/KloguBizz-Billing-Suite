#!/usr/bin/env node
/**
 * Builds `docs/user-guide.html` from the screenshots in `frontend/guide-shots`.
 *
 * ── How to regenerate the guide ─────────────────────────────────────────
 *
 *   1. Start the API and the frontend locally.
 *   2. Seed the demo tenant:   npx playwright test e2e/guide-seed.spec.ts
 *   3. Take the screenshots:   npx playwright test e2e/guide-shots.spec.ts
 *   4. Build this page:        node docs/build-user-guide.js
 *
 * Do that whenever a screen in one of the steps changes. A guide whose pictures
 * no longer match the product is worse than no pictures, because the reader
 * trusts them and then cannot find the button.
 *
 * Every image is embedded as a data URI, so the file is one self-contained page:
 * it works from disk, from an email attachment and from a shared link, with no
 * image folder to lose alongside it. That is also why the screenshots are
 * captured at 1000px rather than full desktop width — the whole page is about
 * 3MB, and most of that is pictures.
 *
 * Node only, deliberately: this repo has one toolchain and adding an image
 * library or a second language to build a document is not worth it.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'frontend', 'guide-shots');
const OUT = path.join(ROOT, 'docs', 'user-guide.html');

function dataUri(name) {
  const file = path.join(SHOTS, name);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Missing screenshot ${name}. Run "npx playwright test e2e/guide-shots.spec.ts" from frontend/ first.`
    );
  }
  return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
}

const shot = (name, caption, phone = false) =>
  `<figure class="shot${phone ? ' phone' : ''}">`
  + `<img src="${dataUri(name)}" alt="${caption}" loading="lazy">`
  + `<figcaption>${caption}</figcaption></figure>`;

const NOTE_LABEL = { tip: 'Tip', warn: 'Careful', why: 'Why it matters' };

function step(n, title, body, shots = '', note = null, kind = 'tip') {
  const noteHtml = note
    ? `<div class="note ${kind}"><span class="note-label">${NOTE_LABEL[kind]}</span><p>${note}</p></div>`
    : '';
  return `
    <section class="step" id="step-${n}">
      <div class="step-n" aria-hidden="true">${n}</div>
      <div class="step-body">
        <h3>${title}</h3>
        ${body}
        ${noteHtml}
        ${shots}
      </div>
    </section>`;
}

const PARTS = [
  ['A', 'Set up — do this once', [
    step(1, 'Create your account',
      `<ol class="do">
         <li>Go to the sign-up page.</li>
         <li>Type your name, your business name and your email.</li>
         <li>Pick your <strong>state</strong> from the list.</li>
         <li>Choose a password and press <strong>Create Account</strong>.</li>
       </ol>
       <p>You get 14 days free. No card.</p>`,
      shot('01-signup.png', 'The sign-up page. Only five things to fill in.'),
      'Pick the state your business is registered in, not where your customer is. '
      + 'This decides the tax on every bill you make.', 'why'),

    step(2, 'Fill in your business details',
      `<p>Open <strong>Business Profile</strong> from the left menu.</p>
       <ol class="do">
         <li>Type your <strong>GSTIN</strong>. The page checks it as you type.</li>
         <li>Type your full <strong>address</strong>.</li>
         <li>Add your phone number.</li>
         <li>Press <strong>Save Changes</strong>.</li>
       </ol>`,
      shot('03-business.png', 'Business Profile. The green line under the GSTIN means it is a real one.'),
      'Do not skip this. A bill without your GSTIN and address is <strong>not a valid tax invoice</strong>. '
      + 'Your customer cannot claim input credit on it, and they will only find out months later.', 'warn'),

    step(3, 'Set your own bill numbers',
      `<p>Open <strong>Invoice Templates</strong> and scroll down to <strong>Document Numbering</strong>.</p>
       <ol class="do">
         <li>Change the prefix to your own initials — for example <span class="mono">AST</span>.</li>
         <li>Look at the grey line under it. That is the next number you will get.</li>
         <li>Press <strong>Save numbering</strong>.</li>
       </ol>
       <p>Moving from another software? Put your last number plus one into
          <strong>Next invoice number</strong>.</p>`,
      shot('04-numbering.png', 'All five document types. Each one keeps its own count.'),
      'Numbers only move forward, never back. Two bills with the same number cannot be undone, '
      + 'so the app will not let it happen.', 'why'),

    step(4, 'Make the bill look like yours',
      `<p>Stay on <strong>Invoice Templates</strong>.</p>
       <ol class="do">
         <li>Upload your <strong>logo</strong>.</li>
         <li>Upload your <strong>signature</strong> — it prints above the signature line.</li>
         <li>Fill in your <strong>bank details</strong> so customers know where to pay.</li>
         <li>Pick a <strong>colour</strong> and a <strong>design</strong>.</li>
         <li>Press <strong>Save Template</strong>.</li>
       </ol>
       <p>The picture on the right changes as you go. What you see there is what your customer gets.</p>`,
      shot('05-templates.png', 'Settings on the left, a live bill on the right.'))
  ]],

  ['B', 'Add your customers and what you sell', [
    step(5, 'Add one customer',
      `<p>Open <strong>Clients</strong> and press <strong>+ Add Client</strong>.</p>
       <ol class="do">
         <li>Type the customer name.</li>
         <li>Type their <strong>GSTIN</strong> if they have one.</li>
         <li>Pick their <strong>state</strong>.</li>
         <li>Add email, phone and address.</li>
         <li>Press <strong>Save</strong>.</li>
       </ol>`,
      shot('07-add-client.png', 'Adding a customer. GSTIN and state are the two that matter.'),
      'Their state is what decides <span class="mono">CGST + SGST</span> (same state as you) or '
      + '<span class="mono">IGST</span> (any other state). Get it right once here and every bill to them is right.',
      'why'),

    step(6, 'Add all your customers at once',
      `<p>Have a list in Excel, or an export from your old software? Do not type them one by one.</p>
       <ol class="do">
         <li>On <strong>Clients</strong>, press <strong>Import CSV</strong>.</li>
         <li>Press <strong>Download CSV Template</strong>.</li>
         <li>Fill it in — one customer per row. Only the name is required.</li>
         <li>Save it as CSV, press <strong>Choose File</strong>, then <strong>Upload &amp; Add Customers</strong>.</li>
       </ol>
       <p>Good rows go in even if some rows have mistakes. Anything it could not add is listed underneath
          with its row number, so you fix only those.</p>`,
      shot('08-import-csv.png', 'The import window. Three steps, and the rules are written on it.'),
      'For <strong>State</strong> you can write the name (<span class="mono">Maharashtra</span>) or the '
      + 'number (<span class="mono">27</span>). If you fill in the GSTIN you can leave State empty — '
      + 'the first two digits of a GSTIN <em>are</em> the state.', 'tip'),

    step(7, 'Add what you sell',
      `<p>Open <strong>Items</strong> and press <strong>+ Add Item</strong>.</p>
       <ol class="do">
         <li>Name it.</li>
         <li>Choose <strong>Goods</strong> or <strong>Service</strong>.</li>
         <li>Type the <strong>HSN</strong> code (goods) or <strong>SAC</strong> code (service).</li>
         <li>Type the price and the <strong>GST rate</strong>.</li>
         <li>Press <strong>Save</strong>.</li>
       </ol>
       <p>Now you can pick it on a bill instead of typing it out every time.</p>`,
      shot('09-items.png', 'Your item list. Price, HSN and GST fill themselves in on a bill.'),
      'Items have a bulk upload too, on the same page. Same idea as customers.', 'tip')
  ]],

  ['C', 'Every day', [
    step(8, 'Make a bill',
      `<p>Press <strong>+ New Invoice</strong> from anywhere.</p>
       <ol class="do">
         <li>Pick the <strong>customer</strong>. Their details appear underneath.</li>
         <li>Pick an <strong>item</strong> on the first line. Price, HSN and GST fill in by themselves.</li>
         <li>Type the <strong>quantity</strong>.</li>
         <li>Press <strong>+ Add item</strong> for each extra line.</li>
         <li>Check the <strong>total</strong> on the right, then press <strong>Save Invoice</strong>.</li>
       </ol>
       <p>The bill number is made for you when you save.</p>`,
      shot('11-new-invoice-filled.png',
        'Making a bill. The green box confirms CGST + SGST, because this customer is in the same state.'),
      'You never choose the tax. Read the green box — it says which tax was applied and why. If it says '
      + 'something you did not expect, check the customer&rsquo;s state.', 'why'),

    step(9, 'Look at the finished bill',
      `<p>From the invoice list, press <strong>View</strong> on any bill.</p>
       <p>From there you can <strong>Download PDF</strong>, <strong>Print</strong>, or
          <strong>Email</strong> it straight to the customer.</p>`,
      shot('13-invoice-document.png',
        'A finished bill: your details at the top, theirs below, the tax split, and your signature.')),

    step(10, 'Write down a payment',
      `<p>When money comes in, tell the app.</p>
       <ol class="do">
         <li>Open <strong>Payments</strong> and press <strong>+ Record Payment</strong>.</li>
         <li>Pick the bill it is against.</li>
         <li>Type the amount, the date, and how it came (bank, cash, UPI).</li>
         <li>Press <strong>Save</strong>.</li>
       </ol>
       <p>Part payments are fine. The bill then shows how much is still due.</p>`,
      shot('14-payments.png', 'Payments received. Each one is linked to its bill.')),

    step(11, 'See who has not paid',
      `<p>Open <strong>Invoices</strong>. The label beside each one tells you where it stands:</p>
       <ul class="plain">
         <li><span class="chip paid">Paid</span> money received in full</li>
         <li><span class="chip partial">Partial</span> some money received</li>
         <li><span class="chip pending">Pending</span> not due yet</li>
         <li><span class="chip overdue">Overdue</span> past the due date</li>
       </ul>
       <p>Use the search box to find any bill by number, customer or amount.</p>`,
      shot('12-invoice-list.png', 'Your bills, newest first.')),

    step(12, 'Check your dashboard',
      `<p>This is the first screen you see. In one look:</p>
       <ul class="plain">
         <li>how much you have <strong>collected</strong>;</li>
         <li>how much is <strong>still to come</strong>;</li>
         <li>how much is <strong>overdue</strong> — chase these first;</li>
         <li>which months were good, and who your biggest customers are.</li>
       </ul>`,
      shot('02-dashboard.png', 'The dashboard. Four numbers, then the detail underneath.'))
  ]],

  ['D', 'At GST time', [
    step(13, 'Your GST returns',
      `<p>Open <strong>GST Returns</strong> and choose the month.</p>
       <p>Everything is worked out from the bills you already made — you do not type anything in again.
          You get <strong>GSTR-1</strong>, <strong>GSTR-3B</strong> and the <strong>HSN summary</strong>,
          and you can download each one.</p>`,
      shot('15-gst-returns.png', 'GSTR-1 for the month, built from your bills.'),
      'Look at this before the filing date, not on it. If a number looks wrong, the bill behind it can '
      + 'still be fixed.', 'tip'),

    step(14, 'Reports',
      `<p>Open <strong>Reports</strong> for sales by customer, by item and by month, and for the money
          still owed to you. Every report has a <strong>Download</strong> button, so your accountant gets
          a spreadsheet instead of a screenshot.</p>`,
      shot('16-reports.png', 'Reports. Pick a date range and download.'))
  ]],

  ['E', 'On your phone', [
    step(15, 'Put it on your home screen',
      `<p>It works like an app, and there is nothing to install from a store.</p>
       <ol class="do">
         <li>Open the site in your phone browser.</li>
         <li><strong>Android:</strong> menu <span class="mono">&#8942;</span> &rarr; <strong>Add to Home screen</strong>.</li>
         <li><strong>iPhone:</strong> the Share button &rarr; <strong>Add to Home Screen</strong>.</li>
       </ol>
       <p>Now it opens full screen from your home screen, like any other app.
          Tap <span class="mono">&#9776;</span> at the top left for the menu.</p>`,
      shot('17-phone-dashboard.png', 'The dashboard on a phone.', true)
      + shot('18-phone-menu.png', 'Tap the ☰ button for the menu.', true))
  ]]
];

// Contents, built from the steps rather than written twice — a list that can
// drift out of step with the thing it lists is a list nobody trusts.
const contents = PARTS.map(([, title, steps]) => {
  const items = steps.map(s => {
    const n = s.split('id="step-')[1].split('"')[0];
    const heading = s.split('<h3>')[1].split('</h3>')[0];
    return `<li><a href="#step-${n}"><span class="toc-n">${n}</span>${heading}</a></li>`;
  }).join('');
  return `<div class="toc-part"><div class="toc-part-h">${title}</div><ol class="toc-list">${items}</ol></div>`;
}).join('');

const body = PARTS.map(([letter, title, steps]) =>
  `<div class="part"><div class="part-h"><span class="part-letter">${letter}</span><h2>${title}</h2></div>`
  + steps.join('') + '</div>').join('');

const html = `<title>KloguBizz Step by Step</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
  /* A workbook, not a brochure: the screenshots are the content and the type
     stays out of their way. Neutrals lean very slightly toward the indigo, so
     the greys read as chosen rather than as the browser's default. */
  :root {
    --ink:       #1A1F2E;
    --ink-2:     #3D4459;
    --muted:     #626A80;
    --faint:     #8C93A8;
    --paper:     #FFFFFF;
    --paper-2:   #F5F6FA;
    --rule:      #E1E4ED;
    --rule-2:    #CDD2E0;

    --brand:     #4F46E5;
    --brand-ink: #372FBE;
    --brand-wash:#EEEDFC;

    --warn:      #B45309;
    --warn-wash: #FEF4E4;
    --why:       #0E7490;
    --why-wash:  #E4F2F6;

    --shadow: 0 1px 2px rgba(26, 31, 46, .05), 0 10px 26px rgba(26, 31, 46, .07);
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ink: #EDEFF6; --ink-2: #C3C8D8; --muted: #9AA1B5; --faint: #757C92;
      --paper: #12161F; --paper-2: #1A1F2B; --rule: #2A3040; --rule-2: #3A4256;
      --brand: #8B84F7; --brand-ink: #B4AEFB; --brand-wash: #221F45;
      --warn: #FBBF24; --warn-wash: #2E2412; --why: #4FB6CE; --why-wash: #11303A;
      --shadow: 0 1px 2px rgba(0,0,0,.4), 0 10px 26px rgba(0,0,0,.42);
    }
  }
  :root[data-theme="dark"] {
    --ink: #EDEFF6; --ink-2: #C3C8D8; --muted: #9AA1B5; --faint: #757C92;
    --paper: #12161F; --paper-2: #1A1F2B; --rule: #2A3040; --rule-2: #3A4256;
    --brand: #8B84F7; --brand-ink: #B4AEFB; --brand-wash: #221F45;
    --warn: #FBBF24; --warn-wash: #2E2412; --why: #4FB6CE; --why-wash: #11303A;
    --shadow: 0 1px 2px rgba(0,0,0,.4), 0 10px 26px rgba(0,0,0,.42);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--paper-2);
    color: var(--ink);
    font-family: "Public Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-size: 16.5px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3 {
    font-family: Sora, ui-sans-serif, system-ui, sans-serif;
    text-wrap: balance; margin: 0; letter-spacing: -0.015em;
  }

  .mono {
    font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: .93em;
    background: var(--brand-wash); color: var(--brand-ink);
    padding: 1px 5px; border-radius: 4px;
  }

  a { color: var(--brand); }
  :focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; border-radius: 4px; }

  .top {
    background: var(--paper); border-bottom: 1px solid var(--rule);
    padding: clamp(34px, 6vw, 60px) clamp(18px, 5vw, 56px);
  }
  .top-inner { max-width: 1180px; margin: 0 auto; }
  .brand { display: inline-flex; align-items: center; gap: 11px; margin-bottom: 26px; }
  .brand-tile {
    width: 34px; height: 34px; border-radius: 9px; background: var(--brand); color: #fff;
    display: grid; place-items: center; font-weight: 700; font-family: Sora, sans-serif; font-size: 15px;
  }
  .brand-name { font-weight: 700; font-size: 16.5px; }
  .brand-sub { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--faint); }
  .top h1 { font-size: clamp(30px, 4.6vw, 46px); font-weight: 700; max-width: 24ch; }
  .top p { max-width: 60ch; margin: 16px 0 0; font-size: clamp(16px, 1.5vw, 18px); color: var(--muted); }
  .top-facts {
    display: flex; flex-wrap: wrap; gap: 10px 24px;
    margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--rule);
    font-size: 14px; color: var(--muted);
  }
  .top-facts b { color: var(--ink); }

  .wrap {
    max-width: 1180px; margin: 0 auto;
    padding: clamp(24px, 4vw, 46px) clamp(18px, 5vw, 56px) 80px;
    display: grid; grid-template-columns: 258px minmax(0, 1fr); gap: clamp(24px, 4vw, 52px);
    align-items: start;
  }
  .toc { position: sticky; top: 22px; }
  .toc-h {
    font-size: 11px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase;
    color: var(--faint); margin-bottom: 14px;
  }
  .toc-part { margin-bottom: 18px; }
  .toc-part-h { font-size: 13px; font-weight: 700; margin-bottom: 6px; font-family: Sora, sans-serif; }
  .toc-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .toc-list a {
    display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 6px;
    text-decoration: none; color: var(--muted); font-size: 13.5px;
    padding: 3px 6px; border-radius: 6px;
  }
  .toc-list a:hover { background: var(--brand-wash); color: var(--brand-ink); }
  .toc-n { font-family: "IBM Plex Mono", monospace; font-size: 11.5px; color: var(--faint); padding-top: 2px; }

  .part { margin-bottom: clamp(34px, 5vw, 58px); }
  .part-h { display: flex; align-items: center; gap: 13px; margin-bottom: 22px; }
  .part-letter {
    width: 30px; height: 30px; border-radius: 8px; flex: none;
    background: var(--ink); color: var(--paper);
    display: grid; place-items: center;
    font-family: Sora, sans-serif; font-weight: 700; font-size: 14px;
  }
  .part-h h2 { font-size: clamp(21px, 2.4vw, 27px); font-weight: 700; }

  .step {
    background: var(--paper); border: 1px solid var(--rule); border-radius: 14px;
    box-shadow: var(--shadow); padding: clamp(20px, 2.6vw, 30px); margin-bottom: 16px;
    display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: clamp(14px, 2vw, 22px);
    scroll-margin-top: 20px;
  }
  .step-n {
    width: 40px; height: 40px; border-radius: 11px;
    border: 2px solid var(--brand); color: var(--brand);
    display: grid; place-items: center;
    font-family: Sora, sans-serif; font-weight: 700; font-size: 17px;
  }
  .step-body { min-width: 0; }
  .step h3 { font-size: clamp(18px, 2vw, 21px); font-weight: 600; margin-bottom: 10px; }
  .step p { margin: 0 0 12px; color: var(--ink-2); max-width: 68ch; }

  /*
    The step number is positioned, not a grid column.

    \`display: grid\` on the <li> made every *element* inside it a grid item, so a
    <strong> in the middle of a sentence became its own row — "Pick your" and
    then "state" on the next line. Grid items are per child, and inline emphasis
    is a child.
  */
  ol.do { margin: 0 0 14px; padding-left: 0; list-style: none; counter-reset: do; max-width: 68ch; }
  ol.do li { counter-increment: do; position: relative; padding: 5px 0 5px 34px; color: var(--ink-2); }
  ol.do li::before {
    content: counter(do);
    position: absolute; left: 0; top: 7px;
    font-family: "IBM Plex Mono", monospace; font-size: 12px; font-weight: 500;
    background: var(--paper-2); color: var(--muted);
    border-radius: 6px; width: 22px; height: 22px;
    display: grid; place-items: center;
  }
  ul.plain { margin: 0 0 14px; padding-left: 20px; color: var(--ink-2); max-width: 68ch; }
  ul.plain li { padding: 3px 0; }

  .chip { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 2px 9px; border-radius: 20px; margin-right: 5px; }
  .chip.paid { background: #DCFCE7; color: #15803D; }
  .chip.partial { background: #DBEAFE; color: #1D4ED8; }
  .chip.pending { background: #FEF3C7; color: #92400E; }
  .chip.overdue { background: #FEE2E2; color: #B91C1C; }

  .note {
    display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 11px; align-items: start;
    padding: 13px 15px; border-radius: 10px; margin: 0 0 16px; max-width: 74ch;
  }
  .note p { margin: 0; font-size: 14.5px; }
  .note-label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 5px; white-space: nowrap; margin-top: 1px;
  }
  .note.tip { background: var(--brand-wash); }
  .note.tip .note-label { background: var(--brand); color: #fff; }
  .note.tip p { color: var(--ink-2); }
  .note.warn { background: var(--warn-wash); border: 1px solid var(--warn); }
  .note.warn .note-label { background: var(--warn); color: #fff; }
  .note.why { background: var(--why-wash); }
  .note.why .note-label { background: var(--why); color: #fff; }

  .shot { margin: 0 0 14px; }
  .shot:last-child { margin-bottom: 0; }
  .shot img {
    display: block; width: 100%; height: auto;
    border: 1px solid var(--rule-2); border-radius: 10px; background: var(--paper-2);
  }
  .shot figcaption { margin-top: 8px; font-size: 13px; color: var(--muted); }
  .shot.phone { display: inline-block; width: min(300px, 100%); vertical-align: top; margin-right: 14px; }

  .end {
    background: var(--paper); border: 1px solid var(--rule); border-radius: 14px;
    padding: clamp(22px, 3vw, 32px); box-shadow: var(--shadow);
  }
  .end h2 { font-size: clamp(20px, 2.2vw, 25px); margin-bottom: 10px; }
  .end p { color: var(--ink-2); max-width: 66ch; margin: 0 0 10px; }
  .end p:last-child { margin-bottom: 0; }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }

  @media (max-width: 920px) {
    .wrap { grid-template-columns: minmax(0, 1fr); }
    /* The rail becomes an ordinary block at the top — a sticky contents list on
       a phone eats a third of the screen for the whole document. */
    .toc { position: static; background: var(--paper); border: 1px solid var(--rule); border-radius: 14px; padding: 18px; }
    .step { grid-template-columns: minmax(0, 1fr); gap: 12px; }
    .step-n { width: 34px; height: 34px; font-size: 15px; }
  }
</style>

<header class="top">
  <div class="top-inner">
    <div class="brand">
      <span class="brand-tile" aria-hidden="true">K</span>
      <span>
        <span class="brand-name">Klogu Bizz</span><br>
        <span class="brand-sub">GST Billing Suite</span>
      </span>
    </div>
    <h1>How to use KloguBizz, step by step</h1>
    <p>
      Fifteen steps, in the order you will need them. Every step shows the actual screen,
      so you can match what is in front of you to the picture.
    </p>
    <div class="top-facts">
      <span><b>Steps 1&ndash;4</b> set-up, once</span>
      <span><b>5&ndash;7</b> your customers and products</span>
      <span><b>8&ndash;12</b> every day</span>
      <span><b>13&ndash;14</b> GST time</span>
      <span><b>15</b> on your phone</span>
    </div>
  </div>
</header>

<div class="wrap">
  <nav class="toc" aria-label="Contents">
    <div class="toc-h">Contents</div>
    ${contents}
  </nav>

  <main>
    ${body}

    <div class="end">
      <h2>That is the whole thing</h2>
      <p>
        Steps 1 to 4 are done once. After that your day is step 8, step 10 and a look at step 12 &mdash;
        make a bill, write down the payment, check what is overdue.
      </p>
      <p>
        Anything you change in Business Profile or Invoice Templates appears on the next bill you make.
        Bills you have already sent stay exactly as they were sent.
      </p>
    </div>
  </main>
</div>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUT)} — ${Math.round(html.length / 1024)}KB, ${(html.match(/data:image\/png/g) || []).length} screenshots embedded.`);
