@echo off
cd /d "%~dp0"
echo Building TypeScript...
call npm run build
if %errorlevel% equ 0 (
    echo Build successful!
    exit /b 0
) else (
    echo Build failed!
    exit /b 1
)
