@echo off
echo.
echo 🚀 Démarrage architecture 3 composants simplifiée (sans Docker)
echo.

REM Tuer les processus existants sur les ports
echo 🛑 Nettoyage des processus existants...
taskkill /F /FI "IMAGENAME eq node.exe" 2>nul
taskkill /F /FI "IMAGENAME eq python.exe" 2>nul
timeout /t 2 /nobreak >nul

REM Démarrer le backend
echo.
echo 🐍 Démarrage Backend (FastAPI)...
start "Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Attendre le backend
timeout /t 5 /nobreak >nul

REM Démarrer le frontend
echo 🎨 Démarrage Frontend (Vite)...
start "Frontend" cmd /k "cd frontend && npm run dev"

REM Attendre le frontend
timeout /t 10 /nobreak >nul

echo.
echo 🔍 Vérification des services...

curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo   Backend (FastAPI): ✅ OK
) else (
    echo   Backend (FastAPI): ❌ Erreur
)

curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo   Frontend (Vite): ✅ OK
) else (
    curl -s http://localhost:5174 >nul 2>&1
    if %errorlevel% equ 0 (
        echo   Frontend (Vite): ✅ OK sur port 5174
    ) else (
        echo   Frontend (Vite): ❌ Erreur
    )
)

echo.
echo 🌐 URLs d'accès:
echo   • Frontend: http://localhost:5173 ou http://localhost:5174
echo   • Backend: http://localhost:8000
echo   • API: http://localhost:5173/api ou http://localhost:5174/api

echo.
echo 📝 Note: Frontend utilise URLs relatives /api grâce à la détection automatique
echo    (port 5173+ = URLs absolues, port 80 = URLs relatives via nginx)

echo.
echo 🎯 Architecture 2 composants démarrée (en attente Docker pour nginx)
echo.
pause