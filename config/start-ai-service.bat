@echo off
cd /d D:\ARS\ai-microservice
python -m uvicorn ai_microservice:app --host 0.0.0.0 --port 8002