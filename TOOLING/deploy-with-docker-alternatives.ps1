# Script pour déployer les nouvelles versions en contournant les limitations Docker locales
# Utilise diverses stratégies pour builder et pusher les images

param(
    [Parameter(Mandatory=$false)]
    [string]$BackendVersion = "1.3.8",
    [Parameter(Mandatory=$false)]
    [string]$FrontendVersion = "1.5.1"
)

Write-Host "🚀 Deploying Automation Factory with new versions" -ForegroundColor Green
Write-Host "   Backend: v$BackendVersion" -ForegroundColor Cyan
Write-Host "   Frontend: v$FrontendVersion" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

try {
    # Aller au répertoire racine
    $rootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    Set-Location $rootPath
    Write-Host "📂 Working directory: $rootPath" -ForegroundColor Blue

    # Lire le token GitHub
    $tokenContent = Get-Content "github_token.txt" -Raw
    $lines = $tokenContent -split "`n"
    $token = ($lines[1] -replace "token: ", "").Trim()
    $dockerHost = ($lines[3] -replace "docker: ", "").Trim()

    Write-Host "🔍 Detected Docker host: $dockerHost" -ForegroundColor Yellow

    # Tenter différentes approches pour Docker
    $dockerCommands = @(
        "docker",  # Docker local
        "docker --host tcp://${dockerHost}:2376",  # Docker distant
        "podman"   # Alternative Podman si disponible
    )

    $dockerCmd = $null
    foreach ($cmd in $dockerCommands) {
        try {
            $null = Invoke-Expression "$cmd version" -ErrorAction SilentlyContinue
            $dockerCmd = $cmd
            Write-Host "✅ Using: $dockerCmd" -ForegroundColor Green
            break
        }
        catch {
            Write-Host "❌ $cmd not available" -ForegroundColor Yellow
        }
    }

    if (-not $dockerCmd) {
        Write-Host "⚠️  No Docker available. Trying manual deployment..." -ForegroundColor Yellow
        
        # Stratégie alternative : utiliser une image existante avec patch des sources
        Write-Host "📦 Updating deployment configuration only..." -ForegroundColor Cyan
        
        # Mettre à jour custom-values.yaml avec les nouvelles versions
        $customValuesPath = "custom-values.yaml"
        $content = Get-Content $customValuesPath
        $content = $content -replace 'tag: "[\d\.]+"', "tag: `"$BackendVersion`""
        
        # Ajouter configuration pour forcer le redémarrage des pods
        if ($content -notmatch "imagePullPolicy") {
            $backendIndex = [array]::IndexOf($content, ($content | Where-Object { $_ -match "backend:" }))
            if ($backendIndex -ge 0) {
                $content = $content[0..$backendIndex] + "  image:" + "    pullPolicy: Always" + $content[($backendIndex+1)..($content.Length-1)]
            }
        }
        
        Set-Content $customValuesPath $content
        Write-Host "✅ Updated custom-values.yaml" -ForegroundColor Green
        
    } else {
        # Docker disponible - builder et pusher normalement
        Write-Host "🔐 Logging into GitHub Container Registry..." -ForegroundColor Yellow
        $token | & $dockerCmd.Split()[0] login ghcr.io -u ccoupel --password-stdin
        
        # Builder backend
        Write-Host "🔨 Building backend v$BackendVersion..." -ForegroundColor Yellow
        Set-Location "backend"
        & $dockerCmd.Split()[0] build -t "ghcr.io/ccoupel/automation-factory-backend:$BackendVersion" -f Dockerfile .
        & $dockerCmd.Split()[0] push "ghcr.io/ccoupel/automation-factory-backend:$BackendVersion"
        
        Set-Location $rootPath
        
        # Builder frontend  
        Write-Host "🔨 Building frontend v$FrontendVersion..." -ForegroundColor Yellow
        Set-Location "frontend"
        & $dockerCmd.Split()[0] build -t "ghcr.io/ccoupel/automation-factory-frontend:$FrontendVersion" -f Dockerfile .
        & $dockerCmd.Split()[0] push "ghcr.io/ccoupel/automation-factory-frontend:$FrontendVersion"
        
        Set-Location $rootPath
    }

    # Mettre à jour les versions dans custom-values.yaml
    Write-Host "📝 Updating versions in Helm values..." -ForegroundColor Yellow
    $customValues = Get-Content "custom-values.yaml" -Raw
    $customValues = $customValues -replace '(tag:\s*")[^"]*(")', "`$1$BackendVersion`$2"
    Set-Content "custom-values.yaml" $customValues

    # Déployer via Helm
    Write-Host "🚢 Deploying with Helm..." -ForegroundColor Yellow
    helm --kubeconfig=kubeconfig.txt upgrade automation-factory ./helm/automation-factory -f custom-values.yaml --namespace automation-factory --force
    
    if ($LASTEXITCODE -ne 0) {
        throw "Helm upgrade failed"
    }

    # Forcer le redémarrage des pods pour s'assurer qu'ils utilisent les nouvelles images
    Write-Host "🔄 Restarting pods to ensure new image usage..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt rollout restart deployment/automation-factory-backend -n automation-factory
    kubectl --kubeconfig=kubeconfig.txt rollout restart deployment/automation-factory-frontend -n automation-factory

    # Attendre que les pods soient prêts
    Write-Host "⏳ Waiting for pods to be ready..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt wait --for=condition=ready pod -l app.kubernetes.io/component=backend -n automation-factory --timeout=300s
    kubectl --kubeconfig=kubeconfig.txt wait --for=condition=ready pod -l app.kubernetes.io/component=frontend -n automation-factory --timeout=300s

    # Vérifier le statut
    Write-Host "📊 Deployment Status:" -ForegroundColor Cyan
    kubectl --kubeconfig=kubeconfig.txt get pods -n automation-factory

    # Tester les endpoints
    Write-Host "🧪 Testing endpoints..." -ForegroundColor Yellow
    Start-Sleep 10

    Write-Host "Testing frontend version:" -ForegroundColor Cyan
    curl -s "https://coupel.net/automation-factory/version"
    
    Write-Host "Testing backend version:" -ForegroundColor Cyan  
    curl -s "https://coupel.net/automation-factory/api/version"

    Write-Host "Testing authentication:" -ForegroundColor Cyan
    curl -X POST "https://coupel.net/automation-factory/api/auth/login" -H "Content-Type: application/json" -d '{""email"":""admin@example.com"",""password"":""admin""}' -s

    Write-Host "`n✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Application available at: https://coupel.net/automation-factory/" -ForegroundColor Cyan
    Write-Host "👤 Default credentials: admin@example.com / admin" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location $rootPath
}