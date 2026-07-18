import assert from "node:assert/strict";
import test from "node:test";
import {
  createScryptPasswordHash,
  hmacIp,
  normalizeIp,
  verifyScryptPassword,
} from "../../src/server/security.mjs";

test("normalizes IPv4, IPv6, and IPv4-mapped IPv6", () => {
  assert.equal(normalizeIp("203.0.113.7"), "203.0.113.7");
  assert.equal(normalizeIp("203.0.113.7:443"), "203.0.113.7");
  assert.equal(normalizeIp("2001:0DB8:0:0:0:0:0:1"), "2001:db8::1");
  assert.equal(normalizeIp("[2001:db8::1]:443"), "2001:db8::1");
  assert.equal(normalizeIp("::ffff:203.0.113.7"), "203.0.113.7");
  assert.throws(() => normalizeIp("not-an-ip"), /Invalid IP/);
});

test("HMACs equivalent IP representations without exposing the IP", () => {
  const secret = "a".repeat(32);
  const first = hmacIp("2001:0db8:0:0::1", secret);
  const second = hmacIp("2001:db8::1", secret);
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.equal(first.includes("2001"), false);
});

test("creates and verifies the configured scrypt hash format", async () => {
  const hash = await createScryptPasswordHash("correct horse battery staple", {
    salt: Buffer.alloc(16, 7),
  });
  assert.equal(await verifyScryptPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyScryptPassword("wrong", hash), false);
  await assert.rejects(() => verifyScryptPassword("anything", "scrypt$2$1$1$bad$bad"), /Unsafe|Invalid/);
});
