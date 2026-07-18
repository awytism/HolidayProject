#!/usr/bin/env bash
set -Eeuo pipefail

readonly SERVICE_NAME="gramado-tripboard.service"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SERVICE_TEMPLATE="$SCRIPT_DIR/deploy/systemd/gramado-tripboard.service.template"
readonly SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME"
readonly DATA_DIR="$SCRIPT_DIR/data"
readonly UPLOAD_DIR="$DATA_DIR/uploads"
readonly ATTACHMENT_DIR="$DATA_DIR/attachments"
readonly RUNTIME_ENV="$DATA_DIR/runtime.env"

APP_USER=""
APP_GROUP=""
NODE_BIN=""
SELECTED_PORT=""
declare -a TEMP_FILES=()

cleanup() {
  if (( ${#TEMP_FILES[@]} > 0 )); then
    rm -f -- "${TEMP_FILES[@]}"
  fi
}
trap cleanup EXIT

fail() {
  echo "[Tripboard] $*" >&2
  exit 1
}

grep -q '^# TRIPBOARD_LAUNCHER_END$' "$SCRIPT_DIR/start.sh" \
  || fail "start.sh is incomplete or was truncated during upload. Upload it again before starting the service."

usage() {
  cat <<'EOF'
Usage: ./start.sh [start|stop|restart|status|logs]

  start     Install/update, enable, and start the systemd service (default)
  stop      Gracefully stop the service
  restart   Install/update and restart the service
  status    Show the systemd service status
  logs      Follow logs from the systemd journal
EOF
}

as_root() {
  if (( EUID == 0 )); then
    "$@"
    return
  fi
  command -v sudo >/dev/null 2>&1 || fail "sudo is required to manage the system service."
  sudo -- "$@"
}

run_as_app() {
  if [[ "$(id -u)" == "$(id -u "$APP_USER")" ]]; then
    "$@"
    return
  fi
  if (( EUID == 0 )) && command -v runuser >/dev/null 2>&1; then
    runuser -u "$APP_USER" -- "$@"
    return
  fi
  command -v sudo >/dev/null 2>&1 || fail "runuser or sudo is required to run setup as $APP_USER."
  sudo -H -u "$APP_USER" -- "$@"
}

require_systemd() {
  [[ "$(uname -s)" == "Linux" ]] || fail "The Linux service launcher requires systemd."
  command -v systemctl >/dev/null 2>&1 || fail "systemctl was not found."
  [[ -d /run/systemd/system ]] || fail "systemd is not running as the system service manager."
}

resolve_app_identity() {
  if [[ -n "${GRAMADO_RUN_USER:-}" ]]; then
    APP_USER="$GRAMADO_RUN_USER"
  elif (( EUID == 0 )) && [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != "root" ]]; then
    APP_USER="$SUDO_USER"
  elif (( EUID != 0 )); then
    APP_USER="$(id -un)"
  else
    APP_USER="$(stat -c '%U' "$SCRIPT_DIR")"
  fi

  id "$APP_USER" >/dev/null 2>&1 || fail "Service user '$APP_USER' does not exist."
  [[ "$(id -u "$APP_USER")" != "0" ]] || fail "Refusing to run the service as root. Run this launcher as a non-root user or through sudo."
  APP_GROUP="$(id -gn "$APP_USER")"
}

resolve_node() {
  NODE_BIN="${GRAMADO_NODE_BIN:-}"
  if [[ -z "$NODE_BIN" ]]; then
    NODE_BIN="$(command -v node || true)"
  fi
  [[ -n "$NODE_BIN" ]] || fail "Node.js was not found. Install Node.js 22.13 or newer."
  [[ "$NODE_BIN" == /* ]] || fail "GRAMADO_NODE_BIN must be an absolute path."
  run_as_app test -x "$NODE_BIN" || fail "$APP_USER cannot execute Node.js at $NODE_BIN."

  if ! run_as_app "$NODE_BIN" -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)'; then
    local node_version
    node_version="$(run_as_app "$NODE_BIN" -p 'process.versions.node' 2>/dev/null || echo unknown)"
    fail "Node.js 22.13 or newer is required. Installed version: $node_version"
  fi
}

install_dependencies() {
  if (cd "$SCRIPT_DIR" && run_as_app "$NODE_BIN" -e 'require("express"); require("sharp");' >/dev/null 2>&1); then
    return
  fi

  local npm_bin
  npm_bin="$(command -v npm || true)"
  [[ -n "$npm_bin" ]] || fail "npm was not found. Install npm for Node.js 22.13 or newer."
  echo "[Tripboard] Installing production dependencies..."
  (cd "$SCRIPT_DIR" && run_as_app "$NODE_BIN" "$npm_bin" ci --omit=dev)
}

prepare_writable_directories() {
  [[ ! -L "$DATA_DIR" ]] || fail "$DATA_DIR must be a directory, not a symbolic link."
  [[ ! -e "$DATA_DIR" || -d "$DATA_DIR" ]] || fail "$DATA_DIR is not a directory."
  as_root install -d -m 0750 -o "$APP_USER" -g "$APP_GROUP" "$DATA_DIR" "$UPLOAD_DIR" "$ATTACHMENT_DIR"
  as_root chown -R -- "$APP_USER:$APP_GROUP" "$DATA_DIR"
  as_root chmod -R u+rwX -- "$DATA_DIR"
}

read_env_value() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 0

  env -u "$key" "$NODE_BIN" --env-file-if-exists="$file" -e \
    'process.stdout.write(process.env[process.argv[1]] ?? "")' "$key"
}

port_is_available() {
  "$NODE_BIN" - "$1" <<'NODE'
const { createServer } = require("node:net");
const port = Number(process.argv[2]);
const probe = createServer();
probe.unref();
probe.once("error", () => process.exit(1));
probe.listen({ port, host: "0.0.0.0", exclusive: true }, () => {
  probe.close(() => process.exit(0));
});
NODE
}

select_port() {
  local service_active="$1"
  local runtime_port env_port current_port
  runtime_port="$(read_env_value "$RUNTIME_ENV" PORT)"
  env_port="$(read_env_value "$SCRIPT_DIR/.env" PORT)"
  current_port="$runtime_port"
  [[ "$current_port" =~ ^[0-9]+$ ]] || current_port="$env_port"
  [[ "$current_port" =~ ^[0-9]+$ ]] || current_port="4177"
  SELECTED_PORT="${PORT:-$current_port}"
  [[ "$SELECTED_PORT" =~ ^[0-9]+$ ]] && (( SELECTED_PORT >= 1024 && SELECTED_PORT <= 65535 )) \
    || fail "PORT must be an integer from 1024 to 65535."
  if [[ "$service_active" == "true" && "$SELECTED_PORT" == "$current_port" ]]; then
    return
  fi
  port_is_available "$SELECTED_PORT" \
    || fail "Port $SELECTED_PORT is already in use. Stop the conflicting process or choose one port and update Nginx to match."
}

persist_port() {
  local temp_file
  temp_file="$(mktemp "$DATA_DIR/.runtime.env.XXXXXX")"
  TEMP_FILES+=("$temp_file")

  if [[ -f "$RUNTIME_ENV" ]]; then
    awk '!/^[[:space:]]*(export[[:space:]]+)?PORT[[:space:]]*=/' "$RUNTIME_ENV" > "$temp_file"
  fi
  printf 'PORT=%s\n' "$SELECTED_PORT" >> "$temp_file"
  chmod 0640 "$temp_file"
  as_root chown "$APP_USER:$APP_GROUP" "$temp_file"
  mv -f -- "$temp_file" "$RUNTIME_ENV"
}

escape_unit_value() {
  local value="$1"
  [[ "$value" != *$'\n'* && "$value" != *$'\r'* ]] || fail "Paths containing line breaks are not supported."
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//%/%%}"
  printf '%s' "$value"
}

render_and_install_unit() {
  [[ -f "$SERVICE_TEMPLATE" ]] || fail "Missing service template: $SERVICE_TEMPLATE"
  [[ "$SCRIPT_DIR" != *[[:space:]]* ]] || fail "The Linux application path cannot contain whitespace: $SCRIPT_DIR"
  [[ "$NODE_BIN" != *[[:space:]]* ]] || fail "The Node.js path cannot contain whitespace: $NODE_BIN"
  local app_dir node_bin app_user app_group line temp_file
  app_dir="$(escape_unit_value "$SCRIPT_DIR")"
  node_bin="$(escape_unit_value "$NODE_BIN")"
  app_user="$(escape_unit_value "$APP_USER")"
  app_group="$(escape_unit_value "$APP_GROUP")"
  temp_file="$(mktemp "${TMPDIR:-/tmp}/gramado-tripboard.service.XXXXXX")"
  TEMP_FILES+=("$temp_file")

  shopt -u patsub_replacement 2>/dev/null || true
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    line="${line#$'\xEF\xBB\xBF'}"
    line="${line//@APP_DIR@/$app_dir}"
    line="${line//@NODE_BIN@/$node_bin}"
    line="${line//@APP_USER@/$app_user}"
    line="${line//@APP_GROUP@/$app_group}"
    printf '%s\n' "$line"
  done < "$SERVICE_TEMPLATE" > "$temp_file"

  grep -q '@[A-Z_][A-Z_]*@' "$temp_file" && fail "The rendered service unit contains an unresolved placeholder."
  as_root install -m 0644 -o root -g root "$temp_file" "$SERVICE_FILE"
  as_root systemctl daemon-reload
}

wait_for_health() {
  local timeout="${GRAMADO_HEALTH_TIMEOUT:-30}"
  [[ "$timeout" =~ ^[0-9]+$ ]] && (( timeout >= 1 && timeout <= 300 )) || fail "GRAMADO_HEALTH_TIMEOUT must be from 1 to 300 seconds."

  run_as_app "$NODE_BIN" - "$SELECTED_PORT" "$timeout" <<'NODE'
const port = Number(process.argv[2]);
const timeoutMs = Number(process.argv[3]) * 1000;
const deadline = Date.now() + timeoutMs;

while (Date.now() < deadline) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/document`, {
      signal: AbortSignal.timeout(2000),
    });
    await response.body?.cancel();
    if (response.ok) process.exit(0);
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
process.exit(1);
NODE
}

install_and_start() {
  echo "[Tripboard] Preparing the system service on the fixed application port..."
  require_systemd
  resolve_app_identity
  resolve_node
  install_dependencies
  prepare_writable_directories

  local service_active="false"
  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    service_active="true"
  fi

  select_port "$service_active"
  persist_port
  render_and_install_unit
  as_root systemctl --quiet enable --now "$SERVICE_NAME"
  if [[ "$service_active" == "true" ]]; then
    as_root systemctl --quiet restart "$SERVICE_NAME"
  fi

  if ! wait_for_health; then
    fail "Service did not pass /api/document health within ${GRAMADO_HEALTH_TIMEOUT:-30}s. Run './start.sh logs'."
  fi
  echo "[Tripboard] Service running at http://127.0.0.1:$SELECTED_PORT"
}

stop_service() {
  require_systemd
  as_root systemctl stop "$SERVICE_NAME"
  echo "[Tripboard] Service stopped."
}

show_status() {
  require_systemd
  systemctl --no-pager --full status "$SERVICE_NAME"
}

show_logs() {
  require_systemd
  command -v journalctl >/dev/null 2>&1 || fail "journalctl was not found."
  as_root journalctl --no-pager -n 100 -f -u "$SERVICE_NAME"
}

if (( $# > 1 )); then
  usage >&2
  exit 2
fi

case "${1:-start}" in
  start|restart)
    install_and_start
    ;;
  stop)
    stop_service
    ;;
  status)
    show_status
    ;;
  logs)
    show_logs
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

# TRIPBOARD_LAUNCHER_END
