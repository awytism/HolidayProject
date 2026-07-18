@echo off
setlocal EnableExtensions
cd /d "%~dp0"

powershell.exe -NoProfile -Command "if (-not (Select-String -LiteralPath '%~f0' -Pattern '^rem TRIPBOARD_LAUNCHER_END$' -Quiet)) { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo [Tripboard] start.bat is incomplete or was truncated during upload.
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [Tripboard] Node.js was not found. Install Node.js 22.13 or newer from https://nodejs.org/
  exit /b 1
)

node -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major>22||(major===22&&minor>=13)?0:1)"
if errorlevel 1 (
  for /f %%V in ('node -p "process.versions.node"') do set "NODE_VERSION=%%V"
  echo [Tripboard] Node.js 22.13 or newer is required. Installed version: %NODE_VERSION%
  exit /b 1
)

node -e "require('express');require('sharp')" >nul 2>&1
if errorlevel 1 (
  where npm >nul 2>&1
  if errorlevel 1 (
    echo [Tripboard] npm was not found. Reinstall Node.js with npm enabled.
    exit /b 1
  )
  echo [Tripboard] Installing production dependencies...
  call npm ci --omit=dev
  if errorlevel 1 exit /b 1
)

if not defined PORT set "PORT=4177"
set "GRAMADO_STRICT_PORT=1"
echo [Tripboard] Starting on fixed port %PORT%...
node "scripts\start-server.mjs"
set "EXIT_CODE=%ERRORLEVEL%"
endlocal & exit /b %EXIT_CODE%

rem TRIPBOARD_LAUNCHER_END
