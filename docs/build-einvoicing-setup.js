#!/usr/bin/env node
/**
 * Builds `docs/einvoicing-setup.html` — the setup runbook for e-invoicing.
 *
 *   node docs/build-einvoicing-setup.js
 *
 * Two audiences, kept in two parts rather than one interleaved list, because
 * they are two different people doing this on two different days: the operator
 * sets up Render and the NIC registration once, and every tenant afterwards only
 * ever sees Part B. Mixing them would mean a tenant reading past instructions
 * that are not theirs to act on, looking for the four steps that are.
 *
 * Same visual system as `build-user-guide.js` on purpose — same tokens, same
 * card, same numbered step — so the three documents read as one product's
 * paperwork rather than three different templates that happened to be about the
 * same app. The logo is read from `frontend/public`, not copied here, so it
 * cannot drift from the one the app actually uses.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'einvoicing-setup.html');

const LOGO = `data:image/png;base64,${
  fs.readFileSync(path.join(ROOT, 'frontend', 'public', 'klogu-logo.png')).toString('base64')}`;

const NOTE_LABEL = { tip: 'Tip', warn: 'Careful', why: 'Why it matters' };

function step(n, title, body, note = null, kind = 'tip') {
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
      </div>
    </section>`;
}

// ── Part A: the operator, once ──────────────────────────────────────────

const PART_A = [
  step(1, 'Register for API access, on the sandbox first',
    `<ol class="do">
       <li>Go to <span class="mono">einv-apisandbox.nic.in</span> — the free testing environment. Do
           the whole setup here before touching production.</li>
       <li>Find <strong>Registration</strong> (sometimes under "API Registration" or "Sign Up").</li>
       <li>Register using your business's <strong>GSTIN</strong> — the one you will file e-invoices
           for. You will verify it with an OTP to the mobile or email already registered against that
           GSTIN on the GST portal.</li>
       <li>The portal issues four things. Save all four somewhere safe:
         <ul class="plain" style="margin-top:6px">
           <li>A <strong>Client ID</strong></li>
           <li>A <strong>Client Secret</strong></li>
           <li>An <strong>API username</strong>, for that GSTIN</li>
           <li>An <strong>API password</strong>, for that GSTIN</li>
         </ul>
       </li>
     </ol>`,
    'The username and password belong to <strong>one business</strong>, not to the platform. Do not put '
    + 'them in Render — every tenant enters their own under Business Profile → E-Invoicing, later in this '
    + 'guide. Only the Client ID and Client Secret are shared across all tenants.', 'warn'),

  step(2, "Copy the portal's public key",
    `<ol class="do">
       <li>On the same developer portal, open <strong>Authentication</strong> or
           <strong>API Overview</strong>.</li>
       <li>Find the public key — a block of text between
           <span class="mono">-----BEGIN PUBLIC KEY-----</span> and
           <span class="mono">-----END PUBLIC KEY-----</span>, or a downloadable
           <span class="mono">.pem</span> file.</li>
       <li>Copy the whole thing, including the BEGIN/END lines.</li>
     </ol>`,
    "Copy it exactly — don't retype it, don't reformat it. This key encrypts every tenant's password "
    + 'before it leaves the server, and one changed character makes every authentication fail with the '
    + 'same unhelpful error.', 'why'),

  step(3, 'Add four settings to Render',
    `<p>Open Render → your backend service → the <strong>Environment</strong> tab, and add:</p>
     <div class="table-wrap">
       <table class="ref-table">
         <thead><tr><th>Key</th><th>Value</th></tr></thead>
         <tbody>
           <tr><td class="mono">IRP_BASE_URL</td><td><span class="mono">https://einv-apisandbox.nic.in</span> to start</td></tr>
           <tr><td class="mono">IRP_CLIENT_ID</td><td>from Step 1</td></tr>
           <tr><td class="mono">IRP_CLIENT_SECRET</td><td>from Step 1</td></tr>
           <tr><td class="mono">IRP_PUBLIC_KEY</td><td>the whole block from Step 2</td></tr>
         </tbody>
       </table>
     </div>
     <p>Press <strong>Save Changes</strong>. Render redeploys the backend automatically — wait for that
        to finish before moving on.</p>`,
    "If Render's box will not accept the public key as multi-line text, either replace each real line "
    + 'break with <span class="mono">\\n</span> and paste it as one line, or base64-encode the whole '
    + '.pem file and paste that instead — the server accepts both. Try pasting it as-is first; it often '
    + 'just works.', 'tip'),

  step(4, 'Confirm the server picked it up',
    `<p>Once redeployed, sign in as an admin and open <strong>Business Profile → E-Invoicing</strong>.</p>
     <p>If the four settings were read correctly, the warning <em>"E-invoicing is not switched on for
        this server yet"</em> is gone. If it is still there, it names exactly which of the four is
        still missing.</p>`)
];

// ── Part B: every tenant, on their own ──────────────────────────────────

const PART_B = [
  step(5, 'Enter your portal credentials',
    `<ol class="do">
       <li>Open <strong>Business Profile → E-Invoicing</strong>.</li>
       <li>Enter your <strong>GSTIN</strong>, <strong>API username</strong> and
           <strong>API password</strong> — the ones issued to your business in Step 1.</li>
       <li>Leave <strong>Portal</strong> set to <strong>Sandbox</strong> for now.</li>
       <li>Press <strong>Save e-invoicing settings</strong>.</li>
     </ol>`,
    'These are not your login for the app, and not your login for the GST portal — they are the '
    + 'separate API credentials the e-invoice portal issued when you registered.', 'tip'),

  step(6, 'Test the connection',
    `<ol class="do">
       <li>Press <strong>Test connection</strong>.</li>
       <li>It should say <em>"Connected to the sandbox e-invoice portal as &hellip;"</em>.</li>
     </ol>
     <p>If it fails instead, the message names which credential was refused — the username, the
        password, or the GSTIN not matching the account.</p>`,
    'This only checks that your details are correct. It does not report anything to the government — '
    + 'nothing is filed by pressing this button.', 'why'),

  step(7, 'Switch reporting on, and try one invoice',
    `<ol class="do">
       <li>Turn on <strong>Report invoices to the portal</strong> and save again.</li>
       <li>Raise an invoice for a customer who has a GSTIN — e-invoicing only applies to business
           customers, not walk-in retail sales.</li>
       <li>Open it and press <strong>Generate IRN</strong>.</li>
       <li>Check the invoice number, the IRN and a signed QR code now appear on the document.</li>
     </ol>`),

  step(8, 'Move to production',
    `<p>Only once Step 7 has genuinely worked. Production is a separate account from sandbox — nothing
       carries over automatically.</p>
     <ol class="do">
       <li>Repeat Step 1 on the real portal (<span class="mono">einvoice1.gst.gov.in</span>) to get a
           <strong>production</strong> Client ID and Secret.</li>
       <li><em>Platform operator:</em> update <span class="mono">IRP_BASE_URL</span>,
           <span class="mono">IRP_CLIENT_ID</span>, <span class="mono">IRP_CLIENT_SECRET</span> and
           <span class="mono">IRP_PUBLIC_KEY</span> in Render to the production values — the
           production public key is different from the sandbox one.</li>
       <li><em>Each tenant:</em> switch <strong>Portal</strong> from Sandbox to Production, and enter
           the production API password issued for that GSTIN.</li>
     </ol>`,
    "Don't skip the sandbox step to save time. It costs nothing, touches no real GST return, and is the "
    + 'only way to catch a wrong credential before it matters on a document that actually gets filed.', 'warn')
];

const CONTENTS = [['A', 'Set up once — platform operator', PART_A], ['B', 'Every business, on their own', PART_B]]
  .map(([letter, title, steps]) => {
    const items = steps.map(s => {
      const n = s.split('id="step-')[1].split('"')[0];
      const heading = s.split('<h3>')[1].split('</h3>')[0];
      return `<li><a href="#step-${n}"><span class="toc-n">${n}</span>${heading}</a></li>`;
    }).join('');
    return `<div class="toc-part"><div class="toc-part-h">${title}</div><ol class="toc-list">${items}</ol></div>`;
  }).join('');

const BODY = [['A', 'Set up once — platform operator', PART_A], ['B', 'Every business, on their own', PART_B]]
  .map(([letter, title, steps]) =>
    `<div class="part"><div class="part-h"><span class="part-letter">${letter}</span><h2>${title}</h2></div>${steps.join('')}</div>`)
  .join('');

const HTML = `<title>E-Invoicing Setup</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">

<style>
  /* Same system as user-guide.html — one product, one set of paperwork. */
  :root {
    --ink: #1A1F2E; --ink-2: #3D4459; --muted: #626A80; --faint: #8C93A8;
    --paper: #FFFFFF; --paper-2: #F5F6FA; --rule: #E1E4ED; --rule-2: #CDD2E0;
    --brand: #4F46E5; --brand-ink: #372FBE; --brand-wash: #EEEDFC;
    --warn: #B45309; --warn-wash: #FEF4E4; --why: #0E7490; --why-wash: #E4F2F6;
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
    margin: 0; background: var(--paper-2); color: var(--ink);
    font-family: "Public Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-size: 16.5px; line-height: 1.65; -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3 { font-family: Sora, ui-sans-serif, system-ui, sans-serif; text-wrap: balance; margin: 0; letter-spacing: -0.015em; }
  .mono {
    font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .93em;
    background: var(--brand-wash); color: var(--brand-ink); padding: 1px 5px; border-radius: 4px;
  }
  a { color: var(--brand); }
  :focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; border-radius: 4px; }

  .top { background: var(--paper); border-bottom: 1px solid var(--rule); padding: clamp(34px, 6vw, 60px) clamp(18px, 5vw, 56px); }
  .top-inner { max-width: 1180px; margin: 0 auto; }
  .brand { display: inline-flex; align-items: center; gap: 11px; margin-bottom: 26px; }
  .brand-tile { width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; background-size: cover; background-position: center; }
  .brand-name { font-weight: 700; font-size: 16.5px; }
  .brand-sub { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--faint); }
  .top h1 { font-size: clamp(28px, 4.2vw, 42px); font-weight: 700; max-width: 24ch; }
  .top p { max-width: 62ch; margin: 16px 0 0; font-size: clamp(15.5px, 1.4vw, 17.5px); color: var(--muted); }
  .top-facts {
    display: flex; flex-wrap: wrap; gap: 10px 24px; margin-top: 22px; padding-top: 16px;
    border-top: 1px solid var(--rule); font-size: 13.5px; color: var(--muted);
  }
  .top-facts b { color: var(--ink); }

  .wrap {
    max-width: 1180px; margin: 0 auto; padding: clamp(24px, 4vw, 46px) clamp(18px, 5vw, 56px) 80px;
    display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: clamp(24px, 4vw, 52px); align-items: start;
  }
  .toc { position: sticky; top: 22px; }
  .toc-h { font-size: 11px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: var(--faint); margin-bottom: 14px; }
  .toc-part { margin-bottom: 18px; }
  .toc-part-h { font-size: 13px; font-weight: 700; margin-bottom: 6px; font-family: Sora, sans-serif; }
  .toc-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .toc-list a { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 6px; text-decoration: none; color: var(--muted); font-size: 13.5px; padding: 3px 6px; border-radius: 6px; }
  .toc-list a:hover { background: var(--brand-wash); color: var(--brand-ink); }
  .toc-n { font-family: "IBM Plex Mono", monospace; font-size: 11.5px; color: var(--faint); padding-top: 2px; }

  .part { margin-bottom: clamp(30px, 5vw, 52px); }
  .part-h { display: flex; align-items: center; gap: 13px; margin-bottom: 20px; }
  .part-letter { width: 30px; height: 30px; border-radius: 8px; flex: none; background: var(--ink); color: var(--paper); display: grid; place-items: center; font-family: Sora, sans-serif; font-weight: 700; font-size: 14px; }
  .part-h h2 { font-size: clamp(20px, 2.2vw, 25px); font-weight: 700; }

  .step {
    background: var(--paper); border: 1px solid var(--rule); border-radius: 14px; box-shadow: var(--shadow);
    padding: clamp(20px, 2.6vw, 30px); margin-bottom: 16px;
    display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: clamp(14px, 2vw, 22px); scroll-margin-top: 20px;
  }
  .step-n { width: 40px; height: 40px; border-radius: 11px; border: 2px solid var(--brand); color: var(--brand); display: grid; place-items: center; font-family: Sora, sans-serif; font-weight: 700; font-size: 17px; }
  .step-body { min-width: 0; }
  .step h3 { font-size: clamp(17px, 1.9vw, 20px); font-weight: 600; margin-bottom: 10px; }
  .step p { margin: 0 0 12px; color: var(--ink-2); max-width: 70ch; }

  ol.do { margin: 0 0 14px; padding-left: 0; list-style: none; counter-reset: do; max-width: 70ch; }
  ol.do > li { counter-increment: do; position: relative; padding: 5px 0 5px 34px; color: var(--ink-2); }
  ol.do > li::before {
    content: counter(do); position: absolute; left: 0; top: 7px;
    font-family: "IBM Plex Mono", monospace; font-size: 12px; font-weight: 500;
    background: var(--paper-2); color: var(--muted); border-radius: 6px; width: 22px; height: 22px; display: grid; place-items: center;
  }
  ul.plain { margin: 0; padding-left: 20px; color: var(--ink-2); }
  ul.plain li { padding: 3px 0; }

  .note {
    display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 11px; align-items: start;
    padding: 13px 15px; border-radius: 10px; margin: 4px 0 0; max-width: 74ch;
  }
  .note p { margin: 0; font-size: 14.5px; }
  .note-label { font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; padding: 3px 8px; border-radius: 5px; white-space: nowrap; margin-top: 1px; }
  .note.tip { background: var(--brand-wash); } .note.tip .note-label { background: var(--brand); color: #fff; } .note.tip p { color: var(--ink-2); }
  .note.warn { background: var(--warn-wash); border: 1px solid var(--warn); } .note.warn .note-label { background: var(--warn); color: #fff; }
  .note.why { background: var(--why-wash); } .note.why .note-label { background: var(--why); color: #fff; }

  .table-wrap { overflow-x: auto; margin: 0 0 14px; }
  table.ref-table { border-collapse: collapse; width: 100%; max-width: 74ch; font-size: 14px; }
  table.ref-table th {
    text-align: left; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    color: var(--faint); padding: 7px 10px; border-bottom: 1px solid var(--rule-2);
  }
  table.ref-table td { padding: 8px 10px; border-bottom: 1px solid var(--rule); color: var(--ink-2); vertical-align: top; }
  table.ref-table tr:last-child td { border-bottom: 0; }

  .end { background: var(--paper); border: 1px solid var(--rule); border-radius: 14px; padding: clamp(20px, 3vw, 30px); box-shadow: var(--shadow); }
  .end h2 { font-size: clamp(19px, 2.1vw, 23px); margin-bottom: 10px; }
  .end p { color: var(--ink-2); max-width: 68ch; margin: 0 0 10px; }
  .end p:last-child { margin-bottom: 0; }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
  @media (max-width: 920px) {
    .wrap { grid-template-columns: minmax(0, 1fr); }
    .toc { position: static; background: var(--paper); border: 1px solid var(--rule); border-radius: 14px; padding: 18px; }
    .step { grid-template-columns: minmax(0, 1fr); gap: 12px; }
    .step-n { width: 34px; height: 34px; font-size: 15px; }
  }

  /* ── Print / PDF: portrait, one step per card, a page number footer ── */
  @media print {
    @page { size: A4 portrait; margin: 14mm 13mm 16mm; }
    :root {
      --ink: #1A1F2E; --ink-2: #3D4459; --muted: #626A80; --faint: #8C93A8;
      --paper: #FFFFFF; --paper-2: #F5F6FA; --rule: #E1E4ED; --rule-2: #CDD2E0;
      --brand: #4F46E5; --brand-ink: #372FBE; --brand-wash: #EEEDFC;
      --warn: #B45309; --warn-wash: #FEF4E4; --why: #0E7490; --why-wash: #E4F2F6; --shadow: none;
    }
    body { background: #fff; font-size: 10.5pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .top { border-bottom: 0; padding: 0 0 10mm; break-after: page; }
    .top-inner { max-width: none; }
    .top h1 { font-size: 26pt; margin-top: 34mm; }
    .top p { font-size: 11.5pt; margin-top: 6mm; }
    .top-facts { margin-top: 10mm; padding-top: 5mm; font-size: 10pt; }
    .wrap { display: block; max-width: none; padding: 0; }
    .toc { position: static; border: 0; padding: 0; break-after: page; columns: 2; column-gap: 12mm; }
    .toc-part { break-inside: avoid; margin-bottom: 6mm; }
    .toc-list a { color: var(--ink-2); padding: 2px 0; }
    .part { margin-bottom: 8mm; }
    .part-h { break-after: avoid; break-inside: avoid; margin-bottom: 5mm; }
    .step { break-inside: avoid; box-shadow: none; border: 1px solid var(--rule); padding: 6mm; margin-bottom: 5mm; gap: 5mm; grid-template-columns: 11mm minmax(0, 1fr); }
    .step-n { width: 9mm; height: 9mm; font-size: 12pt; }
    .step h3 { font-size: 13.5pt; break-after: avoid; }
    .step p, ol.do li, ul.plain li { font-size: 10.5pt; }
    .note { break-inside: avoid; padding: 3mm 4mm; margin-top: 3mm; }
    .note p { font-size: 9.5pt; }
    table.ref-table { font-size: 9.5pt; }
    .end { break-inside: avoid; box-shadow: none; padding: 6mm; }
    a { color: var(--brand-ink); }
  }
</style>

<header class="top">
  <div class="top-inner">
    <div class="brand">
      <span class="brand-tile" role="img" aria-label="Klogu" style="background-image:url('${LOGO}')"></span>
      <span><span class="brand-name">Klogu Bizz</span><br><span class="brand-sub">GST Billing Suite</span></span>
    </div>
    <h1>Setting up e-invoicing</h1>
    <p>
      Eight steps in two parts. Part A is done once, by whoever runs the server. Part B is done by
      every business that wants to file e-invoices, in their own account.
    </p>
    <div class="top-facts">
      <span><b>Steps 1&ndash;4</b> platform operator, once</span>
      <span><b>5&ndash;8</b> every business, on their own</span>
    </div>
  </div>
</header>

<div class="wrap">
  <nav class="toc" aria-label="Contents">
    <div class="toc-h">Contents</div>
    ${CONTENTS}
  </nav>

  <main>
    ${BODY}

    <div class="end">
      <h2>If something does not connect</h2>
      <p>
        <strong>Test connection</strong> fails with the portal's own words &mdash; it names whether the
        username, the password or the GSTIN was the problem, rather than a generic error.
      </p>
      <p>
        If the whole card is missing from Business Profile, e-invoicing is either not on this business's
        plan, or Part A has not been completed on the server yet &mdash; check with whoever administers
        the platform.
      </p>
    </div>
  </main>
</div>
`;

fs.writeFileSync(OUT, HTML, 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUT)} — ${Math.round(HTML.length / 1024)}KB.`);
