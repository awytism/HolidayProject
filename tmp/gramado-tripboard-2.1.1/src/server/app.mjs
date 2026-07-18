import { once } from "node:events";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultDocument } from "../shared/default-document.mjs";
import { createHttpApp } from "./http-app.mjs";
import { createGramadoRouter } from "./routes.mjs";

const modulePath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(modulePath), "../..");
const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i;

export async function startServer(options = {}) {
  const runtime = createRuntime(options);
  let router;
  let stopMonitor = () => {};

  try {
    router = initializeRouter(runtime);
    await cleanupStagedMedia(router);
    let shutdown;
    let shutdownRequested = false;
    stopMonitor = await runtime.monitorShutdownRequest({
      platform: runtime.platform,
      requestPath: runtime.shutdownRequestPath,
      shutdown() {
        shutdownRequested = true;
        shutdown?.().catch(reportFailure);
      },
    });
    const server = runtime.makeApp({ root: runtime.root, router }).listen(runtime.port, runtime.host);
    shutdown = createShutdown(server, router, stopMonitor);
    if (shutdownRequested) shutdown().catch(reportFailure);
    await once(server, "listening");
    const urlHost = isIP(runtime.host) === 6 ? `[${runtime.host}]` : runtime.host;
    runtime.log(`Gramado Tripboard listening at http://${urlHost}:${runtime.port}`);
    return { server, router, shutdown };
  } catch (error) {
    stopMonitor();
    closeRouterAfterFailure(router, error);
  }
}

function createRuntime(options) {
  const env = options.env ?? process.env;
  const root = options.root ?? defaultRoot;
  return {
    env,
    root,
    host: readHost(env.GRAMADO_HOST),
    port: readPort(env.PORT),
    dbPath: resolve(root, env.GRAMADO_DB_PATH ?? "data/gramado.sqlite"),
    uploadDir: resolve(root, env.GRAMADO_UPLOAD_DIR ?? "data/uploads"),
    attachmentDir: resolve(root, env.GRAMADO_ATTACHMENT_DIR ?? "data/attachments"),
    ...createShutdownMonitorRuntime(options, root),
    makeRouter: options.createRouter ?? createGramadoRouter,
    makeApp: options.createApp ?? createHttpApp,
    makeDirectory: options.mkdir ?? mkdirSync,
    log: options.log ?? console.log,
  };
}

function createShutdownMonitorRuntime(options, root) {
  return {
    shutdownRequestPath: resolve(root, "data/shutdown.request"),
    platform: options.platform ?? process.platform,
    monitorShutdownRequest: options.monitorShutdownRequest ?? installShutdownRequestMonitor,
  };
}

function createShutdown(server, router, stopMonitor) {
  let shutdown;
  return () => {
    stopMonitor();
    shutdown ??= shutdownServer(server, router);
    return shutdown;
  };
}

export async function installShutdownRequestMonitor(options) {
  if (options.platform !== "win32") return () => {};
  const readRequest = options.readRequest ?? readFile;
  const reportError = options.reportError ?? reportMonitorError;
  const schedule = options.schedule ?? ((callback) => globalThis.setInterval(callback, 250));
  let readErrorReported = false;
  const reportReadError = (error) => {
    if (readErrorReported) return;
    readErrorReported = true;
    reportError(error);
  };
  let previous = await readShutdownRequest(options.requestPath, readRequest, reportReadError);
  let reading = false;
  const timer = schedule(async () => {
    if (reading) return;
    reading = true;
    const current = await readShutdownRequest(options.requestPath, readRequest, reportReadError);
    reading = false;
    if (!current || current === previous) return;
    previous = current;
    options.shutdown();
  });
  timer.unref?.();
  return () => globalThis.clearInterval(timer);
}

async function readShutdownRequest(path, readRequest, reportError) {
  try {
    return (await readRequest(path, "utf8")).trim();
  } catch (error) {
    if (error?.code !== "ENOENT") reportError(new Error("Unable to monitor shutdown requests."));
    return "";
  }
}

function reportMonitorError(error) {
  console.error(error.message);
}

function initializeRouter(runtime) {
  runtime.makeDirectory(dirname(runtime.dbPath), { recursive: true });
  runtime.makeDirectory(runtime.uploadDir, { recursive: true });
  runtime.makeDirectory(runtime.attachmentDir, { recursive: true });
  const config = {
    dbPath: runtime.dbPath,
    uploadDir: runtime.uploadDir,
    attachmentDir: runtime.attachmentDir,
    initialDocument: createDefaultDocument(),
  };
  return runtime.makeRouter({ config, env: runtime.env });
}

async function cleanupStagedMedia(router) {
  if (typeof router.cleanupStagedMedia === "function") await router.cleanupStagedMedia();
}

export async function shutdownServer(server, router) {
  let failure;
  try {
    await closeServer(server);
  } catch (error) {
    failure = error;
  }
  try {
    router.close();
  } catch (error) {
    if (failure) throw new AggregateError([failure, error], "Server shutdown failed");
    throw error;
  }
  if (failure) throw failure;
}

function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
}

function closeRouterAfterFailure(router, startupError) {
  if (!router) throw startupError;
  try {
    router.close();
  } catch (closeError) {
    throw new AggregateError([startupError, closeError], "Server startup failed");
  }
  throw startupError;
}

function installSignalHandlers(runtime) {
  let shutdown;
  const stop = () => {
    shutdown ??= runtime.shutdown();
    shutdown.catch(reportFailure);
  };
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
}

function reportFailure(error) {
  console.error(error.message);
  process.exitCode = 1;
}

function readPort(value) {
  const parsed = Number(value ?? 4177);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new TypeError("PORT must be an integer from 1 to 65535");
  }
  return parsed;
}

function readHost(value) {
  const host = value ?? "127.0.0.1";
  if (typeof host !== "string" || (!isIP(host) && !HOSTNAME_PATTERN.test(host))) {
    throw new TypeError("GRAMADO_HOST must be a valid IP address or hostname");
  }
  return host;
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    installSignalHandlers(await startServer());
  } catch (error) {
    reportFailure(error);
  }
}
