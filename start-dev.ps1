# Turnir Hub - start backend (:8000) + frontend (:3000)
# Usage:  .\start-dev.ps1
# If blocked:  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host " Turnir Hub"
Write-Host " ----------"
Write-Host " Backend:  http://localhost:8000"
Write-Host " Frontend: http://localhost:3000"
Write-Host ""

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host "[db] docker compose up -d db ..."
  Push-Location $Root
  docker compose up -d db
  Pop-Location
} else {
  Write-Host "[db] Docker not in PATH - expecting Postgres on localhost:5432"
}

$activate = Join-Path $Root "backend\venv\Scripts\activate.bat"
if (-not (Test-Path $activate)) {
  Write-Host "[ERROR] Missing backend\venv - create it first:"
  Write-Host "  cd backend"
  Write-Host "  python -m venv venv"
  Write-Host "  .\venv\Scripts\Activate.ps1"
  Write-Host "  pip install -r requirements\development.txt"
  exit 1
}

$portableNode = Join-Path $Root "tools\node"
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
  if (Test-Path (Join-Path $portableNode "npm.cmd")) {
    $env:Path = "$portableNode;$env:Path"
    Write-Host "[frontend] Using portable Node from tools\node"
  } else {
    Write-Host "[ERROR] npm not found."
    Write-Host "Install Node.js LTS from https://nodejs.org/"
    Write-Host "or put portable Node into tools\node\"
    exit 1
  }
}

$nodeModules = Join-Path $Root "frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
  Write-Host "[frontend] Installing npm dependencies..."
  Push-Location (Join-Path $Root "frontend")
  npm install
  Pop-Location
}

Write-Host "[backend]  starting Django on :8000 ..."
Start-Process cmd -ArgumentList "/k", "cd /d `"$Root\backend`" && call venv\Scripts\activate.bat && python manage.py runserver 8000"

$frontendPath = if (Test-Path (Join-Path $portableNode "npm.cmd")) {
  "set `"PATH=$portableNode;%PATH%`" && "
} else { "" }

Write-Host "[frontend] starting Vite on :3000 ..."
Start-Process cmd -ArgumentList "/k", "cd /d `"$Root\frontend`" && $frontendPath`npm run dev"

Write-Host ""
Write-Host "Opened two windows. Close them to stop the servers."

