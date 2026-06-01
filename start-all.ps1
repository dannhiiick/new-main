$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontDir = Join-Path $root "front"
$python = Join-Path $root "venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
  Write-Host "Creating Python venv..."
  python -m venv (Join-Path $root "venv")
}

if (-not (Test-Path (Join-Path $root "venv\Lib\site-packages\django"))) {
  Write-Host "Installing backend dependencies..."
  & $python -m pip install -r (Join-Path $backendDir "requirements.txt")
}

if (-not (Test-Path (Join-Path $frontDir "node_modules"))) {
  Write-Host "Installing frontend dependencies..."
  Push-Location $frontDir
  npm ci
  Pop-Location
}

Write-Host "Syncing music catalog..."
& $python (Join-Path $backendDir "manage.py") migrate
& $python (Join-Path $backendDir "manage.py") sync_music

$backendCommand = "Set-Location '$backendDir'; & '$python' manage.py runserver 8002"
$frontendCommand = "Set-Location '$frontDir'; npm run dev -- --host=127.0.0.1 --port=5173"

Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $backendCommand)
Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $frontendCommand)

Write-Host ""
Write-Host "Started:"
Write-Host "  Frontend: http://127.0.0.1:5173/"
Write-Host "  Admin:    http://127.0.0.1:8002/admin/"
