@echo off
REM ── Local CI Script for user-service (Windows) ───────────────
REM Run this before every push: run-ci.bat

echo.
echo =========================================
echo   user-service — Local CI
echo =========================================

echo.
echo [1/3] Compiling...
call mvn compile -q
if errorlevel 1 ( echo ❌ Compile FAILED & exit /b 1 )
echo ✅ Compile passed

echo.
echo [2/3] Running tests...
call mvn test
if errorlevel 1 ( echo ❌ Tests FAILED & exit /b 1 )
echo ✅ Tests passed

echo.
echo [3/3] Building JAR...
call mvn package -DskipTests -q
if errorlevel 1 ( echo ❌ Build FAILED & exit /b 1 )
echo ✅ JAR built

echo.
echo =========================================
echo   ✅ All checks passed! Safe to push.
echo =========================================
echo.
