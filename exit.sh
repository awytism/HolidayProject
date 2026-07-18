#!/usr/bin/env bash
set -Eeuo pipefail

readonly SERVICE_NAME="gramado-tripboard.service"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly GRACE_WAIT_ATTEMPTS=30
readonly FORCE_WAIT_ATTEMPTS=30
readonly WAIT_INTERVAL_SECONDS=0.1

stopped=0
failed=0
declare -a server_pids=()
declare -a server_start_times=()
declare -a process_argv=()
service_state="no-systemd"

as_root() {
  if (( EUID == 0 )); then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo -- "$@"
  else
    echo "[Tripboard] sudo is required to stop the system service." >&2
    return 1
  fi
}

canonical_directory() {
  [[ -d "$1" ]] || return 1
  readlink -f -- "$1" 2>/dev/null
}

systemd_available() {
  command -v systemctl >/dev/null 2>&1 && [[ -d /run/systemd/system ]]
}

inspect_system_service() {
  local state result
  service_state="no-systemd"
  systemd_available || return 2
  if state="$(systemctl is-active "$SERVICE_NAME" 2>/dev/null)"; then
    result=0
  else
    result=$?
  fi
  case "$state" in
    active|activating|deactivating|reloading) service_state="$state"; return 0 ;;
    inactive|unknown|failed) service_state="$state"; return 2 ;;
    *) (( result == 0 )) && service_state="$state"; return 1 ;;
  esac
}

service_working_directory() {
  systemctl show --property=WorkingDirectory --value "$SERVICE_NAME" 2>/dev/null
}

stop_local_service() {
  local service_directory canonical_service_directory
  if ! service_directory="$(service_working_directory)"; then
    echo "[Tripboard] Unable to inspect the system service." >&2
    return 1
  fi
  if ! canonical_service_directory="$(canonical_directory "$service_directory")"; then
    echo "[Tripboard] Unable to inspect the system service." >&2
    return 1
  fi
  [[ "$canonical_service_directory" == "$SCRIPT_DIR" ]] || return 2

  if as_root systemctl stop "$SERVICE_NAME"; then
    echo "[Tripboard] System service stopped."
    stopped=1
    return 0
  fi
  echo "[Tripboard] Unable to stop the system service." >&2
  return 1
}

read_process_argv() {
  process_argv=()
  [[ -r "/proc/$1/cmdline" ]] || return 1
  mapfile -d '' -t process_argv < "/proc/$1/cmdline" 2>/dev/null || return 1
  (( ${#process_argv[@]} > 0 ))
}

argv0_matches_executable() {
  local pid="$1" process_cwd="$2" executable argv0_path
  executable="$(readlink -f "/proc/$pid/exe" 2>/dev/null)" || return 1
  [[ -n "$executable" && ${#process_argv[@]} -gt 0 ]] || return 1

  if [[ "${process_argv[0]}" != */* ]]; then
    [[ "${executable##*/}" == "${process_argv[0]}" ]]
    return
  fi
  argv0_path="${process_argv[0]}"
  [[ "$argv0_path" == /* ]] || argv0_path="$process_cwd/$argv0_path"
  argv0_path="$(readlink -f -- "$argv0_path" 2>/dev/null)" || return 1
  [[ "$argv0_path" == "$executable" ]]
}

is_server_argument() {
  case "$1" in
    src/server/app.mjs|./src/server/app.mjs|"$SCRIPT_DIR/src/server/app.mjs") return 0 ;;
    *) return 1 ;;
  esac
}

has_supported_server_argv() {
  if (( ${#process_argv[@]} == 2 )); then
    is_server_argument "${process_argv[1]}"
    return
  fi
  (( ${#process_argv[@]} == 3 )) || return 1
  [[ "${process_argv[1]}" == "--env-file-if-exists=.env" ]] \
    && is_server_argument "${process_argv[2]}"
}

is_server_process() {
  local pid="$1" process_cwd
  process_cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  [[ "$process_cwd" == "$SCRIPT_DIR" ]] || return 1
  read_process_argv "$pid" || return 1
  argv0_matches_executable "$pid" "$process_cwd" || return 1
  has_supported_server_argv
}

read_start_time() {
  local stat_line
  local -a stat_fields=()
  [[ -r "/proc/$1/stat" ]] || return 1
  IFS= read -r stat_line < "/proc/$1/stat" || return 1
  IFS=' ' read -r -a stat_fields <<< "${stat_line##*) }"
  (( ${#stat_fields[@]} > 19 )) || return 1
  printf '%s\n' "${stat_fields[19]}"
}

same_process() {
  local current_start_time
  current_start_time="$(read_start_time "$1" 2>/dev/null || true)"
  [[ -n "$current_start_time" && "$current_start_time" == "$2" ]]
}

same_server_process() {
  same_process "$1" "$2" || return 1
  is_server_process "$1" || return 1
  same_process "$1" "$2"
}

collect_server_processes() {
  local process_dir pid start_time
  [[ -d /proc ]] || return 0
  for process_dir in /proc/[0-9]*; do
    [[ -d "$process_dir" ]] || continue
    pid="${process_dir##*/}"
    is_server_process "$pid" || continue
    start_time="$(read_start_time "$pid" 2>/dev/null || true)"
    [[ -n "$start_time" ]] || continue
    same_server_process "$pid" "$start_time" || continue
    server_pids+=("$pid")
    server_start_times+=("$start_time")
  done
}

send_process_signal() {
  kill "-$2" "$1" 2>/dev/null
}

signal_server_process() {
  local pid="$1" start_time="$2" signal="$3"
  same_server_process "$pid" "$start_time" || return 2
  send_process_signal "$pid" "$signal" && return 0
  same_server_process "$pid" "$start_time" && return 1
  return 2
}

targets_running() {
  local index
  for index in "${!server_pids[@]}"; do
    same_server_process "${server_pids[$index]}" "${server_start_times[$index]}" && return 0
  done
  return 1
}

wait_for_targets() {
  local maximum_attempts="$1" attempt
  for (( attempt = 0; attempt < maximum_attempts; attempt += 1 )); do
    targets_running || return 0
    sleep "$WAIT_INTERVAL_SECONDS"
  done
  return 1
}

request_graceful_stop() {
  local index pid start_time result
  for index in "${!server_pids[@]}"; do
    pid="${server_pids[$index]}"
    start_time="${server_start_times[$index]}"
    if signal_server_process "$pid" "$start_time" TERM; then
      echo "[Tripboard] Stopping server process $pid."
      stopped=1
      continue
    else
      result=$?
    fi
    if (( result == 1 )); then
      echo "[Tripboard] Unable to stop server process $pid." >&2
      failed=1
    fi
  done
}

force_remaining_targets() {
  local index pid start_time result
  for index in "${!server_pids[@]}"; do
    pid="${server_pids[$index]}"
    start_time="${server_start_times[$index]}"
    same_server_process "$pid" "$start_time" || continue
    if signal_server_process "$pid" "$start_time" KILL; then
      continue
    else
      result=$?
    fi
    if (( result == 1 )); then
      echo "[Tripboard] Unable to force server process $pid." >&2
      failed=1
    fi
  done
}

stop_direct_processes() {
  collect_server_processes
  request_graceful_stop
  wait_for_targets "$GRACE_WAIT_ATTEMPTS" || true
  force_remaining_targets
  if ! wait_for_targets "$FORCE_WAIT_ATTEMPTS"; then
    echo "[Tripboard] Server processes did not stop." >&2
    failed=1
  fi
}

main() {
  local service_result
  stopped=0
  failed=0
  server_pids=()
  server_start_times=()

  if inspect_system_service; then
    service_result=0
  else
    service_result=$?
  fi

  if (( service_result == 0 )); then
    if stop_local_service; then
      return 0
    else
      service_result=$?
    fi
    if (( service_result != 2 )); then
      failed=1
      return 1
    fi
  elif (( service_result == 1 )); then
    echo "[Tripboard] Unable to inspect the system service." >&2
    failed=1
    return 1
  fi

  stop_direct_processes
  if (( stopped == 0 && failed == 0 )); then
    echo "[Tripboard] Server is not running."
  fi
  return "$failed"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  if main "$@"; then
    exit 0
  else
    exit "$?"
  fi
fi
