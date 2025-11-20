@echo off
echo Starting ARS Application Demo Environment...
echo.

echo Starting Backend Server...
start "ARS Backend" cmd /k "cd /d d:\ARS\server && npm run start:dev"
timeout /t 3

echo Starting AI Microservice...
start "ARS AI Service" cmd /k "cd /d d:\ARS\ai-microservice && python ai_microservice.py"
timeout /t 3

echo Starting Frontend...
start "ARS Frontend" cmd /k "cd /d d:\ARS\frontend && npm start"

echo.
echo All services are starting...
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo AI Service: http://localhost:8000
echo.
echo Wait for all services to fully load before starting your demo.
echo Press any key to continue...
pause