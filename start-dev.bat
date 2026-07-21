@echo off
setlocal EnableExtensions
REM ============================================================
REM  Turnir Hub - start backend (:8000) + frontend (:3000)
REM  Double-click this file, or run from cmd:  start-dev.bat
REM ============================================================
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo.
echo  Turnir Hub
echo  ----------
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:3000
echo.

REM --- Postgres (optional Docker) ---
where docker >nul 2>&1
if %ERRORLEVEL%==0 (
  echo [db] docker compose up -d db ...
  pushd "%ROOT%"
  docker compose up -d db
  popd
) else (
  echo [db] Docker not in PATH - expecting Postgres on localhost:5432
)

REM --- Backend venv ---
if not exist "%ROOT%\backend\venv\Scripts\activate.bat" (
  echo [ERROR] Missing backend\venv - create it first:
  echo   cd backend
  echo   python -m venv venv
  echo   venv\Scripts\activate
  echo   pip install -r requirements\development.txt
  pause
  exit /b 1
)

REM --- Frontend / npm (system PATH, else portable tools\node) ---
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  if exist "%ROOT%\tools\node\npm.cmd" (
    set "PATH=%ROOT%\tools\node;%PATH%"
    echo [frontend] Using portable Node from tools\node
  ) else (
    echo [ERROR] npm not found.
    echo Install Node.js LTS from https://nodejs.org/
    echo or put portable Node into tools\node\
    pause
    exit /b 1
  )
)

if not exist "%ROOT%\frontend\node_modules\" (
  echo [frontend] Installing npm dependencies...
  pushd "%ROOT%\frontend"
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed
    popd
    pause
    exit /b 1
  )
  popd
)

echo [backend]  starting Django on :8000 ...
start "turnir-hub backend" /D "%ROOT%\backend" cmd /k "call venv\Scripts\activate.bat && python manage.py runserver 8000"

echo [frontend] starting Vite on :3000 ...
start "turnir-hub frontend" /D "%ROOT%\frontend" cmd /k "set PATH=%ROOT%\tools\node;%PATH% && npm run dev"

echo.
echo Opened two windows. Close them to stop the servers.
echo Login (dev): admin / admin
echo.
pause
endlocal
