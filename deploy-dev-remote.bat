@echo off
setlocal

REM Configuration
set DOCKER_HOST=tcp://192.168.1.217:2375
set REMOTE_USER=cyril
set REMOTE_HOST=192.168.1.217

echo.
echo 🚀 Déploiement architecture 3 composants sur Docker distant
echo 📍 Docker Host: %DOCKER_HOST%
echo.

REM Test connexion Docker
echo 🔗 Test connexion Docker distant...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker distant non accessible
    exit /b 1
)
echo ✅ Docker distant accessible

REM Nettoyage conteneurs existants
echo.
echo 🛑 Nettoyage des conteneurs existants...
docker stop ansible-builder-nginx ansible-builder-frontend ansible-builder-backend 2>nul
docker rm ansible-builder-nginx ansible-builder-frontend ansible-builder-backend 2>nul
echo ✅ Conteneurs nettoyés

REM Copie des fichiers de configuration
echo.
echo 📁 Copie des fichiers de configuration...
scp docker-compose.remote.yml %REMOTE_USER%@%REMOTE_HOST%:/tmp/ 2>nul
scp nginx-remote.conf %REMOTE_USER%@%REMOTE_HOST%:/tmp/ 2>nul

REM Création répertoire de travail distant
ssh %REMOTE_USER%@%REMOTE_HOST% "mkdir -p /tmp/ansible-builder-deploy" 2>nul
ssh %REMOTE_USER%@%REMOTE_HOST% "cp /tmp/docker-compose.remote.yml /tmp/nginx-remote.conf /tmp/ansible-builder-deploy/" 2>nul
echo ✅ Fichiers copiés

REM Création archive du code source
echo.
echo 📦 Création archive du code source...
tar -czf ansible-builder-src.tar.gz --exclude=frontend/node_modules --exclude=backend/__pycache__ --exclude=frontend/dist --exclude=.git frontend/ backend/ 2>nul

REM Copie et extraction sur serveur distant
scp ansible-builder-src.tar.gz %REMOTE_USER%@%REMOTE_HOST%:/tmp/ 2>nul
ssh %REMOTE_USER%@%REMOTE_HOST% "cd /tmp/ansible-builder-deploy && tar -xzf /tmp/ansible-builder-src.tar.gz" 2>nul

REM Nettoyage local
del ansible-builder-src.tar.gz 2>nul
echo ✅ Code source déployé

REM Build et démarrage
echo.
echo 🔨 Build et démarrage des services...
ssh %REMOTE_USER%@%REMOTE_HOST% "cd /tmp/ansible-builder-deploy && sudo docker-compose -f docker-compose.remote.yml up --build -d" 2>nul
echo ✅ Services démarrés

REM Attente
echo.
echo ⏳ Attente du démarrage des services...
timeout /t 15 /nobreak >nul

REM Vérifications
echo.
echo 🔍 Vérification des services...

curl -s http://%REMOTE_HOST%/health >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ Health Check: OK
) else (
    echo   ❌ Health Check: Erreur
)

curl -s http://%REMOTE_HOST%/api/version >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ API Version: OK
) else (
    echo   ❌ API Version: Erreur
)

curl -s http://%REMOTE_HOST% >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ Frontend: OK
) else (
    echo   ❌ Frontend: Erreur
)

echo.
echo 📊 Statut des conteneurs:
ssh %REMOTE_USER%@%REMOTE_HOST% "sudo docker ps --filter name=ansible-builder"

echo.
echo 🌐 URLs d'accès:
echo   • Application complète: http://%REMOTE_HOST%
echo   • API: http://%REMOTE_HOST%/api/version
echo   • Frontend direct: http://%REMOTE_HOST%:5180
echo   • Backend direct: http://%REMOTE_HOST%:8000

echo.
echo 🎯 Déploiement distant réussi !
echo.
pause