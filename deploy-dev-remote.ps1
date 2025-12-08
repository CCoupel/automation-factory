# Script PowerShell pour déployer l'architecture 3 composants sur Docker distant
# Selon la procédure : Frontend 5180, Backend 8000, Nginx 80

param(
    [string]$DockerHost = "192.168.1.217:2375",
    [string]$RemoteUser = "cyril",
    [string]$RemoteHost = "192.168.1.217"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Déploiement architecture 3 composants sur Docker distant" -ForegroundColor Green
Write-Host "📍 Docker Host: $DockerHost" -ForegroundColor Cyan
Write-Host ""

# Configuration Docker distant
$env:DOCKER_HOST = "tcp://$DockerHost"

try {
    # Test connexion Docker
    Write-Host "🔗 Test connexion Docker distant..." -ForegroundColor Yellow
    docker version | Out-Null
    Write-Host "✅ Docker distant accessible" -ForegroundColor Green

    # Arrêt des conteneurs existants
    Write-Host "🛑 Nettoyage des conteneurs existants..." -ForegroundColor Yellow
    docker stop ansible-builder-nginx ansible-builder-frontend ansible-builder-backend 2>$null | Out-Null
    docker rm ansible-builder-nginx ansible-builder-frontend ansible-builder-backend 2>$null | Out-Null
    Write-Host "✅ Conteneurs nettoyés" -ForegroundColor Green

    # Suppression des images de dev existantes (pour rebuild)
    Write-Host "🗑️ Suppression des images dev existantes..." -ForegroundColor Yellow
    docker rmi ansible-builder-frontend_frontend ansible-builder-backend_backend 2>$null | Out-Null
    Write-Host "✅ Images nettoyées" -ForegroundColor Green

    # Copie des fichiers de configuration sur le serveur distant
    Write-Host "📁 Copie des fichiers de configuration..." -ForegroundColor Yellow
    scp docker-compose.remote.yml "${RemoteUser}@${RemoteHost}:/tmp/"
    scp nginx-remote.conf "${RemoteUser}@${RemoteHost}:/tmp/"
    
    # Création du répertoire de travail distant
    ssh "${RemoteUser}@${RemoteHost}" "mkdir -p /tmp/ansible-builder-deploy"
    ssh "${RemoteUser}@${RemoteHost}" "cp /tmp/docker-compose.remote.yml /tmp/nginx-remote.conf /tmp/ansible-builder-deploy/"
    Write-Host "✅ Fichiers copiés" -ForegroundColor Green

    # Création d'une archive du code source
    Write-Host "📦 Création archive du code source..." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $archiveName = "ansible-builder-src-$timestamp.tar.gz"
    
    # Exclure les node_modules et autres dossiers volumineux
    $excludeArgs = @(
        "--exclude=frontend/node_modules"
        "--exclude=backend/__pycache__"
        "--exclude=frontend/dist"
        "--exclude=.git"
        "--exclude=*.pyc"
        "--exclude=.vscode"
    )
    
    tar -czf $archiveName $excludeArgs frontend/ backend/
    
    # Copie et extraction sur le serveur distant
    scp $archiveName "${RemoteUser}@${RemoteHost}:/tmp/"
    ssh "${RemoteUser}@${RemoteHost}" "cd /tmp/ansible-builder-deploy && tar -xzf /tmp/$archiveName"
    
    # Nettoyage local
    Remove-Item $archiveName
    Write-Host "✅ Code source déployé" -ForegroundColor Green

    # Build et démarrage avec Docker Compose sur le serveur distant
    Write-Host "🔨 Build et démarrage des services..." -ForegroundColor Yellow
    ssh "${RemoteUser}@${RemoteHost}" "cd /tmp/ansible-builder-deploy && sudo docker-compose -f docker-compose.remote.yml up --build -d"
    Write-Host "✅ Services démarrés" -ForegroundColor Green

    # Attente du démarrage
    Write-Host "⏳ Attente du démarrage des services..." -ForegroundColor Yellow
    Start-Sleep 15

    # Vérification des services
    Write-Host "🔍 Vérification des services..." -ForegroundColor Cyan
    
    $services = @(
        @{ Name = "Health Check"; Url = "http://$RemoteHost/health" }
        @{ Name = "API Version"; Url = "http://$RemoteHost/api/version" }
        @{ Name = "Frontend"; Url = "http://$RemoteHost" }
    )

    foreach ($service in $services) {
        try {
            $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✅ $($service.Name): OK" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️ $($service.Name): Status $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ❌ $($service.Name): Erreur - $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    # Statut des conteneurs
    Write-Host ""
    Write-Host "📊 Statut des conteneurs:" -ForegroundColor Cyan
    ssh "${RemoteUser}@${RemoteHost}" "sudo docker ps --filter name=ansible-builder"

    Write-Host ""
    Write-Host "🌐 URLs d'accès:" -ForegroundColor Green
    Write-Host "  • Application complète: http://$RemoteHost" -ForegroundColor White
    Write-Host "  • API: http://$RemoteHost/api/version" -ForegroundColor White
    Write-Host "  • Frontend direct: http://$RemoteHost:5180" -ForegroundColor Gray
    Write-Host "  • Backend direct: http://$RemoteHost:8000" -ForegroundColor Gray

    Write-Host ""
    Write-Host "📋 Commandes utiles:" -ForegroundColor Cyan
    Write-Host "  • Logs nginx: ssh $RemoteUser@$RemoteHost 'sudo docker logs ansible-builder-nginx -f'" -ForegroundColor White
    Write-Host "  • Logs frontend: ssh $RemoteUser@$RemoteHost 'sudo docker logs ansible-builder-frontend -f'" -ForegroundColor White
    Write-Host "  • Logs backend: ssh $RemoteUser@$RemoteHost 'sudo docker logs ansible-builder-backend -f'" -ForegroundColor White
    Write-Host "  • Arrêter: ssh $RemoteUser@$RemoteHost 'cd /tmp/ansible-builder-deploy && sudo docker-compose -f docker-compose.remote.yml down'" -ForegroundColor White

    Write-Host ""
    Write-Host "🎯 Déploiement distant réussi !" -ForegroundColor Green

} catch {
    Write-Host "❌ Erreur lors du déploiement: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Nettoyage de l'environnement Docker
    $env:DOCKER_HOST = $null
}