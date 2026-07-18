import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { once } from "node:events";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { createScryptPasswordHash } from "../../src/server/security.mjs";
import { createGramadoRouter } from "../../src/server/routes.mjs";
import { createHttpApp } from "../../src/server/http-app.mjs";

const SECRET = "integration-secret-that-is-at-least-32-bytes";
const PASSWORD = "161221";
const HASH = await createScryptPasswordHash(PASSWORD, { salt: Buffer.alloc(16, 4) });

test("serves the app and completes authenticated document update over HTTP", async (context) => {
  const database = new DatabaseSync(":memory:");
  const router = createGramadoRouter({
    database,
    config: { passwordHash: HASH, ipHmacSecret: SECRET, initialDocument: createDefaultDocument() },
  });
  const app = createHttpApp({ root: process.cwd(), router });
  const server = app.listen(0);
  await once(server, "listening");
  context.after(() => { server.close(); database.close(); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);

  const anonymousResponse = await fetch(`${baseUrl}/api/session`);
  const anonymous = await anonymousResponse.json();
  const cookie = cookieValue(anonymousResponse);
  const loginResponse = await apiFetch(`${baseUrl}/api/login`, cookie, anonymous.csrfToken, { password: PASSWORD });
  assert.equal(loginResponse.response.status, 200);
  assert.match(loginResponse.response.headers.get("set-cookie"), /HttpOnly.*SameSite=Strict/i);

  const changed = createDefaultDocument();
  changed.meta.destination = "Gramado Test";
  const save = await apiFetch(`${baseUrl}/api/document`, loginResponse.cookie, loginResponse.body.csrfToken, {
    revision: 1,
    document: changed,
  }, "PUT");
  assert.equal(save.response.status, 200);
  assert.equal(save.body.document.meta.destination, "Gramado Test");
});

async function apiFetch(url, cookie, csrfToken, body, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json(), cookie: cookieValue(response) || cookie };
}

function cookieValue(response) {
  return response.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
}
