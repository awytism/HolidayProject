import { createRequire } from "node:module";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { newOpaqueToken } from "./security.mjs";

const require = createRequire(import.meta.url);
const MIME_FORMATS = new Map([
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const PIXEL_LIMIT_PATTERN = /pixel limit|image exceeds pixel/i;

export class MediaInputError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "MediaInputError";
    this.status = status;
    this.code = code;
  }
}

export class MediaStorage {
  constructor(options) {
    this.uploadDir = options.uploadDir;
    this.maxBytes = options.maxBytes;
    this.maxPixels = options.maxPixels;
    this.sharp = options.sharp;
  }

  async process(bytes, contentType) {
    assertUpload(bytes, contentType, this.maxBytes);
    const sharp = this.sharp ?? loadSharp();
    let image;
    let metadata;
    try {
      image = sharp(bytes, { failOn: "error", limitInputPixels: this.maxPixels, sequentialRead: true });
      metadata = await image.metadata();
    } catch (error) {
      throw decodeError(error);
    }
    assertDecodedImage(metadata, contentType, this.maxPixels);
    return reencodeImage(image);
  }

  async write(id, bytes) {
    await mkdir(this.uploadDir, { recursive: true });
    const destination = this.pathFor(id);
    const temporary = join(this.uploadDir, `.${id}.${newOpaqueToken()}.tmp`);
    try {
      await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
      await rename(temporary, destination);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  }

  read(id) {
    return readFile(this.pathFor(id));
  }

  remove(id) {
    return rm(this.pathFor(id), { force: true });
  }

  pathFor(id) {
    return join(this.uploadDir, `${id}.webp`);
  }
}

function loadSharp() {
  try {
    return require("sharp");
  } catch (error) {
    error.message = `The sharp dependency is required for media uploads: ${error.message}`;
    throw error;
  }
}

function assertUpload(bytes, contentType, maxBytes) {
  if (!MIME_FORMATS.has(contentType)) {
    throw new MediaInputError(415, "unsupported_media_type", "Only JPEG, PNG, and WebP images are accepted");
  }
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new MediaInputError(400, "invalid_image", "An image body is required");
  }
  if (bytes.length > maxBytes) {
    throw new MediaInputError(413, "image_too_large", "Image exceeds the upload size limit");
  }
}

function assertDecodedImage(metadata, contentType, maxPixels) {
  if (!metadata.width || !metadata.height || !MIME_FORMATS.has(contentType)) {
    throw new MediaInputError(400, "invalid_image", "Image dimensions could not be read");
  }
  if (metadata.format !== MIME_FORMATS.get(contentType)) {
    throw new MediaInputError(415, "mime_mismatch", "Image content does not match its Content-Type");
  }
  if (metadata.width * metadata.height > maxPixels) {
    throw new MediaInputError(413, "image_too_large", "Image exceeds the pixel limit");
  }
}

async function reencodeImage(image) {
  try {
    const output = await image.rotate().webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
    return {
      bytes: output.data,
      width: output.info.width,
      height: output.info.height,
    };
  } catch (error) {
    throw decodeError(error);
  }
}

function decodeError(error) {
  if (PIXEL_LIMIT_PATTERN.test(error?.message)) {
    return new MediaInputError(413, "image_too_large", "Image exceeds the pixel limit");
  }
  return new MediaInputError(400, "invalid_image", "Image could not be decoded");
}
