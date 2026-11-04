@echo off
REM ============================================================================
REM CIMS .deb Package Builder
REM Run this from the master_api\master_api directory
REM Requires: Docker Desktop running on Windows
REM ============================================================================

setlocal enabledelayedexpansion

REM ── Configuration ──────────────────────────────────────────────────────────
set VERSION=1.0.0
set PACKAGE_NAME=cims
set FRONTEND_DIR=..\..\CIMS-FIXED\front1
set BACKEND_DIR=.
set OUTPUT_DIR=.\dist

REM ── Parse optional version argument ────────────────────────────────────────
if not "%1"=="" set VERSION=%1

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               CIMS .deb Package Builder                     ║
echo ║               Version: %VERSION%                              ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  Building compiled backend + frontend into .deb package     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM ── Verify Docker is running ──────────────────────────────────────────────
echo [1/5] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop and try again.
    exit /b 1
)
echo       Docker is running.

REM ── Prepare build context ─────────────────────────────────────────────────
echo [2/5] Preparing build context...

set BUILD_CONTEXT=.\packaging\_build_context
if exist "%BUILD_CONTEXT%" rmdir /s /q "%BUILD_CONTEXT%"
mkdir "%BUILD_CONTEXT%"
mkdir "%BUILD_CONTEXT%\frontend"
mkdir "%BUILD_CONTEXT%\backend"
mkdir "%BUILD_CONTEXT%\packaging"

REM Copy frontend source (excluding node_modules)
echo       Copying frontend source...
robocopy "%FRONTEND_DIR%" "%BUILD_CONTEXT%\frontend" /E /XD node_modules .git /XF .env.local .env /NFL /NDL /NJH /NJS >nul

REM Copy backend source (only what's needed)
echo       Copying backend source...
xcopy "%BACKEND_DIR%\app" "%BUILD_CONTEXT%\backend\app\" /E /I /Q /Y >nul
xcopy "%BACKEND_DIR%\alembic" "%BUILD_CONTEXT%\backend\alembic\" /E /I /Q /Y >nul
copy "%BACKEND_DIR%\alembic.ini" "%BUILD_CONTEXT%\backend\" >nul
copy "%BACKEND_DIR%\requirements.txt" "%BUILD_CONTEXT%\backend\" >nul

REM Copy packaging files
echo       Copying packaging files...
xcopy ".\packaging\debian" "%BUILD_CONTEXT%\packaging\debian\" /E /I /Q /Y >nul
xcopy ".\packaging\config" "%BUILD_CONTEXT%\packaging\config\" /E /I /Q /Y >nul
xcopy ".\packaging\systemd" "%BUILD_CONTEXT%\packaging\systemd\" /E /I /Q /Y >nul
copy ".\packaging\entrypoint.py" "%BUILD_CONTEXT%\packaging\" >nul
copy ".\packaging\Dockerfile.build" "%BUILD_CONTEXT%\Dockerfile" >nul

REM ── Build with Docker ─────────────────────────────────────────────────────
echo [3/5] Building .deb package with Docker (this may take 10-30 minutes)...
echo       Compiling Python backend with Nuitka...
echo       Building React frontend...
echo.

docker build ^
    --build-arg VERSION=%VERSION% ^
    --build-arg PACKAGE_NAME=%PACKAGE_NAME% ^
    --output type=local,dest="%BUILD_CONTEXT%\output" ^
    "%BUILD_CONTEXT%"

if errorlevel 1 (
    echo.
    echo ERROR: Docker build failed. Check the output above for details.
    exit /b 1
)

REM ── Extract the .deb ─────────────────────────────────────────────────────
echo [4/5] Extracting .deb package...
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
copy "%BUILD_CONTEXT%\output\%PACKAGE_NAME%_%VERSION%.deb" "%OUTPUT_DIR%\" >nul

REM ── Cleanup ──────────────────────────────────────────────────────────────
echo [5/5] Cleaning up build context...
rmdir /s /q "%BUILD_CONTEXT%"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    BUILD SUCCESSFUL!                        ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                            ║
echo ║  Package: dist\%PACKAGE_NAME%_%VERSION%.deb
echo ║                                                            ║
echo ║  To deploy to Ubuntu server:                               ║
echo ║                                                            ║
echo ║  1. Copy the .deb to the server:                           ║
echo ║     scp dist\%PACKAGE_NAME%_%VERSION%.deb user@server:~/
echo ║                                                            ║
echo ║  2. Install on the server:                                 ║
echo ║     sudo dpkg -i %PACKAGE_NAME%_%VERSION%.deb
echo ║     sudo apt-get install -f                                ║
echo ║                                                            ║
echo ║  3. Configure:                                             ║
echo ║     sudo nano /etc/cims/cims.env                           ║
echo ║                                                            ║
echo ║  4. Start:                                                 ║
echo ║     sudo systemctl start cims-backend                      ║
echo ║     sudo systemctl restart nginx                           ║
echo ║                                                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
