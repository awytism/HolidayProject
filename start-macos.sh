#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly DATA_DIR="$SCRIPT_DIR/data"
readonly UPLOAD_DIR="$DATA_DIR/uploads"
readonly ATTACHMENT_DIR="$DATA_DIR/attachments"

fail() {
  echo "[Tripboard] $*" >&2
  exit 1
}

grep -q '^# TRIPBOARD_MACOS_LAUNCHER_END$' "$SCRIPT_DIR/start-macos.sh" \
  || fail "start-macos.sh is incomplete or was truncated. Download it again before starting the app."

[[ "$(uname -s)" == "Darwin" ]] || fail "This launcher is for macOS. Use start.sh on Linux or start.bat on Windows."

NODE_BIN="${GRAMADO_NODE_BIN:-}"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi
[[ -n "$NODE_BIN" ]] || fail "Node.js was not found. Install Node.js 22.13 or newer from https://nodejs.org/."
[[ "$NODE_BIN" == /* ]] || fail "GRAMADO_NODE_BIN must be an absolute path."
[[ -x "$NODE_BIN" ]] || fail "Node.js is not executable at $NODE_BIN."

if ! "$NODE_BIN" -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)'; then
  node_version="$("$NODE_BIN" -p 'process.versions.node' 2>/dev/null || echo unknown)"
  fail "Node.js 22.13 or newer is required. Installed version: $node_version"
fi

if ! (cd "$SCRIPT_DIR" && "$NODE_BIN" -e 'require("express"); require("sharp");' >/dev/null 2>&1); then
  NPM_BIN="$(command -v npm || true)"
  [[ -n "$NPM_BIN" ]] || fail "npm was not found. Reinstall Node.js with npm enabled."
  echo "[Tripboard] Installing production dependencies for macOS..."
  (cd "$SCRIPT_DIR" && "$NPM_BIN" ci --omit=dev)
fi

for path in "$DATA_DIR" "$UPLOAD_DIR" "$ATTACHMENT_DIR"; do
  [[ ! -L "$path" ]] || fail "$path must be a directory, not a symbolic link."
  [[ ! -e "$path" || -d "$path" ]] || fail "$path is not a directory."
done
mkdir -p -- "$UPLOAD_DIR" "$ATTACHMENT_DIR"
[[ -w "$DATA_DIR" ]] || fail "$DATA_DIR is not writable by the current user."

export PORT="${PORT:-4177}"
export GRAMADO_STRICT_PORT=1

echo "[Tripboard] Starting on http://localhost:$PORT"
echo "[Tripboard] Press Control-C to stop."
cd "$SCRIPT_DIR"
exec "$NODE_BIN" "scripts/start-server.mjs"

# TRIPBOARD_MACOS_LAUNCHER_END