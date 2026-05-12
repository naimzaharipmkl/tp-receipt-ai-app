@echo off
title ReceiptAI — Starting...
color 0A

echo.
echo  =========================================
echo    ReceiptAI — Receipt Scanner
echo    Powered by AI
echo  =========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Check if node_modules exists, run npm install if not
cd /d "%~dp0"
if not exist "node_modules\" (
    echo [INFO] First time setup: Installing dependencies...
    call npm install
    echo.
)

:: Kill any existing process on port 8080
echo [1/3] Clearing port 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start the Node.js server in the background
echo [2/3] Starting server...
start /B node server.js

:: Wait a moment for server to start
timeout /t 2 /nobreak >nul

:: Open the browser
echo [3/3] Opening browser...
start http://localhost:8080

echo.
echo  =========================================
echo    App is running at http://localhost:8080
echo    Close this window to stop the server.
echo  =========================================
echo.

:: Wait for user to close window
pause
