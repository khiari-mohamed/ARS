@echo off
echo Starting ARS deployment to IIS...

REM Build frontend
echo Building frontend...
cd frontend
call npm install
call npm run build
cd ..

REM Copy build files to IIS directory
echo Copying files to IIS...
xcopy /E /Y frontend\build\* C:\inetpub\wwwroot\ars\
copy /Y web.config C:\inetpub\wwwroot\ars\

echo Frontend deployed successfully!
echo.
echo Next steps:
echo 1. Deploy backend API to port 8000
echo 2. Deploy AI microservice to port 8001
echo 3. Configure database connection
echo 4. Update production URLs in .env.production

pause