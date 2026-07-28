const sgMail = require('@sendgrid/mail');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

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
 * Generic sender. With no SendGrid key it logs and reports the message as
 * skipped, so flows that depend on email still succeed locally.
 *
 * Returns a result object rather than throwing on a provider error: a failed
 * reminder must not abort a whole sweep, and the caller records the outcome so
 * delivery is auditable instead of invisible.
 */
async function sendEmail({ to, subject, text, html }) {
  if (!to) return { skipped: true, reason: 'no recipient address' };
  if (!env.SENDGRID_API_KEY) {
    logger.info('email skipped — no provider configured', { to, subject });
    return { skipped: true, reason: 'SENDGRID_API_KEY is not configured' };
  }
  try {
    await sgMail.send({ to, from: env.FROM_EMAIL, subject, text, html });
    return { sent: true };
  } catch (error) {
    // SendGrid nests the useful part; surface it so a log entry is actually
    // diagnosable rather than just "failed".
    const detail = error.response?.body?.errors?.[0]?.message || error.message;
    logger.error('email delivery failed', { to, subject, detail });
    return { failed: true, reason: detail };
  }
}

async function sendInviteEmail({ to, name, inviteUrl, orgName, inviterName, expiresAt }) {
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

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const body = `
    <p style="margin:0 0 12px;">Hello ${escapeHtml(name || 'there')},</p>
    <p style="margin:0 0 12px;">
      We received a request to reset the password for your KloguBizz account.
      Click below to choose a new one.
    </p>
    <p style="margin:0;">This link is valid for one hour and can only be used once.</p>`;
  return sendEmail({
    to,
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
  balanceDue, subject: subjectTemplate, template: bodyTemplate, viewUrl
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

module.exports = {
  sendEmail,
  sendInviteEmail,
  sendPasswordResetEmail,
  sendReminderEmail,
  renderTemplate,
  DEFAULT_REMINDER_SUBJECT,
  DEFAULT_REMINDER_BODY
};
