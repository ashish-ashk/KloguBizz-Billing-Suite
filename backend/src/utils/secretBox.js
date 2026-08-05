const crypto = require('crypto');
const { env } = require('../config/env');

/**
 * Authenticated symmetric encryption for secrets that have to be *recovered*
 * rather than merely compared.
 *
 * Most credentials in this codebase are hashed — passwords, invite tokens, reset
 * tokens, refresh tokens — because nothing ever needs the original back. A few
 * genuinely do: a TOTP secret is needed to compute the expected code, and a
 * tenant's payment-gateway key is needed to talk to the gateway. Those are
 * encrypted, and this is the one place that knows how.
 *
 * Extracted from `utils/totp.js`, which introduced this pattern for MFA secrets.
 * The **key derivation is preserved exactly** — `sha256(namespace + ':' + source)`
 * with the same `mfa` namespace — because changing it would invalidate every
 * enrolled authenticator on the next deploy and force every user to re-enrol.
 *
 * `namespace` domain-separates the keys, so a value encrypted for MFA cannot be
 * decrypted as a gateway credential even though both derive from the same
 * environment secret. That matters if one is ever exposed: the blast radius stays
 * inside its own domain.
 *
 * The stored form is `iv:tag:ciphertext`, all base64 — self-describing, so a
 * future rotation can tell an old value from a new one without a version field.
 */

function keyFor(namespace) {
  // `MFA_ENCRYPTION_KEY` is the configured key for every namespace, not only MFA;
  // the name is kept for compatibility with existing deployments. Falls back to
  // `JWT_SECRET` so the features work without extra configuration — with the
  // documented consequence that rotating `JWT_SECRET` invalidates anything
  // encrypted under the fallback.
  const source = env.MFA_ENCRYPTION_KEY || env.JWT_SECRET;
  return crypto.createHash('sha256').update(`${namespace}:${source}`).digest();
}

function encrypt(plain, namespace) {
  if (!namespace) throw new Error('secretBox.encrypt requires a namespace');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFor(namespace), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
}

function decrypt(stored, namespace) {
  if (!namespace) throw new Error('secretBox.decrypt requires a namespace');
  const [ivPart, tagPart, dataPart] = String(stored || '').split(':');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Stored secret is malformed');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFor(namespace), Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]).toString('utf8');
}

/** Whether a value looks like something this module produced. Used to tell an
 *  already-encrypted stored value from a fresh plaintext one on save, so a
 *  round-trip through the console cannot double-encrypt it. */
function looksEncrypted(value) {
  return /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(String(value || ''));
}

/** The last four characters of a secret, for display. Enough to confirm *which*
 *  key is configured without revealing it — the same affordance every payment
 *  dashboard uses. */
function hint(plain) {
  const text = String(plain || '');
  return text.length <= 4 ? '••••' : `••••${text.slice(-4)}`;
}

module.exports = { encrypt, decrypt, looksEncrypted, hint };
