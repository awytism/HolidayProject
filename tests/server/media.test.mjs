import assert from "node:assert/strict";
import test from "node:test";
import { MAX_MEDIA_BYTES, MAX_MEDIA_PIXELS } from "../../src/server/config.mjs";
import { MediaInputError, MediaStorage } from "../../src/server/media.mjs";

test("sets the media ceilings to 8 MB and 20 megapixels", () => {
  assert.equal(MAX_MEDIA_BYTES, 8 * 1024 * 1024);
  assert.equal(MAX_MEDIA_PIXELS, 20_000_000);
});

test("decodes, auto-orients, and re-encodes accepted images as metadata-free WebP", async () => {
  const calls = {};
  const storage = makeStorage({ format: "jpeg", width: 1200, height: 800 }, calls);

  const result = await storage.process(Buffer.from("jpeg bytes"), "image/jpeg");

  assert.deepEqual(result, { bytes: Buffer.from("webp"), width: 800, height: 1200 });
  assert.deepEqual(calls.constructorOptions, {
    failOn: "error",
    limitInputPixels: 20_000_000,
    sequentialRead: true,
  });
  assert.equal(calls.rotated, true);
  assert.deepEqual(calls.webp, { quality: 82, effort: 4 });
  assert.deepEqual(calls.toBuffer, { resolveWithObject: true });
  assert.equal(calls.withMetadata, undefined);
});

test("rejects MIME spoofing and unsupported declared types", async () => {
  const storage = makeStorage({ format: "png", width: 10, height: 10 });
  await assert.rejects(
    () => storage.process(Buffer.from("png"), "image/jpeg"),
    matchesMediaError(415, "mime_mismatch"),
  );
  await assert.rejects(
    () => storage.process(Buffer.from("gif"), "image/gif"),
    matchesMediaError(415, "unsupported_media_type"),
  );
});

test("enforces encoded-byte and decoded-pixel limits", async () => {
  const byteLimited = makeStorage({ format: "jpeg", width: 1, height: 1 }, {}, { maxBytes: 4 });
  await assert.rejects(
    () => byteLimited.process(Buffer.alloc(5), "image/jpeg"),
    matchesMediaError(413, "image_too_large"),
  );

  const pixelLimited = makeStorage({ format: "webp", width: 5000, height: 4001 });
  await assert.rejects(
    () => pixelLimited.process(Buffer.from("webp"), "image/webp"),
    matchesMediaError(413, "image_too_large"),
  );
});

test("maps decoder pixel-limit failures separately from malformed images", async () => {
  const pixels = makeThrowingStorage(new Error("Input image exceeds pixel limit"));
  await assert.rejects(
    () => pixels.process(Buffer.from("jpeg"), "image/jpeg"),
    matchesMediaError(413, "image_too_large"),
  );

  const malformed = makeThrowingStorage(new Error("corrupt header"));
  await assert.rejects(
    () => malformed.process(Buffer.from("jpeg"), "image/jpeg"),
    matchesMediaError(400, "invalid_image"),
  );
});

function makeStorage(metadata, calls = {}, overrides = {}) {
  const sharp = (_bytes, options) => {
    calls.constructorOptions = options;
    return {
      async metadata() {
        return metadata;
      },
      rotate() {
        calls.rotated = true;
        return this;
      },
      webp(options) {
        calls.webp = options;
        return this;
      },
      async toBuffer(options) {
        calls.toBuffer = options;
        return { data: Buffer.from("webp"), info: { width: metadata.height, height: metadata.width } };
      },
    };
  };
  return new MediaStorage({
    uploadDir: "unused",
    maxBytes: overrides.maxBytes ?? MAX_MEDIA_BYTES,
    maxPixels: MAX_MEDIA_PIXELS,
    sharp,
  });
}

function makeThrowingStorage(error) {
  return new MediaStorage({
    uploadDir: "unused",
    maxBytes: 100,
    maxPixels: MAX_MEDIA_PIXELS,
    sharp() {
      return { async metadata() { throw error; } };
    },
  });
}

function matchesMediaError(status, code) {
  return (error) => error instanceof MediaInputError && error.status === status && error.code === code;
}
