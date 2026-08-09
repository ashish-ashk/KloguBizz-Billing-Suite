const sgMail = require('@sendgrid/mail');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');
const { EmailLog, Suppression } = require('../models/EmailLog');

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Minimal branded wrapper.
 *
 * Emails were previously plain text with no styling and no call to action.
 * Inline styles rather than a stylesheet because mail clients strip <style>
 * blocks to varying degrees, and tables-with-inline-CSS is still the only
 * layout that renders consistently in Outlook.
 */
function layout({ title, body, ctaLabel, ctaUrl, footer }) {
  const button = ctaLabel && ctaUrl
    ? `<tr><td style="padding:8px 0 24px;">
         <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:8px;">${ctaLabel}</a>
       </td></tr>
       <tr><td style="padding:0 0 8px;font-size:12px;color:#6b7280;line-height:1.6;">
         If the button doesn't work, copy this link into your browser:<br />
         <span style="color:#4f46e5;word-break:break-all;">${ctaUrl}</span>
       </td></tr>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="font-size:19px;font-weight:700;color:#111827;padding-bottom:14px;">${title}</td></tr>
        <tr><td style="font-size:14.5px;color:#374151;line-height:1.7;padding-bottom:20px;">${body}</td></tr>
        ${button}
        <tr><td style="padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;line-height:1.6;">
          ${footer || 'You are receiving this because your email address was used on KloguBizz.'}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Whether an address is on the platform-wide suppression list.
 *
 * Checked before every send, not as a courtesy to the recipient: continuing to mail
 * an address that hard-bounced or complained is what destroys a sending domain's
 * reputation, at which point every tenant's mail starts landing in spam. A lookup
 * failure returns `false` -- a database blip must not stop the product sending mail,
 * and the downside of one message to a bounced address is small next to that.
 */
async function isSuppressed(email) {
  try {
    const row = await Suppression.findOne({
      email: String(email).toLowerCase().trim(),
      releasedAt: null
    }).lean();
    return row ? { suppressed: true, reason: row.reason, detail: row.detail } : { suppressed: false };
  } catch (error) {
    logger.warn('suppression check failed', { err: error });
    return { suppressed: false };
  }
}

/**
 * Records an attempt. Fire-and-forget for the same reason the audit writer is:
 * bookkeeping must not be able to fail the thing it is recording.
 */
function recordEmail(entry) {
  EmailLog.create(entry).catch(error => logger.warn('email log write failed', { err: error }));
}

/**
 * Generic sender. With no SendGrid key it logs and reports the message as
 * skipped, so flows that depend on email still succeed locally.
 *
 * Returns a result object rather than throwing on a provider error: a failed
 * reminder must not abort a whole sweep, and the caller records the outcome so
 * delivery is auditable instead of invisible.
 *
 * Every outcome -- including `skipped` and `suppressed` -- is written to `EmailLog`.
 * The silent skip was the actual bug in #58: a deployment with no provider key
 * behaved identically to one that was sending, and nothing anywhere recorded which
 * it was.
 */
async function sendEmail({ to, subject, text, html, type = 'generic', orgId, meta, attachments, cc, replyTo }) {
  const base = { orgId: orgId || undefined, to: String(to || ''), subject, type, meta };

  if (!to) return { skipped: true, reason: 'no recipient address' };

  const suppression = await isSuppressed(to);
  if (suppression.suppressed) {
    recordEmail({ ...base, status: 'suppressed', reason: `${suppression.reason}: ${suppression.detail || ''}`.trim() });
    logger.info('email suppressed', { to, subject, reason: suppression.reason });
    return { skipped: true, suppressed: true, reason: `This address is suppressed (${suppression.reason}).` };
  }

  if (!env.SENDGRID_API_KEY) {
    logger.info('email skipped — no provider configured', { to, subject });
    recordEmail({ ...base, status: 'skipped', reason: 'SENDGRID_API_KEY is not configured' });
    return { skipped: true, reason: 'SENDGRID_API_KEY is not configured' };
  }

  try {
    const [response] = await sgMail.send({
      to,
      from: env.FROM_EMAIL,
      subject,
      text,
      html,
      ...(cc ? { cc } : {}),
      // The tenant's own address, so a customer's reply reaches them rather than us.
      ...(replyTo ? { replyTo } : {}),
      ...(attachments?.length ? { attachments } : {})
    });
    // The provider's own id is what its webhook events reference, so without
    // capturing it a later bounce cannot be attached to the message that bounced.
    const providerMessageId = response?.headers?.['x-message-id'];
    recordEmail({ ...base, status: 'sent', providerMessageId });
    return { sent: true, providerMessageId };
  } catch (error) {
    // SendGrid nests the useful part; surface it so a log entry is actually
    // diagnosable rather than just "failed".
    const detail = error.response?.body?.errors?.[0]?.message || error.message;
    logger.error('email delivery failed', { to, subject, detail });
    recordEmail({ ...base, status: 'failed', reason: detail });
    return { failed: true, reason: detail };
  }
}

async function sendInviteEmail({ to, name, inviteUrl, orgName, inviterName, expiresAt, orgId }) {
  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const who = inviterName ? `<strong>${escapeHtml(inviterName)}</strong> has invited you` : 'You have been invited';
  const body = `
    <p style="margin:0 0 12px;">Hello ${escapeHtml(name || 'there')},</p>
    <p style="margin:0 0 12px;">
      ${who} to join <strong>${escapeHtml(orgName || 'KloguBizz')}</strong> on KloguBizz, the GST billing suite.
    </p>
    <p style="margin:0;">Choose a password to activate your account and get started.</p>`;
  return sendEmail({
    to,
    orgId,
    type: 'invite',
    subject: `${inviterName || 'Your team'} invited you to ${orgName || 'KloguBizz'}`,
    html: layout({
      title: 'Set up your account',
      body,
      ctaLabel: 'Accept invitation',
      ctaUrl: inviteUrl,
      footer: expiry
        ? `This invitation expires on ${expiry}. If you weren't expecting it, you can ignore this email.`
        : "If you weren't expecting this invitation, you can ignore this email."
    }),
    text: `Hello ${name || 'there'},\n\n${inviterName ? inviterName + ' has invited you' : 'You have been invited'} to join ${orgName || 'KloguBizz'} on KloguBizz.\n\nSet your password here: ${inviteUrl}\n${expiry ? `\nThis invitation expires on ${expiry}.\n` : ''}`
  });
}

/**
 * Notifies an *already-registered* identity that they've been added to a
 * further organisation (#53, #54).
 *
 * Distinct from `sendInviteEmail`: there is no token and nothing to accept —
 * the person can already sign in, and the new membership is simply there the
 * next time they do (or immediately, via the org-switcher). This is purely
 * informational, which is also why it's allowed to fail silently the same way
 * every other notification here does.
 */
/**
 * A request to pay an invoice online (2.3 #21).
 *
 * The amount and the invoice number are in the subject as well as the body,
 * because this is the one email whose *point* is visible before it is opened —
 * and because a payment request that looks like a phishing attempt does not get
 * paid. The business's own name leads, `replyTo` is the tenant's address, and the
 * expiry is stated so an ignored link is not a mystery later.
 */
async function sendPaymentLinkEmail({ to, orgId, orgName, clientName, invoiceNumber, amount, payUrl, expiresAt, replyTo }) {
  const formatted = `INR ${Number(amount || 0).toLocaleString('en-IN')}`;
  const expiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const body = `
    <p style="margin:0 0 12px;">Hello ${escapeHtml(clientName || 'there')},</p>
    <p style="margin:0 0 12px;">
      ${escapeHtml(orgName || 'Your supplier')} has requested payment of
      <strong>${escapeHtml(formatted)}</strong> for invoice
      <strong>${escapeHtml(invoiceNumber || '')}</strong>.
    </p>
    <p style="margin:0;">You can pay securely online using the button below.</p>`;
  return sendEmail({
    to,
    orgId,
    replyTo,
    type: 'payment-link',
    subject: `${formatted} due — invoice ${invoiceNumber} from ${orgName || 'your supplier'}`,
    html: layout({
      title: 'Payment request',
      body,
      ctaLabel: `Pay ${formatted}`,
      ctaUrl: payUrl,
      footer: expiry
        ? `This payment link expires on ${expiry}. If you have already paid by another method, you can ignore this email.`
        : 'If you have already paid by another method, you can ignore this email.'
    }),
    text: `Hello ${clientName || 'there'},\n\n${orgName || 'Your supplier'} has requested payment of ${formatted} for invoice ${invoiceNumber}.\n\nPay securely here: ${payUrl}\n${expiry ? `\nThis link expires on ${expiry}.\n` : ''}`
  });
}

async function sendAddedToOrgEmail({ to, name, orgName, inviterName, orgId }) {
  const who = inviterName ? `<strong>${escapeHtml(inviterName)}</strong> has added you` : 'You have been added';
  const body = `
    <p style="margin:0 0 12px;">Hello ${escapeHtml(name || 'there')},</p>
    <p style="margin:0 0 12px;">
      ${who} to <strong>${escapeHtml(orgName || 'an organisation')}</strong> on KloguBizz. You can switch
      into it any time with your existing sign-in — nothing else to set up.
    </p>`;
  return sendEmail({
    to,
    orgId,
    type: 'invite',
    subject: `You've been added to ${orgName || 'an organisation'} on KloguBizz`,
    html: layout({
      title: 'New organisation added',
      body,
      ctaLabel: 'Open KloguBizz',
      ctaUrl: env.FRONTEND_URL
    }),
    text: `Hello ${name || 'there'},\n\n${inviterName ? inviterName + ' has added you' : 'You have been added'} to ${orgName || 'an organisation'} on KloguBizz. Sign in and switch into it any time.`
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl, orgId }) {
  const body = `
    <p style="margin:0 0 12px;">Hello ${escapeHtml(name || 'there')},</p>
    <p style="margin:0 0 12px;">
      We received a request to reset the password for your KloguBizz account.
      Click below to choose a new one.
    </p>
    <p style="margin:0;">This link is valid for one hour and can only be used once.</p>`;
  return sendEmail({
    to,
    orgId,
    type: 'password-reset',
    subject: 'Reset your KloguBizz password',
    html: layout({
      title: 'Reset your password',
      body,
      ctaLabel: 'Choose a new password',
      ctaUrl: resetUrl,
      footer: 'If you did not request this, you can safely ignore this email — your password has not changed.'
    }),
    text: `Hello ${name || 'there'},\n\nReset your KloguBizz password here (valid for one hour):\n${resetUrl}\n\nIf you did not request this, ignore this email — your password has not changed.`
  });
}

/**
 * Renders a configured reminder template.
 *
 * The super admin's Reminders page has always let a subject and body be set,
 * but nothing read them — sendReminderEmail hardcoded its own copy, so the whole
 * page was decorative. Placeholders use {{name}} form so the templates stay
 * readable to a non-technical admin.
 */
function renderTemplate(template, values) {
  return String(template || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    values[key] === undefined || values[key] === null ? '' : String(values[key])
  );
}

const DEFAULT_REMINDER_SUBJECT = 'Payment reminder — Invoice {{invoiceNumber}}';
const DEFAULT_REMINDER_BODY = `Dear {{clientName}},

This is a friendly reminder that invoice {{invoiceNumber}} for {{amount}} {{dueState}}.

Please arrange payment at your earliest convenience.

Warm regards,
{{orgName}}`;

async function sendReminderEmail({
  to, clientName, invoiceNumber, amount, dueDate, orgName, overdueDays,
  balanceDue, subject: subjectTemplate, template: bodyTemplate, viewUrl, orgId
}) {
  const due = new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dueState = overdueDays > 0
    ? `was due on ${due} and is now ${overdueDays} day(s) overdue`
    : `is due on ${due}`;

  const values = {
    clientName: clientName || 'Customer',
    name: clientName || 'Customer',
    invoiceNumber,
    amount,
    balanceDue: balanceDue || amount,
    dueDate: due,
    dueState,
    overdueDays: overdueDays > 0 ? overdueDays : 0,
    orgName: orgName || 'KloguBizz'
  };

  const subject = renderTemplate(subjectTemplate || DEFAULT_REMINDER_SUBJECT, values);
  const text = renderTemplate(bodyTemplate || DEFAULT_REMINDER_BODY, values);

  return sendEmail({
    to,
    orgId,
    type: 'reminder',
    // Recorded per invoice so a delivery question can be answered per document, not
    // just per address.
    meta: { invoiceNumber, overdueDays },
    subject,
    text,
    html: layout({
      title: overdueDays > 0 ? `Invoice ${invoiceNumber} is overdue` : `Invoice ${invoiceNumber} is due`,
      // The configured body is plain text authored by an admin, so newlines are
      // the only formatting to honour — escaping first means a template can't
      // inject markup into the email.
      body: escapeHtml(text).replace(/\n/g, '<br />'),
      ctaLabel: viewUrl ? 'View invoice' : undefined,
      ctaUrl: viewUrl,
      footer: `Sent by ${escapeHtml(values.orgName)} via KloguBizz.`
    })
  });
}

/**
 * Confirms a newly registered address (#52).
 *
 * Registration previously accepted anything, so a typo produced an account that
 * could never receive a reset link -- an unrecoverable account created by a
 * one-character mistake.
 */
/**
 * Chasing a failed subscription payment (3.3 #10).
 *
 * Written to be *useful* rather than threatening. The overwhelmingly common
 * cause is an expired card, which the customer would fix in two minutes if
 * anybody told them — so the message leads with what happened and what to do,
 * says plainly that nothing has been deleted, and only mentions consequences
 * where they are imminent.
 *
 * From the platform, so no tenant branding: this is KloguBizz writing to its own
 * customer about their account with us, and dressing it in their logo would
 * suggest it came from their own system.
 */
async function sendDunningEmail({
  to, orgId, name, orgName, planName, amount, billingCycle, daysPastDue, stage, subject, lead, tone, suspendInDays
}) {
  const money = typeof amount === 'number' && amount > 0
    ? `₹${amount.toLocaleString('en-IN')} ${billingCycle === 'yearly' ? 'per year' : 'per month'}`
    : null;

  const lines = [
    `Hello ${name || 'there'},`,
    '',
    lead,
    '',
    `Account: ${orgName}`,
    `Plan: ${planName}${money ? ` (${money})` : ''}`,
    `Outstanding for: ${daysPastDue} day${daysPastDue === 1 ? '' : 's'}`,
    ''
  ];

  if (tone === 'warning' && suspendInDays > 0) {
    lines.push(
      `If this is not settled within ${suspendInDays} day${suspendInDays === 1 ? '' : 's'}, the account `
      + 'will become read-only. Nothing is deleted: you will still be able to open and export every '
      + 'invoice, client and report. Creating and editing stops until the payment goes through.',
      ''
    );
  }

  lines.push(
    'You can update your payment details from Subscription inside the app.',
    '',
    'If you think this is a mistake, or the payment has already been made, reply to this email '
    + 'and a person will look at it.'
  );

  const text = lines.join('\n');

  return sendEmail({
    to,
    orgId,
    type: 'dunning',
    meta: { stage, daysPastDue },
    subject,
    text,
    html: layout({
      title: subject,
      body: escapeHtml(text).replace(/\n/g, '<br />'),
      ctaLabel: 'Update payment details',
      ctaUrl: `${env.FRONTEND_URL}/subscription`,
      footer: 'Sent by KloguBizz about your subscription.'
    })
  });
}

async function sendEmailVerification({ to, name, verifyUrl, orgId }) {
  const body = `
    <p style="margin:0 0 12px;">Hello ${escapeHtml(name || 'there')},</p>
    <p style="margin:0 0 12px;">
      Please confirm this email address so we can send you invoices, reminders and
      password resets.
    </p>
    <p style="margin:0;">This link is valid for 48 hours.</p>`;
  return sendEmail({
    to,
    orgId,
    type: 'email-verification',
    subject: 'Confirm your email address',
    html: layout({
      title: 'Confirm your email address',
      body,
      ctaLabel: 'Confirm email address',
      ctaUrl: verifyUrl,
      footer: 'If you did not create a KloguBizz account, you can ignore this email.'
    }),
    text: `Hello ${name || 'there'},\n\nConfirm your email address (valid for 48 hours):\n${verifyUrl}\n`
  });
}

/**
 * Emails an invoice to the customer, with the PDF attached (2.3 #19).
 *
 * There was **no send-invoice action at all** — only reminders, and those were plain
 * text with nothing attached. So the actual product loop, "raise an invoice and give
 * it to the customer", ended at a PDF download the tenant then had to email themselves.
 *
 * `replyTo` is the tenant's own address rather than ours: the customer's natural
 * response to an invoice is to reply to it, and routing that to our transactional
 * sender loses it silently.
 */
async function sendInvoiceEmail({
  to, cc, clientName, invoiceNumber, amount, dueDate, orgName, replyTo,
  pdf, viewUrl, message, orgId
}) {
  const due = dueDate
    ? new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const intro = message?.trim()
    // A tenant-written note is escaped before it is placed in the HTML: it is
    // user-authored content going into an email body.
    ? `<p style="margin:0 0 12px;">${escapeHtml(message.trim()).replace(/\n/g, '<br />')}</p>`
    : '';
  const body = `
    <p style="margin:0 0 12px;">Dear ${escapeHtml(clientName || 'Customer')},</p>
    ${intro}
    <p style="margin:0 0 12px;">
      Please find invoice <strong>${escapeHtml(invoiceNumber)}</strong> for
      <strong>${escapeHtml(amount)}</strong> attached${due ? `, due on <strong>${due}</strong>` : ''}.
    </p>
    <p style="margin:0;">Thank you for your business.</p>`;

  return sendEmail({
    to,
    cc,
    orgId,
    replyTo,
    type: 'invoice',
    meta: { invoiceNumber },
    subject: `Invoice ${invoiceNumber} from ${orgName || 'KloguBizz'}`,
    html: layout({
      title: `Invoice ${escapeHtml(invoiceNumber)}`,
      body,
      ctaLabel: viewUrl ? 'View invoice' : undefined,
      ctaUrl: viewUrl,
      footer: `Sent by ${escapeHtml(orgName || 'KloguBizz')} via KloguBizz.`
    }),
    text: `Dear ${clientName || 'Customer'},\n\n${message?.trim() ? `${message.trim()}\n\n` : ''}`
      + `Invoice ${invoiceNumber} for ${amount}${due ? `, due on ${due}` : ''} is attached.\n`,
    attachments: pdf
      ? [{
        content: pdf.toString('base64'),
        filename: `${invoiceNumber}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment'
      }]
      : undefined
  });
}

module.exports = {
  sendEmail,
  sendInvoiceEmail,
  isSuppressed,
  recordEmail,
  sendInviteEmail,
  sendAddedToOrgEmail,
  sendPaymentLinkEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendDunningEmail,
  sendReminderEmail,
  renderTemplate,
  DEFAULT_REMINDER_SUBJECT,
  DEFAULT_REMINDER_BODY
};
