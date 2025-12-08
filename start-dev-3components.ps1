# Script PowerShell pour démarrer l'architecture 3 composants en développement
# Identique à K8s : Nginx + Frontend + Backend séparés

Write-Host "🚀 Démarrage architecture 3 composants (identique K8s)" -ForegroundColor Green
Write-Host ""

# Vérifier Docker
try {
    docker version | Out-Null
    Write-Host "✅ Docker disponible" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker non disponible. Installer Docker Desktop." -ForegroundColor Red
    exit 1
}

# Arrêter les conteneurs existants
Write-Host "🛑 Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down 2>$null

# Construire et démarrer
Write-Host "🔨 Construction et démarrage des services..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up --build -d

# Attendre le démarrage
Write-Host "⏳ Attente du démarrage des services..." -ForegroundColor Yellow
Start-Sleep 10

# Vérifier les services
Write-Host ""
Write-Host "🔍 Vérification des services..." -ForegroundColor Cyan

$services = @(
    @{ Name = "Nginx (Reverse Proxy)"; Url = "http://localhost/health"; Container = "ansible-builder-nginx-dev" }
    @{ Name = "Frontend (Vite)"; Url = "http://localhost:5173"; Container = "ansible-builder-frontend-dev" }
    @{ Name = "Backend (FastAPI)"; Url = "http://localhost:8000/health"; Container = "ansible-builder-backend-dev" }
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 5 -UseBasicParsing
        $status = if ($response.StatusCode -eq 200) { "✅ OK" } else { "⚠️  Warning" }
        Write-Host "  $($service.Name): $status" -ForegroundColor Green
    } catch {
        Write-Host "  $($service.Name): ❌ Erreur" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 Statut des conteneurs:" -ForegroundColor Cyan
docker-compose -f docker-compose.dev.yml ps

Write-Host ""
Write-Host "🌐 URLs d'accès:" -ForegroundColor Green
Write-Host "  • Application complète: http://localhost" -ForegroundColor White
Write-Host "  • API directe: http://localhost/api/version" -ForegroundColor White
Write-Host "  • Frontend direct: http://localhost:5173" -ForegroundColor Gray
Write-Host "  • Backend direct: http://localhost:8000" -ForegroundColor Gray

Write-Host ""
Write-Host "📋 Commandes utiles:" -ForegroundColor Cyan
Write-Host "  • Logs nginx: docker logs ansible-builder-nginx-dev -f" -ForegroundColor White
Write-Host "  • Logs frontend: docker logs ansible-builder-frontend-dev -f" -ForegroundColor White
Write-Host "  • Logs backend: docker logs ansible-builder-backend-dev -f" -ForegroundColor White
Write-Host "  • Arrêter: docker-compose -f docker-compose.dev.yml down" -ForegroundColor White

Write-Host ""
Write-Host "🎯 Architecture identique K8s démarrée avec succès !" -ForegroundColor Green