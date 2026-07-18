import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDefaultDocument } from "../../src/shared/default-document.mjs";
import { createHttpApp } from "../../src/server/http-app.mjs";
import { createGramadoRouter } from "../../src/server/routes.mjs";
import { createScryptPasswordHash } from "../../src/server/security.mjs";

const SECRET = "media-http-secret-that-is-at-least-32-bytes";
const PASSWORD = "media test password";
const HASH = await createScryptPasswordHash(PASSWORD, { salt: Buffer.alloc(16, 9) });

test("protects uploads and deletions while serving opaque WebP media publicly", async (context) => {
  const fixture = await startFixture(context);
  const anonymous = await getSession(fixture.baseUrl);

  const unauthenticated = await upload(fixture.baseUrl, anonymous, "image/jpeg", "jpeg");
  assert.equal(unauthenticated.status, 401);

  const authenticated = await login(fixture.baseUrl, anonymous);
  const noCsrf = await upload(fixture.baseUrl, { ...authenticated, csrfToken: "wrong" }, "image/jpeg", "jpeg");
  assert.equal(noCsrf.status, 403);

  for (const [contentType, body] of [["image/jpeg", "jpeg"], ["image/png", "png!"], ["image/webp", "webp"]]) {
    const response = await upload(fixture.baseUrl, authenticated, contentType, body);
    assert.equal(response.status, 201);
  }

  const response = await upload(fixture.baseUrl, authenticated, "image/jpeg; charset=binary", "jpeg");
  const media = await response.json();
  assert.equal(response.status, 201);
  assert.match(media.id, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(media.contentType, "image/webp");
  assert.equal(response.headers.get("location"), media.url);

  const columns = fixture.database.prepare("PRAGMA table_info(media)").all().map((column) => column.name);
  assert.equal(columns.some((name) => name.includes("filename")), false);

  const publicRead = await fetch(`${fixture.baseUrl}${media.url}`);
  assert.equal(publicRead.status, 200);
  assert.equal(publicRead.headers.get("content-type"), "image/webp");
  assert.equal(publicRead.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(publicRead.headers.get("content-length"), String(Buffer.byteLength("encoded-webp")));
  assert.equal(publicRead.headers.get("x-content-type-options"), "nosniff");
  assert.equal(publicRead.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.match(publicRead.headers.get("content-security-policy"), /default-src 'none'/);
  assert.equal(Buffer.from(await publicRead.arrayBuffer()).toString(), "encoded-webp");

  const cached = await fetch(`${fixture.baseUrl}${media.url}`, {
    headers: { "If-None-Match": publicRead.headers.get("etag") },
  });
  assert.equal(cached.status, 304);

  const unauthenticatedDelete = await fetch(`${fixture.baseUrl}${media.url}`, { method: "DELETE" });
  assert.equal(unauthenticatedDelete.status, 401);

  const csrfFailure = await fetch(`${fixture.baseUrl}${media.url}`, {
    method: "DELETE",
    headers: { Cookie: authenticated.cookie, "X-CSRF-Token": "wrong" },
  });
  assert.equal(csrfFailure.status, 403);

  const deletion = await fetch(`${fixture.baseUrl}${media.url}`, {
    method: "DELETE",
    headers: authHeaders(authenticated),
  });
  assert.equal(deletion.status, 202);
  assert.equal((await fetch(`${fixture.baseUrl}${media.url}`)).status, 200);
  assert.deepEqual((await fixture.router.cleanupStagedMedia()).removed, [media.id]);
  assert.equal((await fetch(`${fixture.baseUrl}${media.url}`)).status, 404);
});

test("rejects MIME spoofing, malformed images, byte overflow, and pixel overflow", async (context) => {
  const fixture = await startFixture(context, { maxMediaBytes: 4 });
  const authenticated = await login(fixture.baseUrl, await getSession(fixture.baseUrl));

  const spoofed = await upload(fixture.baseUrl, authenticated, "image/jpeg", "png!");
  assert.equal(spoofed.status, 415);
  assert.equal((await spoofed.json()).error.code, "mime_mismatch");

  const malformed = await upload(fixture.baseUrl, authenticated, "image/jpeg", "bad!");
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, "invalid_image");

  const tooManyBytes = await upload(fixture.baseUrl, authenticated, "image/jpeg", "12345");
  assert.equal(tooManyBytes.status, 413);
  assert.equal((await tooManyBytes.json()).error.code, "image_too_large");

  const pixels = await upload(fixture.baseUrl, authenticated, "image/jpeg", "huge");
  assert.equal(pixels.status, 413);
  assert.equal((await pixels.json()).error.code, "image_too_large");
});

test("provides authenticated custom-template CRUD with unique names and revisions", async (context) => {
  const fixture = await startFixture(context);
  const anonymousList = await fetch(`${fixture.baseUrl}/api/custom-templates`);
  assert.equal(anonymousList.status, 401);
  const authenticated = await login(fixture.baseUrl, await getSession(fixture.baseUrl));

  const missingCsrf = await jsonRequest(fixture.baseUrl, "/api/custom-templates", {
    method: "POST",
    session: { ...authenticated, csrfToken: "wrong" },
    body: { name: "Winter", template: templatePayload("Snow") },
  });
  assert.equal(missingCsrf.status, 403);

  const createdResponse = await jsonRequest(fixture.baseUrl, "/api/custom-templates", {
    method: "POST",
    session: authenticated,
    body: { name: " Winter plan ", template: templatePayload("Snow") },
  });
  const created = await createdResponse.json();
  assert.equal(createdResponse.status, 201);
  assert.equal(created.name, "Winter plan");
  assert.equal(created.revision, 1);

  const duplicate = await jsonRequest(fixture.baseUrl, "/api/custom-templates", {
    method: "POST",
    session: authenticated,
    body: { name: "WINTER PLAN", template: templatePayload("Duplicate") },
  });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.code, "template_name_conflict");

  const list = await fetch(`${fixture.baseUrl}/api/custom-templates`, {
    headers: { Cookie: authenticated.cookie },
  });
  assert.deepEqual((await list.json()).templates.map((template) => template.id), [created.id]);

  const fetched = await fetch(`${fixture.baseUrl}/api/custom-templates/${created.id}`, {
    headers: { Cookie: authenticated.cookie },
  });
  assert.equal((await fetched.json()).template.block.data.title, "Snow");

  const updatedResponse = await jsonRequest(fixture.baseUrl, `/api/custom-templates/${created.id}`, {
    method: "PUT",
    session: authenticated,
    body: { name: "Summer plan", template: templatePayload("Sun"), revision: 1 },
  });
  const updated = await updatedResponse.json();
  assert.equal(updated.revision, 2);

  const stale = await jsonRequest(fixture.baseUrl, `/api/custom-templates/${created.id}`, {
    method: "PUT",
    session: authenticated,
    body: { name: "Stale", template: templatePayload("Stale"), revision: 1 },
  });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).error.details.currentRevision, 2);

  const staleDelete = await jsonRequest(fixture.baseUrl, `/api/custom-templates/${created.id}`, {
    method: "DELETE",
    session: authenticated,
    body: { revision: 1 },
  });
  assert.equal(staleDelete.status, 409);

  const deleted = await jsonRequest(fixture.baseUrl, `/api/custom-templates/${created.id}`, {
    method: "DELETE",
    session: authenticated,
    body: { revision: 2 },
  });
  assert.equal(deleted.status, 204);
  assert.equal((await fetch(`${fixture.baseUrl}/api/custom-templates/${created.id}`, {
    headers: { Cookie: authenticated.cookie },
  })).status, 404);
});

test("blocks referenced media deletion and rechecks references during staged cleanup", async (context) => {
  const fixture = await startFixture(context);
  const authenticated = await login(fixture.baseUrl, await getSession(fixture.baseUrl));
  const uploaded = await upload(fixture.baseUrl, authenticated, "image/jpeg", "jpeg");
  const media = await uploaded.json();
  const created = await jsonRequest(fixture.baseUrl, "/api/custom-templates", {
    method: "POST",
    session: authenticated,
    body: { name: "Referenced", template: templatePayload("Referenced", media.id) },
  });
  const template = await created.json();

  const blocked = await fetch(`${fixture.baseUrl}${media.url}`, {
    method: "DELETE",
    headers: authHeaders(authenticated),
  });
  assert.equal(blocked.status, 409);
  assert.equal((await blocked.json()).error.code, "media_in_use");

  await jsonRequest(fixture.baseUrl, `/api/custom-templates/${template.id}`, {
    method: "PUT",
    session: authenticated,
    body: { name: template.name, template: templatePayload("Unreferenced"), revision: 1 },
  });
  const staged = await fetch(`${fixture.baseUrl}${media.url}`, {
    method: "DELETE",
    headers: authHeaders(authenticated),
  });
  assert.equal(staged.status, 202);

  fixture.database.prepare(`
    UPDATE custom_templates SET template_json = ? WHERE id = ?
  `).run(JSON.stringify({ image: media.url }), template.id);
  const cleanup = await fixture.router.cleanupStagedMedia();
  assert.deepEqual(cleanup.restored, [media.id]);
  assert.equal(fixture.database.prepare("SELECT state FROM media WHERE id = ?").get(media.id).state, "active");
});

test("rejects unstructured templates and reclaims old unreferenced uploads", async (context) => {
  const fixture = await startFixture(context);
  const authenticated = await login(fixture.baseUrl, await getSession(fixture.baseUrl));
  const invalid = await jsonRequest(fixture.baseUrl, "/api/custom-templates", {
    method: "POST",
    session: authenticated,
    body: { name: "Unsafe", template: { html: "<script>bad()</script>" } },
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "invalid_template");

  const uploaded = await upload(fixture.baseUrl, authenticated, "image/jpeg", "jpeg");
  const media = await uploaded.json();
  fixture.database.prepare("UPDATE media SET created_at = 0 WHERE id = ?").run(media.id);
  const cleanup = await fixture.router.cleanupStagedMedia();
  assert.deepEqual(cleanup.removed, [media.id]);
  assert.equal(fixture.database.prepare("SELECT id FROM media WHERE id = ?").get(media.id), undefined);
});

test("keeps attachment metadata and bytes authenticated while supporting safe previews", async (context) => {
  const fixture = await startFixture(context);
  const anonymous = await getSession(fixture.baseUrl);
  assert.equal((await fetch(`${fixture.baseUrl}/api/attachments?section=transport`)).status, 401);
  const authenticated = await login(fixture.baseUrl, anonymous);
  const blockId = createDefaultDocument().sections.transport[0].id;

  const createdResponse = await uploadAttachment(fixture.baseUrl, authenticated, {
    section: "transport", blockId, name: "booking.pdf", contentType: "application/pdf", body: "%PDF-private",
  });
  const created = await createdResponse.json();
  assert.equal(createdResponse.status, 201);
  assert.equal(created.name, "booking.pdf");
  assert.equal(created.previewKind, "pdf");
  assert.equal(created.previewable, true);

  const list = await fetch(`${fixture.baseUrl}/api/attachments?section=transport`, { headers: { Cookie: authenticated.cookie } });
  assert.equal(list.status, 200);
  assert.deepEqual((await list.json()).attachments.map((attachment) => attachment.name), ["booking.pdf"]);

  const contentPath = `/api/attachments/${created.id}/content`;
  assert.equal((await fetch(`${fixture.baseUrl}${contentPath}`)).status, 401);
  const download = await fetch(`${fixture.baseUrl}${contentPath}`, { headers: { Cookie: authenticated.cookie } });
  assert.equal(download.status, 200);
  assert.match(download.headers.get("content-disposition"), /^attachment;/);
  assert.equal(download.headers.get("cache-control"), "private, no-store");
  assert.equal(await download.text(), "%PDF-private");
  const preview = await fetch(`${fixture.baseUrl}${contentPath}?mode=preview`, { headers: { Cookie: authenticated.cookie } });
  assert.equal(preview.status, 200);
  assert.match(preview.headers.get("content-disposition"), /^inline;/);
  assert.equal(preview.headers.get("x-frame-options"), "SAMEORIGIN");

  const unsafeResponse = await uploadAttachment(fixture.baseUrl, authenticated, {
    section: "transport", blockId, name: "page.html", contentType: "text/html", body: "<script>bad()</script>",
  });
  const unsafe = await unsafeResponse.json();
  assert.equal(unsafe.previewable, false);
  assert.equal((await fetch(`${fixture.baseUrl}/api/attachments/${unsafe.id}/content?mode=preview`, { headers: { Cookie: authenticated.cookie } })).status, 415);

  const renamed = await jsonRequest(fixture.baseUrl, `/api/attachments/${created.id}`, {
    method: "PATCH", session: authenticated, body: { name: "confirmed-booking.pdf" },
  });
  assert.equal((await renamed.json()).name, "confirmed-booking.pdf");

  const replacement = await fetch(`${fixture.baseUrl}/api/attachments/${created.id}/content?name=photo.png`, {
    method: "PUT",
    headers: { ...authHeaders(authenticated), "Content-Type": "image/png" },
    body: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]),
  });
  assert.equal((await replacement.json()).previewKind, "image");

  const documentState = await (await fetch(`${fixture.baseUrl}/api/document`)).json();
  documentState.document.sections.transport.shift();
  const saved = await jsonRequest(fixture.baseUrl, "/api/document", {
    method: "PUT",
    session: authenticated,
    body: { revision: documentState.revision, document: documentState.document },
  });
  assert.equal(saved.status, 200);
  const afterDelete = await fetch(`${fixture.baseUrl}/api/attachments?section=transport`, { headers: { Cookie: authenticated.cookie } });
  assert.deepEqual((await afterDelete.json()).attachments, []);
});

test("enforces per-file and total attachment limits", async (context) => {
  const fixture = await startFixture(context, { maxAttachmentBytes: 5, maxAttachmentStorageBytes: 8 });
  const authenticated = await login(fixture.baseUrl, await getSession(fixture.baseUrl));
  const blockId = createDefaultDocument().sections.transport[0].id;
  assert.equal((await uploadAttachment(fixture.baseUrl, authenticated, {
    section: "transport", blockId, name: "first.bin", contentType: "application/octet-stream", body: "12345",
  })).status, 201);
  const quota = await uploadAttachment(fixture.baseUrl, authenticated, {
    section: "transport", blockId, name: "second.bin", contentType: "application/octet-stream", body: "1234",
  });
  assert.equal(quota.status, 507);
  assert.equal((await quota.json()).error.code, "attachment_storage_full");
  const oversized = await uploadAttachment(fixture.baseUrl, authenticated, {
    section: "transport", blockId, name: "large.bin", contentType: "application/octet-stream", body: "123456",
  });
  assert.equal(oversized.status, 413);
});

function templatePayload(title, mediaId) {
  return {
    sectionScope: "all",
    block: {
      id: "template-note",
      type: "note",
      cover: mediaId ? { mediaId, alt: "Template cover", position: "center" } : null,
      data: { title, text: "Template content" },
    },
  };
}

async function startFixture(context, config = {}) {
  const uploadDir = await mkdtemp(join(tmpdir(), "gramado-media-"));
  const database = new DatabaseSync(":memory:");
  const router = createGramadoRouter({
    database,
    sharp: fakeSharp,
    config: {
      passwordHash: HASH,
      ipHmacSecret: SECRET,
      initialDocument: createDefaultDocument(),
      uploadDir,
      attachmentDir: join(uploadDir, "attachments"),
      ...config,
    },
  });
  const server = createHttpApp({ root: process.cwd(), router }).listen(0);
  await once(server, "listening");
  context.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    database.close();
    await rm(uploadDir, { recursive: true, force: true });
  });
  return { database, router, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

function fakeSharp(bytes) {
  const value = bytes.toString();
  const formats = { jpeg: "jpeg", "png!": "png", webp: "webp", huge: "jpeg" };
  const dimensions = value === "huge" ? { width: 5000, height: 5000 } : { width: 20, height: 10 };
  return {
    async metadata() {
      if (value === "bad!") throw new Error("corrupt image");
      return { format: formats[value], ...dimensions };
    },
    rotate() { return this; },
    webp() { return this; },
    async toBuffer() {
      return { data: Buffer.from("encoded-webp"), info: dimensions };
    },
  };
}

async function getSession(baseUrl) {
  const response = await fetch(`${baseUrl}/api/session`);
  return { cookie: cookieValue(response), csrfToken: (await response.json()).csrfToken };
}

async function login(baseUrl, anonymous) {
  const response = await jsonRequest(baseUrl, "/api/login", {
    method: "POST",
    session: anonymous,
    body: { password: PASSWORD },
  });
  return { cookie: cookieValue(response), csrfToken: (await response.json()).csrfToken };
}

function upload(baseUrl, session, contentType, body) {
  return fetch(`${baseUrl}/api/media`, {
    method: "POST",
    headers: { ...authHeaders(session), "Content-Type": contentType },
    body,
  });
}

function uploadAttachment(baseUrl, session, input) {
  return fetch(`${baseUrl}/api/attachments/${input.section}/${encodeURIComponent(input.blockId)}?name=${encodeURIComponent(input.name)}`, {
    method: "POST",
    headers: { ...authHeaders(session), "Content-Type": input.contentType },
    body: input.body,
  });
}

function jsonRequest(baseUrl, path, options) {
  return fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: { ...authHeaders(options.session), "Content-Type": "application/json" },
    body: JSON.stringify(options.body),
  });
}

function authHeaders(session) {
  return { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken };
}

function cookieValue(response) {
  return response.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
}
