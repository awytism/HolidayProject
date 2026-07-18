import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

const MIN_SCRYPT_N = 16_384;
const MAX_SCRYPT_N = 262_144;
const MAX_SCRYPT_MEMORY_FACTOR = 1_048_576;

export function normalizeIp(value) {
  const candidate = stripAddressDecorations(value);
  const version = isIP(candidate);
  if (version === 4) return candidate;
  if (version !== 6) throw new TypeError("Invalid IP address");

  const canonical = new URL(`http://[${candidate}]/`).hostname.slice(1, -1);
  return mappedIpv4(canonical) ?? canonical;
}

function stripAddressDecorations(value) {
  if (typeof value !== "string") throw new TypeError("Invalid IP address");
  let address = value.trim();
  const bracketed = /^\[([^\]]+)](?::\d+)?$/.exec(address);
  if (bracketed) address = bracketed[1];

  const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(address);
  if (ipv4WithPort) address = ipv4WithPort[1];

  const zoneIndex = address.indexOf("%");
  if (zoneIndex !== -1) address = address.slice(0, zoneIndex);
  return address;
}

function mappedIpv4(address) {
  const words = expandIpv6(address);
  const mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  if (!mapped) return null;
  return `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
}

function expandIpv6(address) {
  const halves = address.split("::");
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  return [...left, ...Array(missing).fill("0"), ...right].map((word) => Number.parseInt(word, 16));
}

export function hmacIp(value, secret) {
  return keyedDigest(secret, `ip\0${normalizeIp(value)}`, "hex");
}

export function hashSessionToken(token, secret) {
  return keyedDigest(secret, `session\0${token}`, "hex");
}

export function csrfTokenForSession(token, secret) {
  return keyedDigest(secret, `csrf\0${token}`, "base64url");
}

function keyedDigest(secret, value, encoding) {
  return createHmac("sha256", secret).update(value).digest(encoding);
}

export function secureStringEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(actualBytes, expectedBytes);
}

export function newOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export async function createScryptPasswordHash(password, options = {}) {
  assertPassword(password);
  const parameters = {
    N: options.N ?? MIN_SCRYPT_N,
    r: options.r ?? 8,
    p: options.p ?? 1,
    salt: options.salt ?? randomBytes(16),
    keyLength: options.keyLength ?? 32,
  };
  validateScryptParameters(parameters);
  const key = await deriveScrypt(password, parameters);
  return [
    "scrypt",
    parameters.N,
    parameters.r,
    parameters.p,
    parameters.salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyScryptPassword(password, encodedHash) {
  const parameters = parseScryptPasswordHash(encodedHash);
  const candidate = await deriveScrypt(password, parameters);
  return timingSafeEqual(candidate, parameters.key);
}

export function validateScryptPasswordHash(encodedHash) {
  parseScryptPasswordHash(encodedHash);
}

function parseScryptPasswordHash(encodedHash) {
  if (typeof encodedHash !== "string") throw new TypeError("Invalid scrypt password hash");
  const fields = encodedHash.split("$");
  if (fields.length !== 6 || fields[0] !== "scrypt") {
    throw new TypeError("Invalid scrypt password hash");
  }

  const parameters = {
    N: parseInteger(fields[1]),
    r: parseInteger(fields[2]),
    p: parseInteger(fields[3]),
    salt: decodeBase64Url(fields[4]),
    key: decodeBase64Url(fields[5]),
  };
  parameters.keyLength = parameters.key.length;
  validateScryptParameters(parameters);
  return parameters;
}

function parseInteger(value) {
  if (!/^\d+$/.test(value)) throw new TypeError("Invalid scrypt password hash");
  return Number(value);
}

function decodeBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new TypeError("Invalid scrypt password hash");
  const bytes = Buffer.from(value, "base64url");
  if (bytes.toString("base64url") !== value) throw new TypeError("Invalid scrypt password hash");
  return bytes;
}

function validateScryptParameters(parameters) {
  validateWorkFactor(parameters.N);
  assertIntegerRange(parameters.r, 1, 16);
  assertIntegerRange(parameters.p, 1, 8);
  if (parameters.N * parameters.r > MAX_SCRYPT_MEMORY_FACTOR) throw new TypeError("Unsafe scrypt parameters");
  validateScryptBuffers(parameters);
}

function validateWorkFactor(value) {
  assertIntegerRange(value, MIN_SCRYPT_N, MAX_SCRYPT_N);
  if ((value & (value - 1)) !== 0) throw new TypeError("Unsafe scrypt parameters");
}

function assertIntegerRange(value, minimum, maximum) {
  if (!Number.isInteger(value)) throw new TypeError("Unsafe scrypt parameters");
  if (value < minimum || value > maximum) throw new TypeError("Unsafe scrypt parameters");
}

function validateScryptBuffers(parameters) {
  if (!Buffer.isBuffer(parameters.salt) || parameters.salt.length < 16) throw new TypeError("Unsafe scrypt parameters");
  const key = parameters.key ?? Buffer.alloc(parameters.keyLength);
  if (!Buffer.isBuffer(key)) throw new TypeError("Unsafe scrypt parameters");
  assertIntegerRange(parameters.keyLength, 32, 64);
}

function assertPassword(password) {
  if (typeof password !== "string") throw new TypeError("Password must be a string");
}

function deriveScrypt(password, parameters) {
  const maxmem = Math.max(32 * 1024 * 1024, 128 * parameters.N * parameters.r + 1024 * 1024);
  return new Promise((resolve, reject) => {
    scrypt(password, parameters.salt, parameters.keyLength, {
      N: parameters.N,
      r: parameters.r,
      p: parameters.p,
      maxmem,
    }, (error, key) => error ? reject(error) : resolve(key));
  });
}
