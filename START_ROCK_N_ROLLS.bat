@echo off
title Rock N Rolls - Kitchen & Online Ordering
color 0A

echo ========================================================
echo        ROCK N ROLLS - RESTAURANT ORDERING SYSTEM
echo ========================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/ to run this app.
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
if not exist "node_modules\" (
    echo [INFO] Installing required npm packages...
    call npm install
) else (
    echo [OK] Dependencies are ready.
)

echo.
echo [2/3] Starting Rock N Rolls Server on http://localhost:8080 ...
start "Rock N Rolls Server" cmd /k "node server.js"

echo [3/3] Starting Localtunnel for mobile & WhatsApp integration...
start "Rock N Rolls Tunnel" cmd /k "node tunnel.js"

echo.
echo ========================================================
echo  All systems launched successfully!
echo.
echo  Customer View : http://localhost:8080/
echo  Admin Portal  : http://localhost:8080/admin
echo ========================================================
echo.

timeout /t 3 >nul

:: Open browser automatically
start http://localhost:8080/
start http://localhost:8080/admin

echo Done! Keep the server and tunnel command prompt windows open.
echo You can minimize this window.
pause
