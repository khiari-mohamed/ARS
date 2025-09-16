@echo off
echo ========================================
echo    ARS Database Comprehensive Seeding
echo ========================================
echo.
echo This script will populate your ARS database with comprehensive test data
echo including users, clients, bordereaux, bulletins de soins, reclamations,
echo wire transfers, and all other modules.
echo.
echo WARNING: This will clear existing data and create new test data!
echo.
set /p confirm="Do you want to continue? (y/N): "
if /i "%confirm%" neq "y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Starting comprehensive database seeding...
echo.

cd /d "%~dp0"
node run-comprehensive-seed.js

echo.
echo ========================================
echo           Seeding Complete!
echo ========================================
echo.
echo Your ARS database is now populated with test data.
echo You can login with any of the provided credentials.
echo.
pause