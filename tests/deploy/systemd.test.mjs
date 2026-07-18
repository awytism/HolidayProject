import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readProjectFile = (path) => readFile(resolve(root, path), "utf8");
const bash = findBash();

test("Linux launcher exposes the service lifecycle commands", async () => {
  const launcher = await readProjectFile("start.sh");

  for (const command of ["start", "stop", "restart", "status", "logs"]) {
    assert.match(launcher, new RegExp(`(?:^|[|\\s])${command}(?:[|)\\s])`, "m"));
  }
  assert.match(launcher, /\$\{1:-start\}/);
  assert.match(launcher, /Node\.js 22\.13 or newer/);
  assert.match(launcher, /systemctl --quiet enable --now/);
  assert.match(launcher, /\/api\/document/);
  assert.match(launcher, /RUNTIME_ENV="\$DATA_DIR\/runtime\.env"/);
  assert.match(launcher, /ATTACHMENT_DIR="\$DATA_DIR\/attachments"/);
  assert.match(launcher, /SUDO_USER/);
  assert.match(launcher, /TRIPBOARD_LAUNCHER_END/);
  assert.match(launcher, /Port \$SELECTED_PORT is already in use/);
  assert.match(launcher, /require\("express"\); require\("sharp"\)/);
  assert.match(launcher, /line="\$\{line%\$'\\r'\}"/);
});

test("Windows launcher uses the fixed default and validates native dependencies", async () => {
  const launcher = await readProjectFile("start.bat");
  assert.match(launcher, /TRIPBOARD_LAUNCHER_END/);
  assert.match(launcher, /require\('express'\);require\('sharp'\)/);
  assert.match(launcher, /if not defined PORT set "PORT=4177"/);
  assert.match(launcher, /GRAMADO_STRICT_PORT=1/);
});

test("macOS launcher validates the platform and native dependencies", async () => {
  const launcher = await readProjectFile("start-macos.sh");

  assert.match(launcher, /^#!\/usr\/bin\/env bash$/m);
  assert.match(launcher, /^set -Eeuo pipefail$/m);
  assert.match(launcher, /uname -s.*Darwin/);
  assert.match(launcher, /Node\.js 22\.13 or newer/);
  assert.match(launcher, /require\("express"\); require\("sharp"\)/);
  assert.match(launcher, /NPM_BIN.*ci --omit=dev/);
  assert.match(launcher, /PORT="\$\{PORT:-4177\}"/);
  assert.match(launcher, /GRAMADO_STRICT_PORT=1/);
  assert.match(launcher, /scripts\/start-server\.mjs/);
  assert.match(launcher, /TRIPBOARD_MACOS_LAUNCHER_END/);
});

test("systemd template runs hardened as a non-root application user", async () => {
  const unit = await readProjectFile("deploy/systemd/gramado-tripboard.service.template");

  assert.match(unit, /^User=@APP_USER@$/m);
  assert.match(unit, /^Group=@APP_GROUP@$/m);
  assert.match(unit, /^WorkingDirectory=@APP_DIR@$/m);
  assert.match(unit, /^EnvironmentFile=-@APP_DIR@\/\.env$/m);
  assert.match(unit, /^EnvironmentFile=-@APP_DIR@\/data\/runtime\.env$/m);
  assert.match(unit, /^Restart=on-failure$/m);
  assert.match(unit, /^KillSignal=SIGTERM$/m);
  assert.match(unit, /^NoNewPrivileges=true$/m);
  assert.match(unit, /^ProtectSystem=strict$/m);
  assert.match(unit, /^ReadWritePaths=@APP_DIR@\/data$/m);
  assert.match(unit, /^StandardOutput=journal$/m);
  assert.match(unit, /^WantedBy=multi-user\.target$/m);
  assert.doesNotMatch(unit, /^User=(?:"?root"?)$/m);
});

test("nginx example uses a local stable upstream", async () => {
  const nginx = await readProjectFile("deploy/nginx/gramado-tripboard.conf.example");

  assert.match(nginx, /server 127\.0\.0\.1:4177;/);
  assert.match(nginx, /proxy_pass http:\/\/gramado_tripboard;/);
  assert.match(nginx, /proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;/);
  assert.match(nginx, /client_max_body_size 51m;/);
});

test("startup guide documents systemd verification", async () => {
  const guide = await readProjectFile("STARTING.md");

  assert.match(guide, /systemd-analyze verify/);
  assert.match(guide, /systemd-analyze security/);
  assert.match(guide, /data\/runtime\.env/);
});

test("Windows exit matches only this launcher's absolute server identity", async () => {
  const [windowsExit, launcher] = await Promise.all([
    readProjectFile("exit.bat"),
    readProjectFile("scripts/start-server.mjs"),
  ]);

  assert.match(launcher, /serverPath = resolve\(projectDir, "src\/server\/app\.mjs"\)/);
  assert.match(launcher, /spawn\(process\.execPath, \["--env-file-if-exists=\.env", serverPath\]/);
  assert.match(launcher, /cwd: projectDir/);
  assert.doesNotMatch(launcher, /spawn\([^\n]+"src\/server\/app\.mjs"/);
  assert.match(windowsExit, /absoluteScript.*Join-Path \$projectDir 'src\\server\\app\.mjs'/);
  assert.match(windowsExit, /argument -eq \$absoluteScript/);
  assert.doesNotMatch(windowsExit, /relativeScript/);
  assert.doesNotMatch(windowsExit, /argument -eq ['"](?:\.\/)?src\/server\/app\.mjs/);
});

test("Windows exit probes listeners and reports enumeration failure", async () => {
  const windowsExit = await readProjectFile("exit.bat");
  assert.match(windowsExit, /Get-NetTCPConnection -State Listen/);
  assert.match(windowsExit, /Get-NetTCPConnection -State Listen -ErrorAction Stop/);
  assert.match(windowsExit, /Unable to enumerate listening connections.*exit 1/);
  assert.match(windowsExit, /address -eq '0\.0\.0\.0'.*127\.0\.0\.1/);
  assert.match(windowsExit, /address -eq '::'.*::1.*127\.0\.0\.1/);
  assert.match(windowsExit, /address -eq '\*'.*127\.0\.0\.1.*::1/);
  assert.match(windowsExit, /New-Object System\.UriBuilder/);
  assert.match(windowsExit, /\/api\/document/);
});

test("Windows exit retains and signals one process handle with bounded waits", async () => {
  const windowsExit = await readProjectFile("exit.bat");
  assert.match(windowsExit, /function Get-RetainedTarget/);
  assert.match(windowsExit, /function Get-ProcessIdentity/);
  assert.match(windowsExit, /function Get-ProcessDetails/);
  assert.match(windowsExit, /Status = 'Success'/);
  assert.match(windowsExit, /'Gone'/);
  assert.match(windowsExit, /'Failure'/);
  assert.match(windowsExit, /Status = \$status/);
  assert.match(windowsExit, /function Close-ProcessHandle/);
  assert.match(windowsExit, /function Request-GracefulShutdown/);
  assert.match(windowsExit, /function Wait-RetainedTarget/);
  assert.match(windowsExit, /function Invoke-RetainedForce/);
  assert.match(windowsExit, /function Stop-RetainedTarget/);
  assert.match(windowsExit, /function Show-RetainedTargets/);
  assert.match(windowsExit, /function Close-RetainedTargets/);
  assert.match(windowsExit, /System\.Diagnostics\.Process]::GetProcessById/);
  assert.match(windowsExit, /nativeHandle = \$handle\.Handle/);
  assert.match(windowsExit, /Handle = \$handle/);
  assert.match(windowsExit, /NativeHandle = \$nativeHandle/);
  assert.match(windowsExit, /Handle\.StartTime\.ToUniversalTime\(\) -ne \$target\.StartTime/);
  assert.match(windowsExit, /graceWaitMilliseconds = 3000/);
  assert.match(windowsExit, /forceWaitMilliseconds = 3000/);
  assert.match(windowsExit, /data\\shutdown\.request/);
  assert.match(windowsExit, /requestToken = \[Guid]::NewGuid\(\)/);
  assert.match(windowsExit, /WriteAllText\(\$requestPath, \$requestToken/);
  assert.match(windowsExit, /Handle\.WaitForExit\(\$milliseconds\)/);
  assert.match(windowsExit, /Handle\.Kill\(\)/);
  assert.match(windowsExit, /Wait-RetainedTarget \$target \$graceWait.*Invoke-RetainedForce.*Wait-RetainedTarget \$target \$forceWait/s);
  assert.match(windowsExit, /finally \{.*Close-ProcessHandle \$pendingTarget\.Handle.*Close-RetainedTargets \$targets/s);
  assert.ok(windowsExit.indexOf("WriteAllText") < windowsExit.indexOf("Handle.Kill"));
  assert.doesNotMatch(windowsExit, /CloseMainWindow|taskkill|Stop-Process/);
  assert.doesNotMatch(windowsExit, /Get-CimInstance[^\n]+SilentlyContinue/);
  assert.match(windowsExit, /Unable to verify server process/);
  assert.match(windowsExit, /waitStatus -eq 'Failure'/);
  assert.match(windowsExit, /GRAMADO_EXIT_DRY_RUN/);
  assert.match(windowsExit, /GRAMADO_EXIT_DRY_RUN -eq '1'\) \{ Show-RetainedTargets \$targets \}/);
  assert.match(windowsExit, /Server is not running/);
  assert.match(windowsExit, /targets\.Count -eq 0.*if \(-not \$failed\).*Server is not running/s);
  assert.match(windowsExit, /if \(\$failed\) \{ exit 1 \}; exit 0/);
});

test("Linux exit revalidates the complete procfs identity before signals", async () => {
  const linuxExit = await readProjectFile("exit.sh");
  assert.match(linuxExit, /^set -Eeuo pipefail$/m);
  assert.match(linuxExit, /\/proc\/\[0-9\]\*/);
  assert.match(linuxExit, /process_cwd.*SCRIPT_DIR/);
  assert.match(linuxExit, /has_supported_server_argv/);
  assert.match(linuxExit, /process_argv\[@\].*== 2/);
  assert.match(linuxExit, /--env-file-if-exists=\.env/);
  assert.match(linuxExit, /argv0_matches_executable/);
  assert.match(linuxExit, /\/proc\/\$pid\/exe/);
  assert.match(linuxExit, /stat_fields\[19\]/);
  assert.match(linuxExit, /same_server_process.*\n.*same_process/s);
  assert.match(linuxExit, /signal_server_process.*\$pid.*\$start_time.*TERM/);
  assert.match(linuxExit, /signal_server_process.*\$pid.*\$start_time.*KILL/);
  assert.match(linuxExit, /GRACE_WAIT_ATTEMPTS=30/);
  assert.match(linuxExit, /FORCE_WAIT_ATTEMPTS=30/);
  assert.ok(linuxExit.indexOf(" TERM;") < linuxExit.indexOf(" KILL;"));
  assert.match(linuxExit, /BASH_SOURCE\[0\].*==.*\$0/);
});

test("Linux exit separates systemd outcomes before procfs fallback", async () => {
  const linuxExit = await readProjectFile("exit.sh");
  assert.match(linuxExit, /systemctl is-active/);
  assert.match(linuxExit, /active\|activating\|deactivating\|reloading/);
  assert.match(linuxExit, /inactive\|unknown\|failed.*return 2/);
  assert.match(linuxExit, /systemctl show --property=WorkingDirectory --value/);
  assert.match(linuxExit, /canonical_service_directory.*SCRIPT_DIR/);
  assert.match(linuxExit, /canonical_service_directory.*return 2/s);
  assert.match(linuxExit, /service_result == 1.*return 1/s);
  assert.match(linuxExit, /stop_direct_processes/);
  assert.match(linuxExit, /Server is not running/);
});

test("Linux exit falls back for a different checkout service", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { return 0; }
service_working_directory() { printf '%s\\n' /; }
collect_server_processes() { printf 'proc-fallback\\n'; }
main
`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /proc-fallback/);
});

test("Linux exit stops a matching systemd service without procfs fallback", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { return 0; }
service_working_directory() { printf '%s\\n' "$SCRIPT_DIR"; }
as_root() { return 0; }
collect_server_processes() { printf 'unexpected-proc-fallback\\n'; }
main
`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /System service stopped/);
  assert.doesNotMatch(result.stdout, /unexpected-proc-fallback/);
});

test("Linux exit propagates sudo failure without procfs fallback", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { return 0; }
service_working_directory() { printf '%s\\n' "$SCRIPT_DIR"; }
as_root() { return 1; }
collect_server_processes() { printf 'unexpected-proc-fallback\\n'; }
main
`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unable to stop the system service/);
  assert.doesNotMatch(result.stdout, /unexpected-proc-fallback/);
});

test("Linux exit reports an already stopped server successfully", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { return 2; }
collect_server_processes() { :; }
main
`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Server is not running/);
});

test("Linux exit sends TERM before bounded KILL", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { return 2; }
collect_server_processes() { server_pids=(4242); server_start_times=(100); }
alive=1
events=''
same_server_process() { (( alive == 1 )); }
send_process_signal() {
  events+="$2 "
  [[ "$2" != KILL ]] || alive=0
}
sleep() { :; }
main
printf 'signals=%s\\n' "$events"
`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /signals=TERM KILL /);
});

test("Linux exit refuses a changed or reused process identity", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { return 2; }
collect_server_processes() { server_pids=(4242); server_start_times=(100); }
same_server_process() { return 1; }
send_process_signal() { printf 'unexpected-signal\\n'; return 1; }
main
`);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /unexpected-signal/);
});

test("Linux exit propagates direct signal and confirmation failures", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { return 2; }
collect_server_processes() { server_pids=(4242); server_start_times=(100); }
same_server_process() { return 0; }
send_process_signal() { return 1; }
wait_for_targets() { return 1; }
main
`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unable to stop server process 4242/);
  assert.match(result.stderr, /Server processes did not stop/);
});

test("Linux exit accepts only the supported Node argv layouts", bashOptions(), () => {
  const result = runBashExit(`
check_argv() {
  local expected="$1" actual
  shift
  process_argv=("$@")
  if has_supported_server_argv; then actual=accept; else actual=reject; fi
  printf '%s=%s\\n' "$expected" "$actual"
  [[ "$actual" == "$expected" ]]
}
check_argv accept node src/server/app.mjs
check_argv accept /usr/bin/node --env-file-if-exists=.env ./src/server/app.mjs
check_argv accept node "$SCRIPT_DIR/src/server/app.mjs"
check_argv reject node --trace-warnings src/server/app.mjs
check_argv reject node --eval src/server/app.mjs
check_argv reject node src/server/app.mjs extra
check_argv reject node --env-file-if-exists=.env --trace-warnings src/server/app.mjs
`);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /accept=reject|reject=accept/);
});

test("Linux exit argv matching rejects deterministic randomized decoys", bashOptions(), () => {
  const result = runBashExit(`
seed=173
next_random() {
  seed=$(( (seed * 1103515245 + 12345) & 2147483647 ))
  random="$seed"
}
for (( sample = 0; sample < 96; sample += 1 )); do
  next_random
  server_paths=(src/server/app.mjs ./src/server/app.mjs "$SCRIPT_DIR/src/server/app.mjs")
  server_path="\${server_paths[$(( random % 3 ))]}"
  if (( random % 2 == 0 )); then
    process_argv=(node "$server_path")
  else
    process_argv=(node --env-file-if-exists=.env "$server_path")
  fi
  has_supported_server_argv || exit 41

  case $(( random % 6 )) in
    0) process_argv=(node "decoy/$server_path") ;;
    1) process_argv=(node "$server_path.bak") ;;
    2) process_argv=(node --eval "$server_path") ;;
    3) process_argv=(node --trace-warnings "$server_path") ;;
    4) process_argv=(node src/server/../server/app.mjs) ;;
    5) process_argv=(node "$server_path" extra) ;;
  esac
  ! has_supported_server_argv || exit 42
done
`);
  assert.equal(result.status, 0, result.stderr);
});

test("Linux exit falls back when systemd reports inactive", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { service_state=inactive; return 2; }
collect_server_processes() { printf 'inactive-fallback\\n'; }
main
`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /inactive-fallback/);
});

test("Linux exit falls back directly when systemd reports failed", bashOptions(), () => {
  const result = runBashExit(`
systemd_available() { return 0; }
systemctl() {
  [[ "$1" == is-active ]] || return 1
  printf 'failed\\n'
  return 3
}
collect_server_processes() { printf 'failed-fallback\\n'; }
main
`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /failed-fallback/);
  assert.match(result.stdout, /Server is not running/);
});

test("Linux exit stops a transitional matching systemd unit", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { service_state=deactivating; return 0; }
service_working_directory() { printf '%s\\n' "$SCRIPT_DIR"; }
as_root() { return 0; }
collect_server_processes() { printf 'unexpected-proc-fallback\\n'; }
main
`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /System service stopped/);
  assert.doesNotMatch(result.stdout, /unexpected-proc-fallback/);
});

test("Linux exit rejects systemctl inspection failure without procfs fallback", bashOptions(), () => {
  const result = runBashExit(`
inspect_system_service() { return 1; }
collect_server_processes() { printf 'unexpected-proc-fallback\\n'; }
main
`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unable to inspect the system service/);
  assert.doesNotMatch(result.stdout, /unexpected-proc-fallback/);
});

test("Windows exit dry-run is non-destructive", {
  skip: process.platform === "win32" ? false : "Windows-only assertion",
}, () => {
  const result = spawnSync("cmd.exe", ["/d", "/c", "exit.bat"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GRAMADO_EXIT_DRY_RUN: "1" },
    timeout: 30_000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});

function bashOptions() {
  return { skip: bash ? false : "No usable Bash executable found" };
}

function runBashExit(body) {
  return spawnSync(bash, ["-c", `source ./exit.sh\n${body}`], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
  });
}

function findBash() {
  const candidates = process.platform === "win32"
    ? [process.env.BASH, "C:\\Program Files\\Git\\bin\\bash.exe", "bash"]
    : [process.env.BASH, "bash"];
  for (const candidate of new Set(candidates.filter(Boolean))) {
    const result = spawnSync(candidate, ["-c", "exit 0"], { cwd: root });
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}
