const { z } = require('zod');
const { httpError } = require('../utils/httpError');
const { TEMPLATE_IDS } = require('../services/invoiceTemplates');

/**
 * Schemas for the platform's global key/value settings.
 *
 * `saveSetting` accepted any JSON at all under any key, and several of those
 * values are read on unauthenticated paths — `branding` is served to every
 * visitor by `publicController` and drives the login page. One malformed
 * payload (a colour that isn't a colour, a string where an object was expected,
 * an unbounded base64 blob) silently broke the login screen for every user, with
 * nothing in the request rejected and nothing in the logs to say why.
 *
 * Unknown keys are refused rather than stored: an unrecognised key is a typo or
 * a stale client, and accepting it writes a row nothing will ever read.
 *
 * `.strict()` is deliberately *not* used — an older or newer frontend sending an
 * extra field should not fail the whole save — but unknown fields are stripped,
 * so what lands in the database is only ever what is described here.
 */

const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'must be a hex colour like #4F46E5');
const shortText = z.string().trim().max(200);
const longText = z.string().trim().max(5000);
const optionalEmail = z.union([z.literal(''), z.string().trim().email('must be a valid email address')]);
const optionalUrl = z.union([z.literal(''), z.string().trim().url('must be a valid URL').max(2000)]);

/**
 * An uploaded image, held inline as a data URI.
 *
 * Bounded on purpose: these are stored inside a document that is read on the
 * public login path, so an oversized value is both a performance problem and a
 * way to bloat a collection nothing limits. The ceiling matches the 500KB cap
 * the uploader enforces in the browser, plus base64's ~33% overhead — the
 * browser check is a courtesy, not a control, since the API is reachable
 * directly.
 */
const dataUriImage = z.union([
  z.literal(''),
  z.string()
    .regex(/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/, 'must be an image')
    .max(700 * 1024, 'image is too large — keep it under 500 KB')
]);

const brandingSchema = z.object({
  appName: shortText.optional(),
  tagline: shortText.optional(),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  supportEmail: optionalEmail.optional(),
  websiteUrl: optionalUrl.optional(),
  logoUrl: dataUriImage.optional(),
  faviconUrl: dataUriImage.optional()
});

const emailSchema = z.object({
  senderName: shortText.optional(),
  senderEmail: optionalEmail.optional(),
  replyTo: optionalEmail.optional(),
  bcc: optionalEmail.optional(),
  footer: longText.optional(),
  // Legacy seed rows use these names; accepted so an existing row round-trips
  // through a save unchanged rather than being rejected as unknown.
  fromName: shortText.optional(),
  fromEmail: optionalEmail.optional()
});

const receiptSchema = z.object({
  autoSend: z.boolean().optional(),
  includeInvoiceCopy: z.boolean().optional(),
  subject: shortText.optional(),
  bodyIntro: longText.optional()
});

const templateConfigSchema = z.object({
  paperSize: z.enum(['A4', 'Letter']).optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  watermark: shortText.optional(),
  accentColor: hexColor.optional(),
  showLogo: z.boolean().optional(),
  showSignature: z.boolean().optional(),
  showBankDetails: z.boolean().optional(),
  showAmountInWords: z.boolean().optional(),
  showGstBreakdown: z.boolean().optional(),
  showQrCode: z.boolean().optional()
});

/**
 * The platform-wide default invoice template. `templateId` is checked against
 * the real registry, so the console cannot store an id no renderer knows — which
 * would silently fall back to the built-in default with no explanation.
 */
const defaultInvoiceTemplateSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS).optional(),
  accentColor: hexColor.optional()
});

const SETTING_SCHEMAS = {
  branding: brandingSchema,
  email: emailSchema,
  receipt: receiptSchema,
  templateConfig: templateConfigSchema,
  defaultInvoiceTemplate: defaultInvoiceTemplateSchema
};

const SETTING_KEYS = Object.keys(SETTING_SCHEMAS);

function formatIssues(issues) {
  return issues.map(issue => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message
  }));
}

/**
 * Validates a setting payload, returning the sanitised value.
 * Throws a 400 with per-field detail — the same shape the request validator
 * produces, so the console can render it the same way.
 */
function assertValidSetting(key, value) {
  const schema = SETTING_SCHEMAS[key];
  if (!schema) {
    throw httpError(
      400,
      `"${key}" is not a known platform setting. Valid keys: ${SETTING_KEYS.join(', ')}.`,
      'UNKNOWN_SETTING'
    );
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = httpError(400, `The ${key} settings could not be saved — some values are not valid.`, 'INVALID_SETTING');
    error.details = formatIssues(result.error.issues);
    throw error;
  }
  return result.data;
}

module.exports = { assertValidSetting, SETTING_KEYS, SETTING_SCHEMAS };
