@echo off
REM Quick Start Guide for Epic Games Free Games Claimer - Windows Batch
REM This script helps you get started quickly

setlocal enabledelayedexpansion

echo =====================================
echo Epic Games Claimer - Quick Start
echo =====================================
echo.

REM Check Node.js installation
where node >nul 2>nul
if errorlevel 1 (
    echo [X] Node.js not found. Please install Node.js 18 or higher
    echo     Download: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set node_version=%%i
echo [OK] Node.js %node_version% found

REM Check npm installation
where npm >nul 2>nul
if errorlevel 1 (
    echo [X] npm not found
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set npm_version=%%i
echo [OK] npm %npm_version% found
echo.

REM Install dependencies
echo [*] Installing dependencies...
call npm install
if errorlevel 1 (
    echo [X] Failed to install dependencies
    pause
    exit /b 1
)

REM Install Playwright browsers
echo [*] Installing Playwright browsers...
call npx playwright install
if errorlevel 1 (
    echo [X] Failed to install Playwright browsers
    pause
    exit /b 1
)

REM Build TypeScript
echo [*] Building TypeScript...
call npm run build
if errorlevel 1 (
    echo [X] Failed to build TypeScript
    pause
    exit /b 1
)

REM Check if .env exists
if not exist .env (
    echo.
    echo [*] Setting up configuration...
    copy .env.example .env >nul
    echo [OK] Created .env file
    echo.
    echo [!] Please edit .env file and add your credentials:
    echo     EPIC_EMAIL=your_email@example.com
    echo     EPIC_PASSWORD=your_password
    echo.
    echo     Then run: npm run claim
) else (
    echo.
    echo [OK] .env file already exists
)

echo.
echo =====================================
echo Setup Complete! [OK]
echo =====================================
echo.
echo Next steps:
echo 1. Edit .env with your Epic Games credentials
echo 2. Run: npm run claim
echo 3. Check logs in: .\logs\
echo.
echo For more info, see README.md
echo.
pause
