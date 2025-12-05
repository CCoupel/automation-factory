# Script pour construire et déployer la version backend avec SQLite
# PowerShell script pour Windows

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "1.3.8"
)

Write-Host "🚀 Building and deploying Ansible Builder Backend v$Version with SQLite support" -ForegroundColor Green

$ErrorActionPreference = "Stop"

try {
    # Aller au répertoire racine
    $rootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    Set-Location $rootPath

    Write-Host "📂 Working directory: $rootPath" -ForegroundColor Blue

    # 1. Se connecter au registry GitHub
    Write-Host "🔐 Logging into GitHub Container Registry..." -ForegroundColor Yellow
    $tokenContent = Get-Content "github_token.txt" -Raw
    $token = ($tokenContent -split "`n")[1] -replace "token: ", ""
    
    $token | docker login ghcr.io -u ccoupel --password-stdin
    if ($LASTEXITCODE -ne 0) { 
        throw "Docker login failed"
    }

    # 2. Build l'image backend
    Write-Host "🔨 Building backend image v$Version..." -ForegroundColor Yellow
    Set-Location "backend"
    
    docker build -t "ghcr.io/ccoupel/ansible-builder-backend:$Version" -f Dockerfile .
    if ($LASTEXITCODE -ne 0) { 
        throw "Docker build failed"
    }

    # 3. Push l'image
    Write-Host "📤 Pushing backend image..." -ForegroundColor Yellow
    docker push "ghcr.io/ccoupel/ansible-builder-backend:$Version"
    if ($LASTEXITCODE -ne 0) { 
        throw "Docker push failed"
    }

    # Retourner au répertoire racine
    Set-Location $rootPath

    # 4. Déployer via Helm
    Write-Host "🚢 Deploying with Helm..." -ForegroundColor Yellow
    helm --kubeconfig=kubeconfig.txt upgrade ansible-builder ./helm/ansible-builder -f custom-values.yaml --namespace ansible-builder
    if ($LASTEXITCODE -ne 0) { 
        throw "Helm upgrade failed"
    }

    # 5. Attendre que les pods soient prêts
    Write-Host "⏳ Waiting for pods to be ready..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt wait --for=condition=ready pod -l app.kubernetes.io/component=backend -n ansible-builder --timeout=180s

    # 6. Vérifier le statut
    Write-Host "📊 Checking deployment status..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt get pods -n ansible-builder

    Write-Host "✅ Backend v$Version deployed successfully with SQLite support!" -ForegroundColor Green
    Write-Host "🔗 Test the API at: https://coupel.net/ansible-builder/api/version" -ForegroundColor Cyan
    Write-Host "👤 Default credentials: admin@example.com / admin" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}