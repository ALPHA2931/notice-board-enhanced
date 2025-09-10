@echo off
echo Starting Notice Board Development Servers...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "npm run dev:backend"
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "npm run dev:frontend"

echo.
echo ===============================================
echo   Notice Board Development Servers Started!
echo ===============================================
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:3000
echo ===============================================
echo.
echo Press any key to exit...
pause > nul
