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
echo  Frontend: http://localhost:3000
echo  API:      http://localhost:8000  (browser uses :3000/api via Vite proxy)
echo.

REM --- Postgres: Docker if available ---
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

REM --- Kill stale dev servers on 3000 / 8000 ---
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1

echo [backend]  starting Django on 127.0.0.1:8000 ...
start "turnir-hub backend" /D "%ROOT%\backend" cmd /k "call venv\Scripts\activate.bat && python manage.py runserver 127.0.0.1:8000"

echo [backend]  waiting for API ...
timeout /t 3 /nobreak >nul

echo [frontend] starting Vite on localhost:3000 ...
start "turnir-hub frontend" /D "%ROOT%\frontend" cmd /k "set PATH=%ROOT%\tools\node;%PATH% && npm run dev"

echo.
echo Opened two windows. Close them to stop the servers.
echo.
pause
endlocal
