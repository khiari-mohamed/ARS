@echo off
echo ========================================
echo    ARS Database Complete Seeding
echo ========================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js first
    pause
    exit /b 1
)

echo Node.js found. Starting database seeding...
echo.

echo Installing required dependencies...
npm install @prisma/client bcrypt

echo.
echo Running Prisma generate...
npx prisma generate

echo.
echo Starting complete database seeding...
node complete-seed.js

echo.
echo ========================================
echo    Seeding completed!
echo ========================================
pause