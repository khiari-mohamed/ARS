@echo off
echo ========================================
echo Email & Notification System Test
echo ========================================
echo.

REM Set environment variables
set API_URL=http://localhost:5000/api
set TEST_EMAIL=test@arstunisia.com

REM Prompt for credentials
echo Please enter your login credentials:
set /p TEST_USER_EMAIL="Email: "
set /p TEST_USER_PASSWORD="Password: "

echo.
echo API URL: %API_URL%
echo Test Email: %TEST_EMAIL%
echo User: %TEST_USER_EMAIL%
echo.
echo Starting tests...
echo.

node test-email-notification-system.js

echo.
echo ========================================
echo Test completed!
echo ========================================
pause
