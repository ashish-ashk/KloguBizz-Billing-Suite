const crypto = require('crypto');

/**
 * The cryptography the NIC e-invoice API requires.
 *
 * Kept in its own file, with no network in it, because it is the part of the
 * integration that is both easiest to get wrong and hardest to debug: every
 * mistake here comes back from the IRP as the same opaque authentication
 * failure, with nothing to say which of the four transforms was wrong. Isolated
 * like this it can be round-tripped against a local key pair in tests, which is
 * the only way to know it is right before real credentials exist.
 *
 * The scheme, as the NIC specification defines it:
 *
 *   1. The **password** and the **AppKey** are encrypted with the IRP's public
 *      key using `RSA/ECB/PKCS1Padding` — *not* OAEP. OAEP is the better padding
 *      and it is the wrong answer here; the server will simply refuse.
 *   2. The IRP answers with `Sek`, a session key encrypted under the AppKey with
 *      `AES-256-ECB`.
 *   3. Every later request body is `{ Data: base64(AES-256-ECB(json, sek)) }`,
 *      and the response `Data` comes back the same way.
 *
 * ECB, with no IV, is indefensible cryptography in 2026 — it leaks structure
 * across identical blocks. It is also what the government's API specifies, and
 * an integration that "improves" on the spec does not connect. It is recorded
 * here as a known property of the protocol rather than a choice this codebase
 * made.
 *
 * Sources: einv-apisandbox.nic.in — Authentication and Generate IRN API pages.
 */

/** The AppKey is 32 bytes: it doubles as the AES-256 key that unwraps the SEK. */
const APP_KEY_BYTES = 32;

function generateAppKey() {
  return crypto.randomBytes(APP_KEY_BYTES);
}

/**
 * RSA-encrypts a string with the IRP's public key.
 *
 * `RSA_PKCS1_PADDING` is required by the specification. Node deprecates it for
 * decryption (it is vulnerable to a padding oracle when *decrypting* attacker
 * data), which does not apply here: this only ever encrypts, with a public key,
 * to a server that demands this padding.
 */
function rsaEncrypt(plainText, publicKeyPem) {
  if (!publicKeyPem) throw new Error('The IRP public key is not configured.');
  return crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(plainText, 'utf8')
  ).toString('base64');
}

/**
 * The AppKey as it goes on the wire.
 *
 * Base64 of the bytes, then RSA-encrypted — so what the IRP receives is the
 * *base64 text*, while the AES key used locally to unwrap the SEK is the raw
 * bytes behind it. Every working implementation of this API does it this way and
 * the specification does not spell it out, which is why it is stated here.
 */
function encryptAppKey(appKeyBytes, publicKeyPem) {
  return rsaEncrypt(appKeyBytes.toString('base64'), publicKeyPem);
}

function encryptPassword(password, publicKeyPem) {
  return rsaEncrypt(password, publicKeyPem);
}

/** AES-256-ECB with PKCS#7 padding, which is Node's default for the cipher. */
function aesEncrypt(plainText, keyBytes) {
  const cipher = crypto.createCipheriv('aes-256-ecb', keyBytes, null);
  return Buffer.concat([cipher.update(Buffer.from(plainText, 'utf8')), cipher.final()]).toString('base64');
}

function aesDecrypt(base64CipherText, keyBytes) {
  const decipher = crypto.createDecipheriv('aes-256-ecb', keyBytes, null);
  return Buffer.concat([
    decipher.update(Buffer.from(base64CipherText, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

/**
 * Unwraps the session key returned by the authentication call.
 *
 * Deliberately tolerant of both encodings seen in the wild: the decrypted value
 * is sometimes the 32 raw key bytes and sometimes base64 *text* of them. Which
 * one arrives is not something the specification settles, and picking the wrong
 * one produces an AES key of the wrong length — so the length decides, and the
 * only two possibilities are handled rather than guessed at.
 */
function decryptSek(sekBase64, appKeyBytes) {
  const decipher = crypto.createDecipheriv('aes-256-ecb', appKeyBytes, null);
  const raw = Buffer.concat([
    decipher.update(Buffer.from(sekBase64, 'base64')),
    decipher.final()
  ]);

  if (raw.length === 32) return raw;

  const decoded = Buffer.from(raw.toString('utf8'), 'base64');
  if (decoded.length === 32) return decoded;

  throw new Error(
    `The session key from the IRP is ${raw.length} bytes after decryption, not 32. `
    + 'This usually means the AppKey was encrypted with the wrong padding or the wrong public key.'
  );
}

/** A request body: the JSON, encrypted under the session key. */
function encryptPayload(payload, sekBytes) {
  return { Data: aesEncrypt(JSON.stringify(payload), sekBytes) };
}

/** A response body's `Data`, back to an object. */
function decryptResponseData(dataBase64, sekBytes) {
  return JSON.parse(aesDecrypt(dataBase64, sekBytes));
}

module.exports = {
  APP_KEY_BYTES,
  generateAppKey,
  rsaEncrypt,
  encryptAppKey,
  encryptPassword,
  aesEncrypt,
  aesDecrypt,
  decryptSek,
  encryptPayload,
  decryptResponseData
};
