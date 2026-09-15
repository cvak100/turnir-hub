@echo off
setlocal EnableExtensions
REM ============================================================
REM  Turnir Hub - start backend (:61106) + frontend (:3000)
REM  Double-click this file, or run from cmd:  start-dev.bat
REM ============================================================
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo.
echo  Turnir Hub
echo  ----------
echo  Local:    http://localhost:3000
echo  API:      http://localhost:61106  (internal; browser uses :3000/api via proxy)
echo.
echo  REMOTE: forward/open TCP 3000 only (NOT 61106, NOT 5432)
echo.

REM --- Windows Firewall: 3000 + 61106 inbound ---
for %%P in (3000 61106) do (
  netsh advfirewall firewall show rule name="Turnir Hub %%P" >nul 2>&1
  if errorlevel 1 (
    echo [fw] adding rule TCP %%P ...
    netsh advfirewall firewall add rule name="Turnir Hub %%P" dir=in action=allow protocol=TCP localport=%%P >nul 2>&1
  )
)

echo.
REM --- Postgres: Docker if available, else portable C:\Python\pgsql ---
where docker >nul 2>&1
if %ERRORLEVEL%==0 (
  echo [db] docker compose up -d db ...
  pushd "%ROOT%"
  docker compose up -d db
  popd
) else if exist "C:\Python\pgsql\bin\pg_ctl.exe" (
  echo [db] starting portable Postgres at C:\Python\pgsql ...
  "C:\Python\pgsql\bin\pg_ctl.exe" -D "C:\Python\pgsql\data" -l "C:\Python\pgsql\logfile.txt" status >nul 2>&1
  if errorlevel 1 (
    "C:\Python\pgsql\bin\pg_ctl.exe" -D "C:\Python\pgsql\data" -l "C:\Python\pgsql\logfile.txt" start
  ) else (
    echo [db] Postgres already running
  )
) else (
  echo [db] WARN: no Docker and no C:\Python\pgsql - expecting Postgres on localhost:5432
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

REM --- Kill stale dev servers on 3000 / 61106 ---
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":61106" ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1

echo [backend]  starting Django on 0.0.0.0:61106 ...
start "turnir-hub backend" /D "%ROOT%\backend" cmd /k "call venv\Scripts\activate.bat && python manage.py runserver 0.0.0.0:61106"

echo [backend]  waiting for API ...
timeout /t 3 /nobreak >nul

echo [frontend] starting Vite on 0.0.0.0:3000 ...
start "turnir-hub frontend" /D "%ROOT%\frontend" cmd /k "set PATH=%ROOT%\tools\node;%PATH% && npm run dev"

echo.
echo Opened two windows. Close them to stop the servers.
echo Login (dev): admin / admin
echo.
echo Remote access (optional):
echo   Forward only TCP 3000 to this PC (LAN IP).
echo   Open http://YOUR-PUBLIC-IP:3000  (API goes through same port via Vite proxy)
echo   Do NOT forward 61106 or 5432.
echo.
pause
endlocal
