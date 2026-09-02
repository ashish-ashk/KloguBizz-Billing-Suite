const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const http = require('http');

const nicCrypto = require('../src/services/irp/nicCrypto');

/**
 * The e-invoice integration, against a portal that speaks the real protocol.
 *
 * ── Why a fake portal and not a mocked function ────────────────────────
 *
 * A stubbed `generateIrn` that returns an IRN proves nothing about this feature:
 * the whole difficulty is the four cryptographic transforms between us and the
 * government, and every mistake in them comes back from the real portal as the
 * same opaque authentication failure. A mock would pass with all four wrong.
 *
 * So the server below implements the NIC contract for real — it RSA-decrypts the
 * password and the AppKey with its own private key, wraps a session key under
 * that AppKey, and requires every subsequent payload to be AES-encrypted under
 * the session key. If the client gets the padding, the key derivation, the
 * base64 layering or the header names wrong, these tests fail. That is the only
 * check available before real credentials exist, and it is a real one.
 *
 * Nothing here needs a database.
 */

// ── Emulating the portal's private half ──────────────────────────────────

const keyPair = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

/**
 * PKCS#1 v1.5 decryption, unpadded by hand.
 *
 * Node refuses `RSA_PKCS1_PADDING` for *private* decryption — it is vulnerable
 * to a padding oracle (CVE-2023-46809) when decrypting attacker-supplied data,
 * which is a real concern for a server and not for this test. Rather than run
 * the whole suite with `--security-revert`, the padding is stripped here: an
 * encryption block is `0x00 0x02 <non-zero filler> 0x00 <message>`, so the
 * message is whatever follows the first zero byte after the header.
 *
 * The client under test only ever *encrypts*, with a public key, so none of this
 * applies to the shipped code.
 */
function portalDecrypt(base64) {
  const raw = crypto.privateDecrypt(
    { key: keyPair.privateKey, padding: crypto.constants.RSA_NO_PADDING },
    Buffer.from(base64, 'base64')
  );
  assert.equal(raw[0], 0x00, 'PKCS#1 block should start with 0x00');
  assert.equal(raw[1], 0x02, 'the client must use PKCS#1 v1.5 encryption padding, not OAEP');
  const separator = raw.indexOf(0x00, 2);
  assert.ok(separator > 1, 'PKCS#1 padding has no terminator');
  return raw.subarray(separator + 1);
}

const aesEncrypt = (plain, key) => {
  const c = crypto.createCipheriv('aes-256-ecb', key, null);
  return Buffer.concat([c.update(Buffer.from(plain, 'utf8')), c.final()]).toString('base64');
};
const aesDecrypt = (b64, key) => {
  const d = crypto.createDecipheriv('aes-256-ecb', key, null);
  return Buffer.concat([d.update(Buffer.from(b64, 'base64')), d.final()]).toString('utf8');
};

const CLIENT_ID = 'klogubizz-test-client';
const CLIENT_SECRET = 'klogubizz-test-secret';
const USERNAME = 'AURORA_API';
const PASSWORD = 'Portal@12345';
const GSTIN = '27AAPFU0939F1ZV';

/**
 * A portal, configurable per test.
 *
 * `behaviour` lets a test ask for the responses that actually matter and are
 * impossible to provoke on demand from the real thing: a duplicate IRN, an
 * expired token, the nested-vs-flat authentication response.
 */
function startFakePortal(behaviour = {}) {
  const state = {
    requests: [],
    sessions: new Map(),
    authCalls: 0,
    tokensIssued: [],
    /**
     * A token the portal will now reject. Set by a test *after* the token has
     * been issued and used, which is the only way to reach the retry path —
     * mutable state rather than fixed behaviour for exactly that reason.
     */
    expireOnce: null
  };

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const json = body ? JSON.parse(body) : {};
      state.requests.push({ url: req.url, headers: req.headers, json });
      const reply = payload => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      // Paths the client is expected to try, in either deployment's spelling.
      const isAuth = /\/auth$/.test(req.url);
      const isCancel = /Invoice\/Cancel$/.test(req.url);
      const isGenerate = !isCancel && /Invoice$/.test(req.url);

      if (behaviour.notFoundFirst && !state.usedFallback && !isAuth) {
        // Exercises the path fallback: a 404 on the first spelling.
        state.usedFallback = true;
        res.writeHead(404);
        return res.end('not found');
      }

      if (isAuth) {
        state.authCalls += 1;
        if (req.headers.client_id !== CLIENT_ID || req.headers.client_secret !== CLIENT_SECRET) {
          return reply({ Status: '0', ErrorDetails: [{ ErrorCode: '1002', ErrorMessage: 'Invalid client credentials' }] });
        }
        if (json.UserName !== USERNAME) {
          return reply({ Status: '0', ErrorDetails: [{ ErrorCode: '1003', ErrorMessage: 'Invalid username' }] });
        }
        const password = portalDecrypt(json.Password).toString('utf8');
        if (password !== PASSWORD) {
          return reply({ Status: '0', ErrorDetails: [{ ErrorCode: '1004', ErrorMessage: 'Invalid password' }] });
        }

        const appKey = Buffer.from(portalDecrypt(json.AppKey).toString('utf8'), 'base64');
        assert.equal(appKey.length, 32, 'the AppKey must arrive as base64 of 32 bytes');

        const sessionKey = crypto.randomBytes(32);
        const authToken = `token-${state.authCalls}`;
        state.sessions.set(authToken, sessionKey);
        state.tokensIssued.push(authToken);

        // The session key wrapped under the AppKey, in whichever encoding this
        // test asked for. Both are seen in the wild.
        const wrapped = behaviour.sekAsBase64Text
          ? aesEncrypt(sessionKey.toString('base64'), appKey)
          : (() => {
            const c = crypto.createCipheriv('aes-256-ecb', appKey, null);
            return Buffer.concat([c.update(sessionKey), c.final()]).toString('base64');
          })();

        const payload = { AuthToken: authToken, Sek: wrapped, TokenExpiry: '2026-09-02 18:00:00' };
        return reply(behaviour.flatAuthResponse
          ? { Status: '1', ...payload, ErrorDetails: null }
          : { Status: '1', Data: payload, ErrorDetails: null });
      }

      const sessionKey = state.sessions.get(req.headers.authtoken);
      if (!sessionKey || state.expireOnce === req.headers.authtoken) {
        return reply({ Status: '0', ErrorDetails: [{ ErrorCode: '1005', ErrorMessage: 'Invalid token' }] });
      }
      if (req.headers.gstin !== GSTIN || req.headers.user_name !== USERNAME) {
        return reply({ Status: '0', ErrorDetails: [{ ErrorCode: '1007', ErrorMessage: 'GSTIN/user mismatch' }] });
      }

      const sent = JSON.parse(aesDecrypt(json.Data, sessionKey));
      state.lastPayload = sent;

      if (isGenerate) {
        if (behaviour.duplicate) {
          return reply({
            Status: '0',
            ErrorDetails: [{ ErrorCode: '2150', ErrorMessage: 'Duplicate IRN' }],
            InfoDtls: [{ InfCd: 'DUPIRN', Desc: { Irn: 'd'.repeat(64), AckNo: '112010001', AckDt: '2026-08-20 11:04:00' } }]
          });
        }
        if (behaviour.rejectWith) {
          return reply({ Status: '0', ErrorDetails: behaviour.rejectWith });
        }
        return reply({
          Status: '1',
          Data: aesEncrypt(JSON.stringify({
            Irn: 'a'.repeat(64),
            AckNo: '112010036512345',
            AckDt: '2026-08-20 11:04:00',
            SignedInvoice: 'signed.invoice.jws',
            SignedQRCode: `eyJhbGciOiJSUzI1NiJ9.${'X'.repeat(700)}.sig`,
            Status: 'ACT'
          }), sessionKey),
          ErrorDetails: null
        });
      }

      if (isCancel) {
        return reply({
          Status: '1',
          Data: aesEncrypt(JSON.stringify({ Irn: sent.Irn, CancelDate: '2026-08-20 15:30:00' }), sessionKey),
          ErrorDetails: null
        });
      }

      res.writeHead(404);
      return res.end('unknown');
    });
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        state,
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise(done => { server.close(done); })
      });
    });
  });
}

function configFor(portal, overrides = {}) {
  return {
    baseUrl: portal.baseUrl,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    gstin: GSTIN,
    username: USERNAME,
    password: PASSWORD,
    publicKeyPem: keyPair.publicKey,
    environment: 'sandbox',
    ...overrides
  };
}

/** Fresh module state per test: the provider caches auth tokens per taxpayer. */
function freshProvider() {
  const provider = require('../src/services/irp/nicIrpProvider');
  provider.clearSessions();
  return provider;
}

// ── The crypto, in isolation ─────────────────────────────────────────────

test('the password and AppKey are encrypted the way the portal requires', () => {
  const encrypted = nicCrypto.encryptPassword('Portal@12345', keyPair.publicKey);
  assert.equal(portalDecrypt(encrypted).toString('utf8'), 'Portal@12345');

  const appKey = nicCrypto.generateAppKey();
  assert.equal(appKey.length, 32, 'the AppKey doubles as an AES-256 key');
  /**
   * The AppKey goes on the wire as *base64 text*, while the AES key used locally
   * is the raw bytes behind it. The specification does not spell this out and
   * getting it backwards produces a session key of the wrong length.
   */
  const seen = portalDecrypt(nicCrypto.encryptAppKey(appKey, keyPair.publicKey)).toString('utf8');
  assert.deepEqual(Buffer.from(seen, 'base64'), appKey);
});

test('the session key is unwrapped whichever way the portal encodes it', () => {
  const appKey = nicCrypto.generateAppKey();
  const sessionKey = crypto.randomBytes(32);
  const wrap = buf => {
    const c = crypto.createCipheriv('aes-256-ecb', appKey, null);
    return Buffer.concat([c.update(buf), c.final()]).toString('base64');
  };

  // Both encodings are in use, and which arrives is not settled by the spec.
  assert.deepEqual(nicCrypto.decryptSek(wrap(sessionKey), appKey), sessionKey);
  assert.deepEqual(nicCrypto.decryptSek(wrap(Buffer.from(sessionKey.toString('base64'))), appKey), sessionKey);
});

test('a wrong AppKey is refused rather than producing a wrong key', () => {
  const appKey = nicCrypto.generateAppKey();
  const c = crypto.createCipheriv('aes-256-ecb', appKey, null);
  const wrapped = Buffer.concat([c.update(crypto.randomBytes(32)), c.final()]).toString('base64');
  // Silently returning a mis-sized key would fail later as an opaque AES error.
  assert.throws(() => nicCrypto.decryptSek(wrapped, nicCrypto.generateAppKey()));
});

test('a payload survives the round trip under the session key', () => {
  const sek = crypto.randomBytes(32);
  const payload = { Version: '1.1', DocDtls: { No: 'AST-2026-247' }, ItemList: [{ SlNo: '1' }] };
  const body = nicCrypto.encryptPayload(payload, sek);
  assert.ok(body.Data, 'the request body is { Data: <base64> }');
  assert.deepEqual(nicCrypto.decryptResponseData(body.Data, sek), payload);
});

// ── The provider, against the portal ─────────────────────────────────────

test('an invoice is reported and its IRN and signed QR come back', async () => {
  const portal = await startFakePortal();
  try {
    const provider = freshProvider();
    const result = await provider.generateIrn(configFor(portal), { Version: '1.1', DocDtls: { No: 'AST-2026-247' } });

    assert.equal(result.irn, 'a'.repeat(64));
    assert.equal(result.ackNo, '112010036512345');
    assert.match(result.signedQrCode, /^eyJhbGciOiJSUzI1NiJ9\./);
    assert.equal(result.irpStatus, 'ACT');

    // The portal received the payload we built, decrypted with its session key —
    // which is the end-to-end proof that all four transforms line up.
    assert.equal(portal.state.lastPayload.DocDtls.No, 'AST-2026-247');

    // And the taxpayer's identity travelled in the headers, not the body.
    const generate = portal.state.requests.find(r => /Invoice$/.test(r.url));
    assert.equal(generate.headers.gstin, GSTIN);
    assert.equal(generate.headers.user_name, USERNAME);
    assert.equal(generate.headers.authtoken, 'token-1');
  } finally {
    await portal.close();
  }
});

test('the flat authentication response shape works too', async () => {
  const portal = await startFakePortal({ flatAuthResponse: true, sekAsBase64Text: true });
  try {
    const provider = freshProvider();
    const result = await provider.generateIrn(configFor(portal), { Version: '1.1' });
    assert.equal(result.irn, 'a'.repeat(64));
  } finally {
    await portal.close();
  }
});

test('the auth token is reused across invoices rather than re-fetched', async () => {
  const portal = await startFakePortal();
  try {
    const provider = freshProvider();
    const config = configFor(portal);
    for (let i = 0; i < 3; i += 1) {
      await provider.generateIrn(config, { Version: '1.1', DocDtls: { No: `AST-2026-${i}` } });
    }
    /**
     * Authentication is rate-limited at the portal, so a handshake per invoice
     * gets a batch throttled. One for three invoices is the point of the cache.
     */
    assert.equal(portal.state.authCalls, 1);
  } finally {
    await portal.close();
  }
});

test('a stale token is re-authenticated once and the call retried', async () => {
  const portal = await startFakePortal();
  try {
    const provider = freshProvider();
    const config = configFor(portal);
    await provider.generateIrn(config, { Version: '1.1' });

    // The portal now rejects the token it issued — an expiry we mis-estimated,
    // or the same taxpayer authenticating from another system.
    portal.state.expireOnce = 'token-1';
    const result = await provider.generateIrn(config, { Version: '1.1' });

    assert.equal(result.irn, 'a'.repeat(64), 'the retry succeeded');
    assert.equal(portal.state.authCalls, 2, 're-authenticated exactly once');
  } finally {
    await portal.close();
  }
});

test('a duplicate IRN is recovered, not reported as a failure', async () => {
  const portal = await startFakePortal({ duplicate: true });
  try {
    const provider = freshProvider();
    const result = await provider.generateIrn(configFor(portal), { Version: '1.1' });

    /**
     * The case this exists for: a first attempt reached the portal but its
     * response did not reach us. The invoice *is* registered. Calling that a
     * failure would leave a tenant with an invoice the government considers
     * reported and this product considers failed, with no way to reconcile them.
     */
    assert.equal(result.irn, 'd'.repeat(64));
    assert.equal(result.duplicate, true);
    // No signed QR comes back with a duplicate, and the caller has to know.
    assert.equal(result.signedQrCode, '');
  } finally {
    await portal.close();
  }
});

test('a rejection names the portal error rather than swallowing it', async () => {
  const portal = await startFakePortal({
    rejectWith: [
      { ErrorCode: '2172', ErrorMessage: 'For intra state transaction IGST amounts are not applicable' },
      { ErrorCode: '2189', ErrorMessage: 'Invalid total invoice value' }
    ]
  });
  try {
    const provider = freshProvider();
    await assert.rejects(
      () => provider.generateIrn(configFor(portal), { Version: '1.1' }),
      error => {
        assert.equal(error.code, 'IRP_REJECTED');
        // Both codes, because the portal reports every problem at once and
        // fixing one of two is a second round trip.
        assert.match(error.message, /2172/);
        assert.match(error.message, /2189/);
        assert.equal(error.irpErrors.length, 2);
        return true;
      }
    );
  } finally {
    await portal.close();
  }
});

test('wrong credentials are refused with the portal reason', async () => {
  const portal = await startFakePortal();
  try {
    const provider = freshProvider();
    await assert.rejects(
      () => provider.testCredentials(configFor(portal, { password: 'wrong-password' })),
      error => {
        assert.equal(error.code, 'IRP_REJECTED');
        assert.match(error.message, /Invalid password/);
        return true;
      }
    );
  } finally {
    await portal.close();
  }
});

test('an IRN is cancelled with a reason the portal accepts', async () => {
  const portal = await startFakePortal();
  try {
    const provider = freshProvider();
    const config = configFor(portal);
    const result = await provider.cancelIrn(config, { irn: 'a'.repeat(64), reasonCode: '2', remarks: 'Wrong quantity' });

    assert.equal(result.irn, 'a'.repeat(64));
    assert.ok(result.cancelDate);
    // `CnlRsn` is a numeric code the portal defines; anything else is refused.
    assert.equal(portal.state.lastPayload.CnlRsn, '2');
    assert.equal(portal.state.lastPayload.CnlRem, 'Wrong quantity');
  } finally {
    await portal.close();
  }
});

test('a credentials test authenticates without registering anything', async () => {
  const portal = await startFakePortal();
  try {
    const provider = freshProvider();
    const result = await provider.testCredentials(configFor(portal));
    assert.equal(result.ok, true);

    /**
     * Nothing was reported. A "test" that generated a real IRN would leave a
     * document registered against the business every time somebody pressed the
     * button, and an IRN cannot be cancelled after twenty-four hours.
     */
    assert.equal(portal.state.requests.filter(r => /Invoice$/.test(r.url)).length, 0);
  } finally {
    await portal.close();
  }
});

test('a portal that is unreachable says so rather than hanging', async () => {
  const provider = freshProvider();
  // A closed port on localhost: refused immediately.
  await assert.rejects(
    () => provider.testCredentials(configFor({ baseUrl: 'http://127.0.0.1:1' })),
    error => {
      assert.equal(error.code, 'IRP_UNREACHABLE');
      assert.equal(error.statusCode, 504);
      return true;
    }
  );
});

test('the error envelope is unwrapped however the portal wrapped it', () => {
  const provider = freshProvider();
  const expected = [{ code: '2150', message: 'Duplicate IRN' }];

  // An array, a JSON string of one, and base64 of that string are all in use.
  assert.deepEqual(provider.parseErrorDetails([{ ErrorCode: '2150', ErrorMessage: 'Duplicate IRN' }]), expected);
  assert.deepEqual(provider.parseErrorDetails('[{"ErrorCode":"2150","ErrorMessage":"Duplicate IRN"}]'), expected);
  assert.deepEqual(
    provider.parseErrorDetails(Buffer.from('[{"ErrorCode":"2150","ErrorMessage":"Duplicate IRN"}]').toString('base64')),
    expected
  );
  // And plain prose, rather than losing it.
  assert.deepEqual(provider.parseErrorDetails('Service unavailable'), [{ code: '', message: 'Service unavailable' }]);
});
