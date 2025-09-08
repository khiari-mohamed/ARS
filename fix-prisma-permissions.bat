@echo off
echo ========================================
echo   FIXING PRISMA PERMISSIONS ISSUE
echo ========================================

cd /d "%~dp0server"

echo [1/5] Stopping any running Node processes...
taskkill /f /im node.exe 2>nul
timeout /t 2

echo [2/5] Clearing Prisma cache...
rmdir /s /q "node_modules\.prisma" 2>nul
rmdir /s /q "%USERPROFILE%\.cache\prisma" 2>nul

echo [3/5] Clearing npm cache...
call npm cache clean --force

echo [4/5] Reinstalling Prisma...
call npm uninstall prisma @prisma/client
call npm install prisma @prisma/client

echo [5/5] Generating Prisma client...
call npx prisma generate

echo ========================================
echo   PRISMA PERMISSIONS FIXED!
echo ========================================
pause