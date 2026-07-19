import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { FAILURE_WINDOW_MS, LOCKOUT_MS, SESSION_TTL_MS, loadConfig } from "../../src/server/config.mjs";
import { createScryptPasswordHash } from "../../src/server/security.mjs";
import { createGramadoService } from "../../src/server/service.mjs";
import { GramadoStore, MAX_ANONYMOUS_SESSIONS } from "../../src/server/store.mjs";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";

const PASSWORD = "a secure edit password";
const SECRET = "test-secret-that-is-at-least-32-bytes-long";
const START = Date.parse("2026-07-15T12:00:00.000Z");
const PASSWORD_HASH = await createScryptPasswordHash(PASSWORD, { salt: Buffer.alloc(16, 3) });

function fixture() {
  let time = START;
  const database = new DatabaseSync(":memory:");
  const service = createGramadoService({
    database,
    config: {
      passwordHash: PASSWORD_HASH,
      ipHmacSecret: SECRET,
      clock: () => time,
      initialDocument: createDefaultDocument(),
    },
  });
  return {
    database,
    service,
    advance(milliseconds) {
      time += milliseconds;
    },
    now() {
      return time;
    },
  };
}

test("enables password-free editing while enforcing CSRF and revisions on updates", async (context) => {
  const testState = fixture();
  context.after(() => testState.database.close());

  assert.equal(testState.service.getDocument().document.meta.destination, "Gramado");
  assert.equal(testState.service.getDocument().revision, 1);
  assert.equal(testState.service.getDocument().updatedAt, new Date(START).toISOString());

  const anonymous = testState.service.getSessionState();
  assert.equal(anonymous.authenticated, false);
  assert.equal(Date.parse(anonymous.expiresAt) - testState.now(), SESSION_TTL_MS);
  await assert.rejects(() => testState.service.updateDocument({
    sessionToken: anonymous.token,
    csrfToken: anonymous.csrfToken,
    revision: 1,
    document: {},
  }), (error) => error.status === 401);

  const authenticated = testState.service.enableEditing({
    sessionToken: anonymous.token,
    csrfToken: anonymous.csrfToken,
  });
  assert.equal(authenticated.authenticated, true);
  assert.notEqual(authenticated.token, anonymous.token);

  const changedDocument = createDefaultDocument();
  changedDocument.meta.days = "10";
  const updated = await testState.service.updateDocument({
    sessionToken: authenticated.token,
    csrfToken: authenticated.csrfToken,
    revision: 1,
    document: changedDocument,
  });
  assert.equal(updated.revision, 2);
  assert.equal(updated.document.meta.days, "10");

  await assert.rejects(() => testState.service.updateDocument({
    sessionToken: authenticated.token,
    csrfToken: authenticated.csrfToken,
    revision: 1,
    document: createDefaultDocument(),
  }), (error) => error.status === 409 && error.details.currentRevision === 2);
  assert.throws(() => testState.service.logout({
    sessionToken: authenticated.token,
    csrfToken: "incorrect",
  }), (error) => error.status === 403);

  testState.service.logout({
    sessionToken: authenticated.token,
    csrfToken: authenticated.csrfToken,
  });
  assert.equal(testState.service.findSession(authenticated.token), null);
});

test("does not impose a cooldown after repeated incorrect passwords", async (context) => {
  const testState = fixture();
  context.after(() => testState.database.close());
  const ip = "::ffff:192.0.2.10";
  const anonymous = testState.service.getSessionState();
  const badLogin = () => testState.service.login({
    sessionToken: anonymous.token,
    csrfToken: anonymous.csrfToken,
    password: "wrong",
    ip,
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(badLogin, (error) => error.status === 401 && error.code === "invalid_credentials");
  }
  assert.equal(testState.database.prepare("SELECT COUNT(*) AS count FROM login_failures").get().count, 0);
  assert.equal(testState.database.prepare("SELECT COUNT(*) AS count FROM login_lockouts").get().count, 0);

  const authenticated = await testState.service.login({
    sessionToken: anonymous.token,
    csrfToken: anonymous.csrfToken,
    password: PASSWORD,
    ip,
  });
  assert.equal(authenticated.authenticated, true);
});

test("bounds anonymous sessions without evicting authenticated sessions", (context) => {
  const database = new DatabaseSync(":memory:");
  const store = new GramadoStore({ database, initialDocument: createDefaultDocument(), now: START });
  context.after(() => database.close());
  store.createSession(makeStoredSession("authenticated", true));

  for (let index = 0; index <= MAX_ANONYMOUS_SESSIONS; index += 1) {
    store.createSession(makeStoredSession(`anonymous-${index}`, false));
  }

  const counts = database.prepare(`
    SELECT authenticated, COUNT(*) AS count FROM sessions GROUP BY authenticated
  `).all().map((row) => ({ ...row }));
  assert.deepEqual(counts, [
    { authenticated: 0, count: MAX_ANONYMOUS_SESSIONS },
    { authenticated: 1, count: 1 },
  ]);
  assert.equal(store.getSession("anonymous-1000", START)?.authenticated, false);
  assert.equal(store.getSession("authenticated", START)?.authenticated, true);
});

test("globally removes stale login failures and expired lockouts", (context) => {
  const database = new DatabaseSync(":memory:");
  const store = new GramadoStore({ database, initialDocument: createDefaultDocument(), now: START });
  context.after(() => database.close());
  database.prepare("INSERT INTO login_failures (ip_hash, failed_at) VALUES (?, ?)")
    .run("stale-ip", START - FAILURE_WINDOW_MS);
  database.prepare("INSERT INTO login_failures (ip_hash, failed_at) VALUES (?, ?)")
    .run("fresh-ip", START - 1);
  database.prepare("INSERT INTO login_lockouts (ip_hash, locked_until) VALUES (?, ?)")
    .run("expired-ip", START);
  database.prepare("INSERT INTO login_lockouts (ip_hash, locked_until) VALUES (?, ?)")
    .run("active-ip", START + LOCKOUT_MS);

  assert.deepEqual(store.recordFailedLogin("current-ip", START), { locked: false, failures: 1 });
  const failures = database.prepare("SELECT ip_hash FROM login_failures ORDER BY ip_hash").all()
    .map((row) => ({ ...row }));
  const lockouts = database.prepare("SELECT ip_hash FROM login_lockouts").all()
    .map((row) => ({ ...row }));
  assert.deepEqual(failures, [
    { ip_hash: "current-ip" },
    { ip_hash: "fresh-ip" },
  ]);
  assert.deepEqual(lockouts, [{ ip_hash: "active-ip" }]);
});

test("reads configurable attachment byte ceilings from the environment", () => {
  const overrides = {
    passwordHash: PASSWORD_HASH,
    ipHmacSecret: SECRET,
    initialDocument: createDefaultDocument(),
  };
  const config = loadConfig(overrides, {
    GRAMADO_MAX_ATTACHMENT_BYTES: "52428800",
    GRAMADO_MAX_ATTACHMENT_STORAGE_BYTES: "2147483648",
  });
  assert.equal(config.maxAttachmentBytes, 50 * 1024 * 1024);
  assert.equal(config.maxAttachmentStorageBytes, 2 * 1024 * 1024 * 1024);
  assert.throws(() => loadConfig(overrides, {
    GRAMADO_MAX_ATTACHMENT_BYTES: "100",
    GRAMADO_MAX_ATTACHMENT_STORAGE_BYTES: "99",
  }), /must be at least maxAttachmentBytes/);
});

function makeStoredSession(tokenHash, authenticated) {
  return { tokenHash, authenticated, now: START, expiresAt: START + SESSION_TTL_MS };
}
