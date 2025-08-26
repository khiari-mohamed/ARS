@echo off
echo Installing missing dependencies...
cd server
call npm install @nestjs/event-emitter
echo Dependencies installed successfully!
pause