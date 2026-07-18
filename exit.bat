@echo off
setlocal EnableExtensions
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$source = Get-Content -LiteralPath '.\exit.bat'; $first = [Array]::IndexOf($source, ':powershell'); $last = [Array]::IndexOf($source, ':endpowershell'); $body = @($source[($first + 1)..($last - 1)] | ForEach-Object { $_.Trim().TrimEnd([char]94).Trim().Trim([char]34) }); Invoke-Expression ($body -join ' ')"
set "EXIT_CODE=%ERRORLEVEL%"
endlocal & exit /b %EXIT_CODE%

:powershell
  "$ErrorActionPreference = 'Stop';" ^
  "$projectDir = [System.IO.Path]::GetFullPath((Get-Location).Path).TrimEnd('\');" ^
  "$absoluteScript = [System.IO.Path]::GetFullPath((Join-Path $projectDir 'src\server\app.mjs')).Replace('\', '/');" ^
  "function Test-ProjectCommand([string] $commandLine) {" ^
  "  foreach ($token in [regex]::Matches($commandLine, '[^\s\x22'']+|\x22[^\x22]*\x22|''[^'']*''')) {" ^
  "    $argument = $token.Value.Trim([char]34, [char]39).Replace('\', '/');" ^
  "    if ($argument -eq $absoluteScript) { return $true };" ^
  "  };" ^
  "  return $false;" ^
  "};" ^
  "function Get-ProbeHosts([string] $address) {" ^
  "  if ($address -eq '0.0.0.0') { return @('127.0.0.1') };" ^
  "  if ($address -eq '::') { return @('::1', '127.0.0.1') };" ^
  "  if ($address -eq '*') { return @('127.0.0.1', '::1') };" ^
  "  return @($address);" ^
  "};" ^
  "function Test-TripboardEndpoint([string] $hostName, [int] $port) {" ^
  "  try {" ^
  "    $uri = New-Object System.UriBuilder('http', $hostName, $port, '/api/document');" ^
  "    $state = Invoke-RestMethod -Uri $uri.Uri.AbsoluteUri -TimeoutSec 2;" ^
  "    return $state.document.schemaVersion -eq 3 -and $null -ne $state.document.sections;" ^
  "  } catch { return $false };" ^
  "};" ^
  "function Test-TripboardListeners($process, $listeners) {" ^
  "  foreach ($listener in @($listeners | Where-Object OwningProcess -eq $process.ProcessId)) {" ^
  "    foreach ($hostName in @(Get-ProbeHosts $listener.LocalAddress)) {" ^
  "      if (Test-TripboardEndpoint $hostName $listener.LocalPort) { return $true };" ^
  "    };" ^
  "  };" ^
  "  return $false;" ^
  "};" ^
  "function Close-ProcessHandle($handle) {" ^
  "  if ($null -eq $handle) { return $true };" ^
  "  try { $handle.Dispose(); return $true } catch { return $false };" ^
  "};" ^
  "function Test-ProcessGone([int] $processId) {" ^
  "  $probe = $null;" ^
  "  try { $probe = [System.Diagnostics.Process]::GetProcessById($processId); return $false }" ^
  "  catch [System.ArgumentException] { return $true }" ^
  "  catch { return $false }" ^
  "  finally { $null = Close-ProcessHandle $probe };" ^
  "};" ^
  "function Test-InactiveStatus([string] $status) {" ^
  "  return $status -eq 'Gone' -or $status -eq 'Changed';" ^
  "};" ^
  "function Get-ProcessIdentity($target) {" ^
  "  try {" ^
  "    $target.Handle.Refresh();" ^
  "    if ($target.Handle.HasExited) { return 'Gone' };" ^
  "    if ($target.Handle.Id -ne $target.ProcessId) { return 'Changed' };" ^
  "    if ($target.Handle.StartTime.ToUniversalTime() -ne $target.StartTime) { return 'Changed' };" ^
  "    return 'Same';" ^
  "  } catch {" ^
  "    if (Test-ProcessGone $target.ProcessId) { return 'Gone' };" ^
  "    return 'Failure';" ^
  "  };" ^
  "};" ^
  "function Get-ProcessDetails([int] $processId) {" ^
  "  try {" ^
  "    $process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $processId) -ErrorAction Stop;" ^
  "    if ($null -eq $process) { return [pscustomobject]@{ Status = 'Gone'; Process = $null } };" ^
  "    return [pscustomobject]@{ Status = 'Success'; Process = $process };" ^
  "  } catch {" ^
  "    $status = if (Test-ProcessGone $processId) { 'Gone' } else { 'Failure' };" ^
  "    return [pscustomobject]@{ Status = $status; Process = $null };" ^
  "  };" ^
  "};" ^
  "function Get-RetainedTarget($process) {" ^
  "  $handle = $null;" ^
  "  try {" ^
  "    $handle = [System.Diagnostics.Process]::GetProcessById($process.ProcessId);" ^
  "    $nativeHandle = $handle.Handle;" ^
  "    $startTime = $handle.StartTime.ToUniversalTime();" ^
  "    if ($handle.HasExited) {" ^
  "      $status = if (Close-ProcessHandle $handle) { 'Gone' } else { 'Failure' };" ^
  "      return [pscustomobject]@{ Status = $status; Target = $null };" ^
  "    };" ^
  "    $target = [pscustomobject]@{ ProcessId = $process.ProcessId; StartTime = $startTime; Handle = $handle; NativeHandle = $nativeHandle };" ^
  "    return [pscustomobject]@{ Status = 'Success'; Target = $target };" ^
  "  } catch {" ^
  "    $disposed = Close-ProcessHandle $handle;" ^
  "    $status = if ($disposed -and (Test-ProcessGone $process.ProcessId)) { 'Gone' } else { 'Failure' };" ^
  "    return [pscustomobject]@{ Status = $status; Target = $null };" ^
  "  };" ^
  "};" ^
  "function Request-GracefulShutdown([string] $directory) {" ^
  "  $requestPath = Join-Path $directory 'data\shutdown.request';" ^
  "  $requestToken = [Guid]::NewGuid().ToString('N');" ^
  "  try { [System.IO.File]::WriteAllText($requestPath, $requestToken, [System.Text.Encoding]::ASCII); return $true }" ^
  "  catch { [Console]::Error.WriteLine('[Tripboard] Unable to request graceful server shutdown.'); return $false };" ^
  "};" ^
  "function Wait-RetainedTarget($target, [int] $milliseconds) {" ^
  "  try {" ^
  "    $status = if ($target.Handle.WaitForExit($milliseconds)) { 'Exited' } else { 'Running' };" ^
  "    return $status;" ^
  "  } catch {" ^
  "    $identity = Get-ProcessIdentity $target;" ^
  "    if (Test-InactiveStatus $identity) { return 'Exited' };" ^
  "    return 'Failure';" ^
  "  };" ^
  "};" ^
  "function Invoke-RetainedForce($target) {" ^
  "  $identity = Get-ProcessIdentity $target;" ^
  "  if (Test-InactiveStatus $identity) { return $true };" ^
  "  if ($identity -ne 'Same') { [Console]::Error.WriteLine('[Tripboard] Unable to verify server process ' + $target.ProcessId + '.'); return $false };" ^
  "  try { $target.Handle.Kill(); return $true } catch {" ^
  "    $identity = Get-ProcessIdentity $target;" ^
  "    if (Test-InactiveStatus $identity) { return $true };" ^
  "    [Console]::Error.WriteLine('[Tripboard] Unable to force server process ' + $target.ProcessId + '.');" ^
  "    return $false;" ^
  "  };" ^
  "};" ^
  "function Stop-RetainedTarget($target, [int] $graceWait, [int] $forceWait) {" ^
  "  $identity = Get-ProcessIdentity $target;" ^
  "  if (Test-InactiveStatus $identity) { return $true };" ^
  "  if ($identity -ne 'Same') { [Console]::Error.WriteLine('[Tripboard] Unable to verify server process ' + $target.ProcessId + '.'); return $false };" ^
  "  $waitStatus = Wait-RetainedTarget $target $graceWait;" ^
  "  if ($waitStatus -eq 'Failure') { [Console]::Error.WriteLine('[Tripboard] Unable to wait for server process ' + $target.ProcessId + '.'); return $false };" ^
  "  if ($waitStatus -eq 'Running') {" ^
  "    if (-not (Invoke-RetainedForce $target)) { return $false };" ^
  "  };" ^
  "  $waitStatus = Wait-RetainedTarget $target $forceWait;" ^
  "  if ($waitStatus -eq 'Failure') { [Console]::Error.WriteLine('[Tripboard] Unable to wait for server process ' + $target.ProcessId + '.'); return $false };" ^
  "  if ($waitStatus -eq 'Exited') { Write-Host ('[Tripboard] Stopped server process ' + $target.ProcessId + '.'); return $true };" ^
  "  $identity = Get-ProcessIdentity $target;" ^
  "  if (Test-InactiveStatus $identity) { Write-Host ('[Tripboard] Stopped server process ' + $target.ProcessId + '.'); return $true };" ^
  "  if ($identity -eq 'Failure') { [Console]::Error.WriteLine('[Tripboard] Unable to verify server process ' + $target.ProcessId + '.'); return $false };" ^
  "  [Console]::Error.WriteLine('[Tripboard] Server process ' + $target.ProcessId + ' did not stop.');" ^
  "  return $false;" ^
  "};" ^
  "function Show-RetainedTargets($targets) {" ^
  "  foreach ($target in $targets) { Write-Host ('[Tripboard] Server process ' + $target.ProcessId + ' is running.') };" ^
  "};" ^
  "function Stop-RetainedTargets($targets, [string] $directory, [int] $graceWait, [int] $forceWait) {" ^
  "  $success = Request-GracefulShutdown $directory;" ^
  "  foreach ($target in $targets) {" ^
  "    if (-not (Stop-RetainedTarget $target $graceWait $forceWait)) { $success = $false };" ^
  "  };" ^
  "  return $success;" ^
  "};" ^
  "function Close-RetainedTargets($targets) {" ^
  "  $success = $true;" ^
  "  foreach ($target in $targets) {" ^
  "    if (-not (Close-ProcessHandle $target.Handle)) { [Console]::Error.WriteLine('[Tripboard] Unable to release server process ' + $target.ProcessId + '.'); $success = $false };" ^
  "  };" ^
  "  return $success;" ^
  "};" ^
  "try { $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop) }" ^
  "catch { [Console]::Error.WriteLine('[Tripboard] Unable to enumerate listening connections: ' + $_.Exception.Message); exit 1 };" ^
  "$targets = @(); $pendingTarget = $null; $failed = $false;" ^
  "$graceWaitMilliseconds = 3000;" ^
  "$forceWaitMilliseconds = 3000;" ^
  "$shutdownSucceeded = $true;" ^
  "try {" ^
  "  foreach ($ownerPid in @($listeners.OwningProcess | Sort-Object -Unique)) {" ^
  "    $inspection = Get-ProcessDetails $ownerPid;" ^
  "    if ($inspection.Status -eq 'Gone') { continue };" ^
  "    if ($inspection.Status -eq 'Failure') { [Console]::Error.WriteLine('[Tripboard] Unable to inspect server process ' + $ownerPid + '.'); $failed = $true; continue };" ^
  "    $process = $inspection.Process;" ^
  "    if ($process.Name -ne 'node.exe' -or -not (Test-ProjectCommand $process.CommandLine)) { continue };" ^
  "    if (-not (Test-TripboardListeners $process $listeners)) { continue };" ^
  "    $retention = Get-RetainedTarget $process;" ^
  "    if ($retention.Status -eq 'Success') { $pendingTarget = $retention.Target; $targets += $pendingTarget; $pendingTarget = $null; continue };" ^
  "    if ($retention.Status -eq 'Gone') { continue };" ^
  "    [Console]::Error.WriteLine('[Tripboard] Unable to retain server process ' + $process.ProcessId + '.');" ^
  "    $failed = $true;" ^
  "  };" ^
  "  if ($targets.Count -eq 0) {" ^
  "    if (-not $failed) { Write-Host '[Tripboard] Server is not running.' };" ^
  "  } else {" ^
  "    if ($env:GRAMADO_EXIT_DRY_RUN -eq '1') { Show-RetainedTargets $targets }" ^
  "    else { $shutdownSucceeded = Stop-RetainedTargets $targets $projectDir $graceWaitMilliseconds $forceWaitMilliseconds };" ^
  "  };" ^
  "} finally {" ^
  "  if (-not (Close-ProcessHandle $pendingTarget.Handle)) { $shutdownSucceeded = $false };" ^
  "  if (-not (Close-RetainedTargets $targets)) { $shutdownSucceeded = $false };" ^
  "};" ^
  "if (-not $shutdownSucceeded) { $failed = $true };" ^
  "if ($failed) { exit 1 }; exit 0"
:endpowershell
