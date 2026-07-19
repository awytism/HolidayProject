import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PREFERRED_PORTS = [4177, 4277, 4377, 4477, 4577, 4677];
const FALLBACK_START = 4178;
const FALLBACK_END = 4207;

export function buildPortCandidates(env = process.env) {
  const requested = parsePort(env.PORT);
  if (env.GRAMADO_STRICT_PORT === "1") return [requested ?? PREFERRED_PORTS[0]];
  const configured = parsePortList(env.PORT_CANDIDATES);
  const fallback = range(FALLBACK_START, FALLBACK_END);
  return [...new Set([requested, ...configured, ...PREFERRED_PORTS, ...fallback].filter(Boolean))];
}

export async function selectAvailablePort(candidates) {
  for (const port of candidates) {
    if (await isPortAvailable(port)) return port;
    console.log(`Port ${port} is already in use; trying the next candidate.`);
  }
  throw new Error("No available port found in the configured candidate range");
}

export function isPortAvailable(port, host = "0.0.0.0") {
  return new Promise((resolveAvailability) => {
    const probe = createServer();
    probe.unref();
    probe.once("error", () => resolveAvailability(false));
    probe.listen({ port, host, exclusive: true }, () => {
      probe.close(() => resolveAvailability(true));
    });
  });
}

export async function startWithAvailablePort(env = process.env) {
  assertNodeVersion();
  const candidates = buildPortCandidates(env);
  const host = env.GRAMADO_HOST ?? "0.0.0.0";
  if (env.GRAMADO_STRICT_PORT === "1" && !await isPortAvailable(candidates[0], host)) {
    throw new Error(`Port ${candidates[0]} is already in use; stop the conflicting process before starting Tripboard`);
  }
  const port = await selectAvailablePort(candidates).catch((error) => {
    if (env.GRAMADO_STRICT_PORT === "1") {
      throw new Error(`Port ${candidates[0]} is already in use; stop the conflicting process before starting Tripboard`);
    }
    throw error;
  });
  const projectDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const serverPath = resolve(projectDir, "src/server/app.mjs");
  console.log(`Starting Gramado Tripboard on port ${port}...`);
  console.log(`Listening on ${host}:${port}; open http://127.0.0.1:${port} on this Mac`);
  const child = spawn(process.execPath, ["--env-file-if-exists=.env", serverPath], {
    cwd: projectDir,
    env: { ...env, PORT: String(port) },
    stdio: "inherit",
  });
  forwardSignals(child);
  return new Promise((resolveExit) => child.once("exit", (code, signal) => {
    resolveExit(signal ? 1 : (code ?? 1));
  }));
}

function parsePortList(value) {
  if (!value) return [];
  return value.split(",").map((item) => parsePort(item.trim())).filter(Boolean);
}

function parsePort(value) {
  if (value === undefined || value === "") return null;
  const port = Number(value);
  return Number.isInteger(port) && port >= 1024 && port <= 65_535 ? port : null;
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_value, index) => start + index);
}

function assertNodeVersion() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  const supported = major > 22 || (major === 22 && minor >= 13);
  if (!supported) throw new Error(`Node.js 22.13 or newer is required; found ${process.versions.node}`);
}

function forwardSignals(child) {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      if (!child.killed) child.kill(signal);
    });
  }
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    process.exitCode = await startWithAvailablePort();
  } catch (error) {
    console.error(`Unable to start Tripboard: ${error.message}`);
    process.exitCode = 1;
  }
}
