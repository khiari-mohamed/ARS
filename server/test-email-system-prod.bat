@echo off
echo ========================================
echo Email & Notification System Test
echo PRODUCTION ENVIRONMENT
echo ========================================
echo.

REM Set production environment variables
set API_URL=http://10.34.60.63:5000/api
set TEST_EMAIL=test@arstunisia.com
set NODE_ENV=production

REM Prompt for credentials
echo Please enter your login credentials:
set /p TEST_USER_EMAIL="Email: "
set /p TEST_USER_PASSWORD="Password: "

echo.
echo API URL: %API_URL%
echo Test Email: %TEST_EMAIL%
echo User: %TEST_USER_EMAIL%
echo Environment: PRODUCTION
echo.
echo WARNING: This will test the PRODUCTION email system!
echo Press Ctrl+C to cancel, or
pause

echo.
echo Starting production tests...
echo.

node test-email-notification-system.js

echo.
echo ========================================
echo Production test completed!
echo ========================================
pause
