import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { newOpaqueToken } from "./security.mjs";

const IMAGE_SIGNATURES = Object.freeze([
  ["image/png", (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))],
  ["image/jpeg", (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff],
  ["image/gif", (bytes) => ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))],
  ["image/webp", (bytes) => bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"],
]);

export class AttachmentInputError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "AttachmentInputError";
    this.status = status;
    this.code = code;
  }
}

export class AttachmentStorage {
  constructor(options) {
    this.directory = options.directory;
    this.maxBytes = options.maxBytes;
  }

  validate(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
      throw new AttachmentInputError(400, "invalid_attachment", "An attachment file is required");
    }
    if (bytes.length > this.maxBytes) {
      throw new AttachmentInputError(413, "attachment_too_large", "Attachment exceeds the upload size limit");
    }
  }

  async write(id, bytes) {
    this.validate(bytes);
    await mkdir(this.directory, { recursive: true });
    const destination = this.pathFor(id);
    const temporary = join(this.directory, `.${id}.${newOpaqueToken()}.tmp`);
    try {
      await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
      await rm(destination, { force: true });
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
    return join(this.directory, `${id}.bin`);
  }
}

export function detectPreviewKind(bytes, contentType) {
  if (contentType === "application/pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  const image = IMAGE_SIGNATURES.find(([type, accepts]) => type === contentType && accepts(bytes));
  if (image) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (contentType === "text/plain" && !bytes.includes(0)) return "text";
  return null;
}
