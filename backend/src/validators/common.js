const { z } = require('zod');

// Mongo ObjectId as it arrives over JSON.
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

// GSTIN: 2-digit state code, 10-char PAN, entity digit, 'Z', checksum char.
// Format only — the checksum digit itself is validated by isValidGstin below.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Verifies the 15th character of a GSTIN, which is a weighted mod-36 checksum
 * over the first 14. Previously GSTIN was only validated in the browser
 * (`isValidGSTIN` in the frontend's format.ts) while the API accepted any
 * string at all, so a typo'd or fabricated GSTIN reached the database and then
 * the invoice PDF — where it is a legal declaration.
 */
function isValidGstin(value) {
  if (!GSTIN_PATTERN.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const digit = GSTIN_CHARSET.indexOf(value[i]);
    const factor = i % 2 === 0 ? 1 : 2;
    const product = digit * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checksum = (36 - (sum % 36)) % 36;
  return GSTIN_CHARSET[checksum] === value[14];
}

// Optional GSTIN: absent or empty is fine (B2C buyers have none), but a
// supplied value has to be a real one.
const gstin = z.preprocess(
  value => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.union([
    z.literal(''),
    z.string().refine(isValidGstin, 'is not a valid GSTIN (check the format and the last character)')
  ]).optional().nullable()
);

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const pan = z.preprocess(
  value => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.union([z.literal(''), z.string().regex(PAN_PATTERN, 'is not a valid PAN')]).optional().nullable()
);

// GST state / UT code: '01'..'38' plus '97' (other territory) and '99'.
const stateCode = z.preprocess(
  value => (value === undefined || value === null ? value : String(value).padStart(2, '0')),
  z.string().regex(/^(0[1-9]|[12][0-9]|3[0-8]|97|99)$/, 'is not a valid GST state code')
);

// Money and quantities: coerced from the strings HTML number inputs send.
// `z.coerce.number()` rejects NaN on its own ("received nan"), and `.finite()`
// additionally rules out Infinity — so a non-numeric qty is a 400 at the edge
// rather than a NaN total written to the database. Note the chain order:
// `.finite()`/`.min()` are ZodNumber methods and must come before any
// `.refine()`, which wraps the type and hides them.
const nonNegativeNumber = z.coerce.number()
  .finite('must be a number')
  .min(0, 'cannot be negative');

const money = z.coerce.number()
  .finite('must be a number')
  .min(0, 'cannot be negative')
  .max(1e12, 'is unrealistically large');

const percent = z.coerce.number()
  .finite('must be a number')
  .min(0, 'cannot be negative')
  .max(100, 'cannot exceed 100');

const shortText = z.string().trim().max(200);
const longText = z.string().trim().max(5000);
const email = z.string().trim().toLowerCase().email('is not a valid email address');
const optionalEmail = z.union([z.literal(''), email]).optional().nullable();
const phone = z.union([
  z.literal(''),
  z.string().trim().regex(/^[0-9+\-() ]{6,20}$/, 'is not a valid phone number')
]).optional().nullable();

const isoDate = z.coerce.date({ invalid_type_error: 'is not a valid date' });

module.exports = {
  z, objectId, gstin, pan, stateCode, isValidGstin,
  nonNegativeNumber, money, percent,
  shortText, longText, email, optionalEmail, phone, isoDate
};
