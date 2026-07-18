import assert from "node:assert/strict";
import { createServer } from "node:net";
import { once } from "node:events";
import test from "node:test";
import { buildPortCandidates, isPortAvailable, selectAvailablePort } from "../../scripts/start-server.mjs";

test("puts configured ports before collision-safe defaults and removes duplicates", () => {
  const ports = buildPortCandidates({ PORT: "5177", PORT_CANDIDATES: "5277,5177,5377" });
  assert.deepEqual(ports.slice(0, 4), [5177, 5277, 5377, 4177]);
});

test("uses only the requested fixed port for strict launchers", () => {
  assert.deepEqual(buildPortCandidates({ PORT: "4177", PORT_CANDIDATES: "4277", GRAMADO_STRICT_PORT: "1" }), [4177]);
  assert.deepEqual(buildPortCandidates({ GRAMADO_STRICT_PORT: "1" }), [4177]);
});

test("skips an occupied port and selects the next available candidate", async (context) => {
  const blocker = createServer();
  blocker.listen(0, "0.0.0.0");
  await once(blocker, "listening");
  context.after(() => blocker.close());
  const occupied = blocker.address().port;
  const available = await reserveAvailablePort();
  assert.equal(await isPortAvailable(occupied), false);
  assert.equal(await selectAvailablePort([occupied, available]), available);
});

async function reserveAvailablePort() {
  const probe = createServer();
  probe.listen(0, "0.0.0.0");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolveClose) => probe.close(resolveClose));
  return port;
}
