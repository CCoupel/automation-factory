@echo off
REM Script to package and push Ansible Builder Helm Chart to OCI Registry (Windows)
REM Usage: package-oci.bat <registry> [version]
REM
REM Examples:
REM   package-oci.bat ghcr.io/ccoupel
REM   package-oci.bat docker.io/myusername 1.1.0

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set REPO_ROOT=%SCRIPT_DIR%..
set CHART_DIR=%REPO_ROOT%\helm\ansible-builder

REM Check registry argument
if "%~1"=="" (
    echo Error: Registry URL required
    echo.
    echo Usage: %~nx0 ^<registry^> [version]
    echo.
    echo Examples:
    echo   %~nx0 ghcr.io/ccoupel
    echo   %~nx0 docker.io/myusername
    echo   %~nx0 registry.gitlab.com/mygroup
    echo.
    exit /b 1
)

set REGISTRY=%~1

REM Get version from Chart.yaml or command line
if not "%~2"=="" (
    set VERSION=%~2
) else (
    for /f "tokens=2" %%a in ('findstr /r "^version:" "%CHART_DIR%\Chart.yaml"') do set VERSION=%%a
)

echo ===================================
echo Packaging Ansible Builder Chart
echo Registry: %REGISTRY%
echo Version: %VERSION%
echo ===================================

REM Check if helm is installed
where helm >nul 2>nul
if errorlevel 1 (
    echo Error: helm is not installed
    echo Please install helm: https://helm.sh/docs/intro/install/
    echo.
    echo For Windows:
    echo   choco install kubernetes-helm
    echo   OR
    echo   scoop install helm
    exit /b 1
)

REM Update dependencies
echo.
echo [36m📦 Updating dependencies...[0m
cd /d "%CHART_DIR%"
helm dependency update
if errorlevel 1 (
    echo [31mError: Failed to update dependencies[0m
    exit /b 1
)

REM Package the chart
echo.
echo [36m📦 Packaging chart...[0m
set PACKAGE_FILE=ansible-builder-%VERSION%.tgz
helm package . --destination "%SCRIPT_DIR%"
if errorlevel 1 (
    echo [31mError: Failed to package chart[0m
    exit /b 1
)

REM Check if package was created
if not exist "%SCRIPT_DIR%\%PACKAGE_FILE%" (
    echo [31mError: Package file not created[0m
    exit /b 1
)

REM Push to OCI registry
echo.
echo [36m🚀 Pushing to OCI registry...[0m
echo [33mNote: You must be logged in to the registry (helm registry login %REGISTRY%)[0m
echo.

helm push "%SCRIPT_DIR%\%PACKAGE_FILE%" "oci://%REGISTRY%"
if errorlevel 1 (
    echo.
    echo [31mError: Failed to push to registry[0m
    echo [33mMake sure you are logged in:[0m
    echo   helm registry login %REGISTRY%
    exit /b 1
)

REM Display results
echo.
echo [32m✅ Chart pushed successfully to OCI registry![0m
echo.
echo [36m📦 Package:[0m %PACKAGE_FILE%
echo [36m📍 Location:[0m oci://%REGISTRY%/ansible-builder:%VERSION%
echo.
echo [36mUsers can now install with:[0m
echo   helm install ansible-builder oci://%REGISTRY%/ansible-builder --version %VERSION%
echo.
echo [36mOr to always get the latest:[0m
echo   helm install ansible-builder oci://%REGISTRY%/ansible-builder
echo.
echo [36mTo update:[0m
echo   helm upgrade ansible-builder oci://%REGISTRY%/ansible-builder --version %VERSION%
echo.

endlocal
