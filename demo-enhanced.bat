@echo off
echo ============================================
echo Enhanced Digital Notice Board Demo
echo Demonstrating CS Fundamentals in Practice
echo ============================================
echo.

echo [1/4] Installing advanced data structure dependencies...
npm install roaring bloom-filters node-cron

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Installing frontend dependencies...
cd src\frontend
npm install

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install frontend dependencies
    cd ..\..
    pause
    exit /b 1
)

cd ..\..

echo.
echo [3/4] Building TypeScript backend...
echo Building enhanced services with data structures...

echo.
echo [4/4] Starting Enhanced Notice Board System...
echo.
echo Features included:
echo - Hash Maps & Bloom Filters for audience targeting
echo - Priority Queues & Binary Heaps for scheduling
echo - Roaring Bitmaps for efficient set operations
echo - Finite State Machines for notice lifecycle
echo - Circular Buffers for real-time display pipelines
echo - Real-time statistics dashboard
echo.
echo Starting servers...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo Enhanced API: http://localhost:3001/api/enhanced-notices
echo.

start "Backend Server" cmd /k "npm run server"
timeout /t 3 /nobreak > nul
start "Frontend Server" cmd /k "cd src\frontend && npm start"

echo.
echo System starting... Please wait for both servers to initialize.
echo.
echo Demo Instructions:
echo 1. Navigate to http://localhost:3000
echo 2. Register a new account
echo 3. Try the Enhanced Admin Panel to see CS concepts in action
echo 4. Create notices with advanced audience targeting
echo 5. Monitor real-time system statistics
echo 6. Test emergency notice preemption
echo.
echo Press any key to open the application in your browser...
pause > nul

start "" "http://localhost:3000"

echo.
echo Enhanced Digital Notice Board is running!
echo Check the README-ENHANCED.md for detailed documentation.
echo.
pause
