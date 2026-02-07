# Script pour deployer Backend v1.8.1_2 + Frontend v1.14.0-dev1
param(
    [string]$BackendVersion = "1.8.1_2",
    [string]$FrontendVersion = "1.14.0-dev1"
)

$ErrorActionPreference = "Stop"

try {
    Write-Host "Deploying Backend v$BackendVersion + Frontend v$FrontendVersion with GalaxyContext..." -ForegroundColor Green
    
    $rootPath = "C:\Users\cyril\Documents\VScode\Automation Factory"
    Set-Location $rootPath
    
    Write-Host "Working directory: $(Get-Location)" -ForegroundColor Cyan

    # Vérifier que kubeconfig.txt existe
    if (!(Test-Path "kubeconfig.txt")) {
        Write-Host "Error: kubeconfig.txt not found!" -ForegroundColor Red
        exit 1
    }

    # Vérifier custom-values.yaml
    Write-Host "Checking custom-values.yaml..." -ForegroundColor Yellow
    $content = Get-Content "custom-values.yaml" -Raw
    Write-Host "Backend tag: $(($content | Select-String 'tag:\s*\"(.*)\"' -AllMatches).Matches[0].Groups[1].Value)"
    Write-Host "Frontend tag: $(($content | Select-String 'tag:\s*\"(.*)\"' -AllMatches).Matches[1].Groups[1].Value)"

    # Deployer avec Helm
    Write-Host "Deploying with Helm..." -ForegroundColor Yellow
    helm --kubeconfig=kubeconfig.txt upgrade automation-factory ./helm/automation-factory -f custom-values.yaml --namespace automation-factory --force

    # Redemarrer les pods backend et frontend
    Write-Host "Restarting backend pods..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt rollout restart deployment/automation-factory-backend -n automation-factory

    Write-Host "Restarting frontend pods..." -ForegroundColor Yellow  
    kubectl --kubeconfig=kubeconfig.txt rollout restart deployment/automation-factory-frontend -n automation-factory

    # Attendre que les pods soient prêts
    Write-Host "Waiting for backend pods..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt wait --for=condition=ready pod -l app.kubernetes.io/component=backend -n automation-factory --timeout=300s

    Write-Host "Waiting for frontend pods..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt wait --for=condition=ready pod -l app.kubernetes.io/component=frontend -n automation-factory --timeout=300s

    # Status final
    Write-Host "Deployment completed!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Pod Status:" -ForegroundColor Cyan
    kubectl --kubeconfig=kubeconfig.txt get pods -n automation-factory
    
    Write-Host ""
    Write-Host "Services:" -ForegroundColor Cyan
    kubectl --kubeconfig=kubeconfig.txt get services -n automation-factory

    Write-Host ""
    Write-Host "Application URLs:" -ForegroundColor Green
    Write-Host "  - Web App: https://coupel.net/automation-factory" 
    Write-Host "  - API Health: https://coupel.net/automation-factory/api/version"
    Write-Host ""
    Write-Host "New Feature: Galaxy namespace discovery starts automatically on page load!" -ForegroundColor Yellow

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Checking pod status for debugging..." -ForegroundColor Yellow
    kubectl --kubeconfig=kubeconfig.txt get pods -n automation-factory
    kubectl --kubeconfig=kubeconfig.txt describe pods -l app.kubernetes.io/name=automation-factory -n automation-factory
    exit 1
}