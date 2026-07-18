import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  installShutdownRequestMonitor,
  shutdownServer,
  startServer,
} from "../../src/server/app.mjs";

test("closes the router when listen fails", async () => {
  const server = new EventEmitter();
  server.listening = false;
  let routerClosed = false;
  const router = { close() { routerClosed = true; } };
  const app = { listen() { Promise.resolve().then(() => server.emit("error", new Error("listen failed"))); return server; } };

  await assert.rejects(() => startServer({
    env: { PORT: "3001" },
    mkdir() {},
    createRouter: () => router,
    createApp: () => app,
    log() {},
  }), /listen failed/);
  assert.equal(routerClosed, true);
});

test("reports filesystem startup failures before creating resources", async () => {
  let routerCreated = false;
  await assert.rejects(() => startServer({
    env: { PORT: "3001" },
    mkdir() { throw new Error("mkdir failed"); },
    createRouter() { routerCreated = true; },
  }), /mkdir failed/);
  assert.equal(routerCreated, false);
});

test("closes the router when staged cleanup fails", async () => {
  let routerClosed = false;
  const router = {
    cleanupStagedMedia() { throw new Error("cleanup failed"); },
    close() { routerClosed = true; },
  };

  await assert.rejects(() => startServer({
    env: { PORT: "3001" },
    mkdir() {},
    createRouter: () => router,
    log() {},
  }), /cleanup failed/);
  assert.equal(routerClosed, true);
});

test("closes the router even when server shutdown fails", async () => {
  let routerClosed = false;
  const server = {
    listening: true,
    close(callback) { callback(new Error("close failed")); },
  };
  const router = { close() { routerClosed = true; } };

  await assert.rejects(() => shutdownServer(server, router), /close failed/);
  assert.equal(routerClosed, true);
});

test("creates upload storage and cleans staged media before listening", async () => {
  const directories = [];
  const events = [];
  let listenArguments;
  const server = new EventEmitter();
  server.listening = false;
  server.close = (callback) => callback();
  const router = {
    async cleanupStagedMedia() { events.push("cleanup"); },
    close() {},
  };
  const app = {
    listen(...arguments_) {
      listenArguments = arguments_;
      events.push("listen");
      server.listening = true;
      Promise.resolve().then(() => server.emit("listening"));
      return server;
    },
  };

  const runtime = await startServer({
    root: "C:/gramado-test",
    env: {
      PORT: "3001",
      GRAMADO_UPLOAD_DIR: "private/uploads",
      GRAMADO_ATTACHMENT_DIR: "private/attachments",
    },
    mkdir(path) { directories.push(path.replaceAll("\\", "/")); },
    createRouter: () => router,
    createApp: () => app,
    log() {},
  });

  assert.deepEqual(events, ["cleanup", "listen"]);
  assert.deepEqual(listenArguments, [3001, "127.0.0.1"]);
  assert.equal(directories.includes("C:/gramado-test/private/uploads"), true);
  assert.equal(directories.includes("C:/gramado-test/private/attachments"), true);
  await runtime.shutdown();
});

test("binds to an explicitly configured valid host", async () => {
  const server = new EventEmitter();
  server.listening = false;
  server.close = (callback) => callback();
  let listenArguments;
  const app = {
    listen(...arguments_) {
      listenArguments = arguments_;
      server.listening = true;
      Promise.resolve().then(() => server.emit("listening"));
      return server;
    },
  };
  const router = { close() {} };

  const runtime = await startServer({
    env: { PORT: "3001", GRAMADO_HOST: "0.0.0.0" },
    mkdir() {},
    createRouter: () => router,
    createApp: () => app,
    log() {},
  });

  assert.deepEqual(listenArguments, [3001, "0.0.0.0"]);
  await runtime.shutdown();
});

test("rejects an invalid configured host before creating resources", async () => {
  let directoryCreated = false;

  await assert.rejects(() => startServer({
    env: { PORT: "3001", GRAMADO_HOST: "0.0.0.0 invalid" },
    mkdir() { directoryCreated = true; },
  }), /GRAMADO_HOST/);
  assert.equal(directoryCreated, false);
});

test("Windows shutdown monitor ignores a stale request", async () => {
  const monitor = await createShutdownMonitor(["stale-request", "stale-request"]);
  await monitor.poll();
  assert.equal(monitor.shutdowns, 0);
  monitor.stop();
});

test("Windows shutdown monitor handles a changed request once", async () => {
  const monitor = await createShutdownMonitor(["stale-request", "fresh-request", "fresh-request"]);
  await monitor.poll();
  await monitor.poll();
  assert.equal(monitor.shutdowns, 1);
  monitor.stop();
});

test("Windows shutdown monitor reports repeated read failures once without request data", async () => {
  const secretToken = "request-token-must-not-leak";
  const errors = [];
  let poll;
  const stop = await installShutdownRequestMonitor({
    platform: "win32",
    requestPath: "C:/project/data/shutdown.request",
    readRequest: async () => { throw Object.assign(new Error(secretToken), { code: "EACCES" }); },
    reportError(error) { errors.push(error.message); },
    schedule(callback) { poll = callback; return { unref() {} }; },
    shutdown() {},
  });
  await poll();
  await poll();
  assert.deepEqual(errors, ["Unable to monitor shutdown requests."]);
  assert.doesNotMatch(errors.join(" "), new RegExp(secretToken));
  stop();
});

async function createShutdownMonitor(requests) {
  let poll;
  let shutdowns = 0;
  const stop = await installShutdownRequestMonitor({
    platform: "win32",
    requestPath: "C:/project/data/shutdown.request",
    readRequest: async () => requests.shift(),
    schedule(callback) {
      poll = callback;
      return { unref() {} };
    },
    shutdown() { shutdowns += 1; },
  });
  return {
    poll,
    stop,
    get shutdowns() { return shutdowns; },
  };
}
