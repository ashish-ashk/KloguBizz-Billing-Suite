const sgMail = require('@sendgrid/mail');
const { env } = require('../config/env');

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

// Generic sender. In local mode (no SendGrid key) it logs and reports the
// message as skipped so flows depending on email still succeed.
async function sendEmail({ to, subject, text, html }) {
  if (!env.SENDGRID_API_KEY) {
    console.log(`Email skipped in local mode: to=${to} subject="${subject}"`);
    return { skipped: true };
  }
  await sgMail.send({ to, from: env.FROM_EMAIL, subject, text, html });
  return { sent: true };
}

async function sendInviteEmail({ to, inviteUrl }) {
  return sendEmail({
    to,
    subject: 'You are invited to KloguBizz',
    text: `Set your password here: ${inviteUrl}`
  });
}

async function sendReminderEmail({ to, clientName, invoiceNumber, amount, dueDate, orgName, overdueDays }) {
  const due = new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const state = overdueDays > 0
    ? `was due on ${due} and is now ${overdueDays} day(s) overdue`
    : `is due on ${due}`;
  return sendEmail({
    to,
    subject: `Payment reminder — Invoice ${invoiceNumber}`,
    text: `Dear ${clientName},\n\nThis is a friendly reminder that invoice ${invoiceNumber} for ${amount} ${state}.\n\nPlease arrange payment at your earliest convenience.\n\nWarm regards,\n${orgName}`
  });
}

module.exports = { sendEmail, sendInviteEmail, sendReminderEmail };
