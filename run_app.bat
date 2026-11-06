@echo off
title AI Communication Coach Starter
echo ========================================================
echo Starting AI Communication Coach (Backend + Frontend)...
echo ========================================================

start "FastAPI Backend (Port 8000)" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 2 /nobreak >nul

start "Vite Frontend (Port 5173)" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 3 /nobreak >nul

start http://localhost:5173
echo.
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend API Docs: http://127.0.0.1:8000/docs
echo.

