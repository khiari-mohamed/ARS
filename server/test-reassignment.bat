@echo off
echo ========================================
echo Testing Reassignment Workflow
echo ========================================
echo.

cd /d "%~dp0"
node test-reassignment-workflow.js

echo.
echo ========================================
echo Test completed!
echo ========================================
pause
