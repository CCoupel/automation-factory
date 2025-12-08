@echo off
echo.
echo 🚀 Démarrage architecture 3 composants (identique K8s)
echo.

REM Vérifier Docker
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker non disponible. Installer Docker Desktop.
    exit /b 1
)
echo ✅ Docker disponible

REM Arrêter les conteneurs existants
echo.
echo 🛑 Arrêt des conteneurs existants...
docker-compose -f docker-compose.dev.yml down 2>nul

REM Construire et démarrer
echo.
echo 🔨 Construction et démarrage des services...
docker-compose -f docker-compose.dev.yml up --build -d

REM Attendre le démarrage
echo.
echo ⏳ Attente du démarrage des services...
timeout /t 15 /nobreak >nul

REM Vérifier les services
echo.
echo 🔍 Vérification des services...

curl -s http://localhost/health >nul 2>&1
if %errorlevel% equ 0 (
    echo   Nginx (Reverse Proxy): ✅ OK
) else (
    echo   Nginx (Reverse Proxy): ❌ Erreur
)

curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo   Frontend (Vite): ✅ OK
) else (
    echo   Frontend (Vite): ❌ Erreur
)

curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo   Backend (FastAPI): ✅ OK
) else (
    echo   Backend (FastAPI): ❌ Erreur
)

echo.
echo 📊 Statut des conteneurs:
docker-compose -f docker-compose.dev.yml ps

echo.
echo 🌐 URLs d'accès:
echo   • Application complète: http://localhost
echo   • API directe: http://localhost/api/version
echo   • Frontend direct: http://localhost:5173
echo   • Backend direct: http://localhost:8000

echo.
echo 📋 Commandes utiles:
echo   • Logs nginx: docker logs ansible-builder-nginx-dev -f
echo   • Logs frontend: docker logs ansible-builder-frontend-dev -f
echo   • Logs backend: docker logs ansible-builder-backend-dev -f
echo   • Arrêter: docker-compose -f docker-compose.dev.yml down

echo.
echo 🎯 Architecture identique K8s démarrée avec succès !
echo.
pause