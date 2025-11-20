@echo off
echo 🌱 Starting ARS Complete Database Seeding...
echo.

cd /d "%~dp0"

echo 📦 Installing required dependencies...
npm install bcrypt
echo.

echo 🗄️ Generating Prisma Client...
npx prisma generate
echo.

echo 🌱 Running complete seed script...
node complete-seed.js
echo.

echo ✅ Seeding completed!
echo.
echo 🔑 You can now login with:
echo   Super Admin: admin@ars.tn / admin123
echo   Chef Équipe: chef1@ars.tn / chef123
echo   Gestionnaire: gest1@ars.tn / gest123
echo   Finance: finance1@ars.tn / finance123
echo.
pause