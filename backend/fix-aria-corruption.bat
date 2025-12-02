@echo off
echo ========================================
echo Fix MySQL Aria Corruption Error
echo ========================================
echo.
echo This will repair corrupted Aria tables
echo.
echo Step 1: Stopping MySQL service...
net stop MySQL80
if %errorlevel% neq 0 (
    echo Warning: Could not stop MySQL. Trying alternative service names...
    net stop MySQL57
    net stop MySQL
)
echo.
echo Step 2: Waiting 3 seconds...
timeout /t 3 /nobreak >nul
echo.
echo Step 3: Repairing databases...
echo You will be prompted for MySQL root password
echo.
mysqlcheck -u root -p --auto-repair --check --all-databases
echo.
echo Step 4: Starting MySQL service...
net start MySQL80
if %errorlevel% neq 0 (
    echo Trying alternative service names...
    net start MySQL57
    net start MySQL
)
echo.
echo ========================================
echo Repair complete!
echo ========================================
echo.
echo Test your connection:
echo   mysql -u root -p
echo.
pause

