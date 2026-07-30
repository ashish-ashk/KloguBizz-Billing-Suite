const crypto = require('crypto');
const { env } = require('../config/env');

/**
 * TOTP (RFC 6238), implemented directly on `node:crypto`.
 *
 * MFA has been deferred from every phase of this plan with the same note attached —
 * "needs a TOTP dependency" — and that premise was wrong. TOTP is HMAC-SHA1 over a
 * counter, and Node has HMAC-SHA1. The only genuinely missing pieces were base32
 * (30 lines) and the `otpauth://` URI format (one template string). Adding a
 * dependency to an auth path is not free: it is a supply-chain surface on the one
 * code path an attacker most wants to influence, for ~120 lines of well-specified
 * arithmetic.
 *
 * Interoperable with Google Authenticator, Authy, 1Password and Microsoft
 * Authenticator, which all implement the same defaults: SHA-1, 6 digits, 30-second
 * step. Those defaults are not a security choice here — they are a compatibility
 * requirement, since the authenticator app has no way to be told otherwise beyond
 * the URI parameters, and several popular apps ignore them.
 */

const DIGITS = 6;
const STEP_SECONDS = 30;
/**
 * How many steps either side of "now" are accepted.
 *
 * One step (±30s) covers ordinary clock drift and the case of typing a code as it
 * rolls over. Widening it to two would triple the window an intercepted code stays
 * usable for, which is the opposite of the point.
 */
const WINDOW = 1;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input) {
  // Padding and casual formatting (spaces, lowercase) are stripped: users retype
  // these by hand from a screen, and rejecting "jbsw y3dp" would be pedantry.
  const cleaned = String(input).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 character in TOTP secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A fresh 20-byte secret — the RFC 4226 recommended length — in base32. */
function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/**
 * The code for one time step.
 *
 * The dynamic truncation (masking the high bit, taking four bytes from the offset in
 * the low nibble) is the RFC's, not an invention: it exists so the code does not
 * depend on the endianness or sign handling of whatever computed it.
 */
function codeForCounter(secretBase32, counter) {
  const key = base32Decode(secretBase32);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

function currentCounter(at = Date.now()) {
  return Math.floor(at / 1000 / STEP_SECONDS);
}

/**
 * Verifies a code and returns the counter it matched.
 *
 * The counter is returned, not just `true`, because it is what makes **replay
 * protection** possible: a code stays valid for 30 seconds, so without recording
 * which step was consumed the same six digits can be used twice — by anyone who
 * shoulder-surfed them or intercepted the first request. The caller stores the
 * counter and refuses anything at or below it.
 *
 * Comparison is `timingSafeEqual` over equal-length buffers. The information a
 * timing leak would give up here is small, but "small" is not a reason to compare
 * secrets with `===` in an auth path.
 */
function verifyCode(secretBase32, code, { at = Date.now(), lastUsedCounter = null } = {}) {
  const supplied = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(supplied)) return { valid: false, reason: 'A code is six digits.' };

  const now = currentCounter(at);
  for (let offset = -WINDOW; offset <= WINDOW; offset += 1) {
    const counter = now + offset;
    if (counter < 0) continue;
    const expected = codeForCounter(secretBase32, counter);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(supplied, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      if (lastUsedCounter !== null && counter <= lastUsedCounter) {
        return { valid: false, reason: 'That code has already been used. Wait for the next one.', replay: true };
      }
      return { valid: true, counter };
    }
  }
  return { valid: false, reason: 'That code is not correct or has expired.' };
}

/**
 * The `otpauth://` URI an authenticator app consumes.
 *
 * The label is `Issuer:account` *and* `issuer=` is repeated as a parameter, which
 * looks redundant and is not: older apps read the label, newer ones the parameter,
 * and an app that finds neither files the entry under a blank name.
 */
function otpauthUri({ secret, account, issuer = 'KloguBizz' }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS)
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ── Secret storage ───────────────────────────────

/**
 * TOTP secrets are encrypted at rest with AES-256-GCM.
 *
 * A stored TOTP secret is a second password: anyone who can read the collection — a
 * backup, a log, a compromised read-only account — can generate valid codes forever
 * and MFA has bought nothing. This is the same reasoning that made the invite and
 * reset tokens hashed rather than stored, except that a secret has to be *recovered*
 * to verify a code, so it is encrypted rather than hashed.
 *
 * The key is `MFA_ENCRYPTION_KEY` when set, otherwise derived from `JWT_SECRET` so
 * the feature works without extra configuration. That fallback has a real
 * consequence and it is documented rather than hidden: rotating `JWT_SECRET`
 * invalidates every enrolled authenticator, and users have to re-enrol.
 */
function encryptionKey() {
  const source = env.MFA_ENCRYPTION_KEY || env.JWT_SECRET;
  return crypto.createHash('sha256').update(`mfa:${source}`).digest();
}

function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  // iv:tag:ciphertext, all base64 — self-describing, so a rotation can tell an old
  // value from a new one without a version field.
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
}

function decryptSecret(stored) {
  const [ivPart, tagPart, dataPart] = String(stored || '').split(':');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Stored MFA secret is malformed');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]).toString('utf8');
}

// ── Backup codes ─────────────────────────────────

const BACKUP_CODE_COUNT = 8;

/**
 * Single-use recovery codes.
 *
 * Without these, a lost phone is a permanently locked account with no route back
 * except a support request — and support resetting MFA on request is a social-
 * engineering hole that undoes the control. Stored as SHA-256 hashes for the same
 * reason as the reset tokens: they are high-entropy, so a fast hash is the right
 * one, and it means a leaked database yields no usable code.
 */
function generateBackupCodes(count = BACKUP_CODE_COUNT) {
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    // Grouped for legibility — these get written down.
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

function hashBackupCode(code) {
  return crypto.createHash('sha256')
    .update(String(code).toUpperCase().replace(/[\s-]/g, ''))
    .digest('hex');
}

module.exports = {
  DIGITS,
  STEP_SECONDS,
  WINDOW,
  BACKUP_CODE_COUNT,
  base32Encode,
  base32Decode,
  generateSecret,
  codeForCounter,
  currentCounter,
  verifyCode,
  otpauthUri,
  encryptSecret,
  decryptSecret,
  generateBackupCodes,
  hashBackupCode
};
