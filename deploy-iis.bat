@echo off
echo Starting ARS deployment to IIS...

REM Build frontend with production config
echo Building frontend for production...
cd C:\ARS\frontend
call npm install
set REACT_APP_API_URL=http://10.34.60.63:5000/api
set PUBLIC_URL=/ars
call npm run build
cd C:\ARS

REM Copy build files to IIS directory
echo Copying files to IIS...
if not exist "C:\inetpub\wwwroot\ars" mkdir "C:\inetpub\wwwroot\ars"
xcopy /E /Y C:\ARS\frontend\build\* C:\inetpub\wwwroot\ars\
copy /Y C:\ARS\web.config C:\inetpub\wwwroot\ars\

echo Frontend deployed successfully!
echo Access at: http://10.34.60.63/ars

pause