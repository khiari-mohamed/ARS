@echo off
echo Searching for "colonne" in TypeScript files...
cd /d "d:\ARS\server\src"
findstr /s /i /n "colonne" *.ts 2>nul
if errorlevel 1 (
    echo No matches found in .ts files
) else (
    echo.
    echo Found matches above
)
pause
