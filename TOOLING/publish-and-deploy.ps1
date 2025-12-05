# Script complet de publication et déploiement Ansible Builder
# Usage: .\publish-and-deploy.ps1 [version] [-Deploy] [-Namespace <namespace>]

param(
    [string]$Version,
    [switch]$Deploy,
    [string]$Namespace = "ansible-builder",
    [switch]$SkipPublish,
    [switch]$DryRun
)

# Configuration
$REGISTRY = "ghcr.io"
$NAMESPACE_REGISTRY = "ccoupel"
$GITHUB_USER = "ccoupel"
$KUBECONFIG_FILE = "kubeconfig.txt"

# Colors
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Host $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "=== Ansible Builder - Publication et Déploiement ==="

# Get version
if (-not $Version) {
    Write-ColorOutput Yellow "Version actuelle dans Chart.yaml:"
    Get-Content helm/ansible-builder/Chart.yaml | Select-String "^version:"
    Write-Host ""
    $Version = Read-Host "Nouvelle version"
}

if (-not $Version) {
    Write-ColorOutput Red "Version requise!"
    exit 1
}

# ÉTAPE 1: PUBLICATION
if (-not $SkipPublish) {
    Write-ColorOutput Green "=== ÉTAPE 1: Publication de la version $Version ==="
    
    # Read GitHub token
    if (Test-Path "github_token.txt") {
        $tokenLine = Get-Content "github_token.txt" | Select-String "token:"
        $GITHUB_TOKEN = $tokenLine -replace "token:\s*", ""
    } else {
        Write-ColorOutput Red "Fichier github_token.txt non trouvé!"
        exit 1
    }
    
    # Login to registry
    Write-ColorOutput Yellow "Connexion au registry GitHub..."
    $GITHUB_TOKEN | docker login $REGISTRY -u $GITHUB_USER --password-stdin
    
    if (-not $DryRun) {
        # Build and push backend
        Write-ColorOutput Yellow "Construction de l'image backend..."
        docker build -t "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-backend:$Version" ./backend/
        docker tag "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-backend:$Version" "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-backend:latest"
        
        Write-ColorOutput Yellow "Push de l'image backend..."
        docker push "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-backend:$Version"
        docker push "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-backend:latest"
        
        # Build and push frontend
        Write-ColorOutput Yellow "Construction de l'image frontend..."
        docker build -t "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-frontend:$Version" ./frontend/
        docker tag "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-frontend:$Version" "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-frontend:latest"
        
        Write-ColorOutput Yellow "Push de l'image frontend..."
        docker push "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-frontend:$Version"
        docker push "$REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-frontend:latest"
    } else {
        Write-ColorOutput Yellow "DRY RUN: Skip build et push des images"
    }
    
    # Update Helm files
    Write-ColorOutput Yellow "Mise à jour des versions Helm..."
    $chartContent = Get-Content helm/ansible-builder/Chart.yaml
    $chartContent = $chartContent -replace "^version:.*", "version: $Version"
    $chartContent = $chartContent -replace "^appVersion:.*", "appVersion: `"$Version`""
    $chartContent | Set-Content helm/ansible-builder/Chart.yaml
    
    $valuesContent = Get-Content helm/ansible-builder/values.yaml
    $valuesContent = $valuesContent -replace 'tag: ".*"', "tag: `"$Version`""
    $valuesContent | Set-Content helm/ansible-builder/values.yaml
    
    # Package Helm chart
    if (-not (Test-Path "helm/packages")) {
        New-Item -ItemType Directory -Path "helm/packages"
    }
    
    Write-ColorOutput Yellow "Packaging du chart Helm..."
    helm package helm/ansible-builder/ -d helm/packages/
    
    Write-ColorOutput Green "✅ Publication terminée!"
}

# ÉTAPE 2: DÉPLOIEMENT
if ($Deploy) {
    Write-Host ""
    Write-ColorOutput Green "=== ÉTAPE 2: Déploiement sur Kubernetes ==="
    
    # Vérifier kubeconfig
    if (-not (Test-Path $KUBECONFIG_FILE)) {
        Write-ColorOutput Red "Fichier $KUBECONFIG_FILE non trouvé!"
        Write-ColorOutput Yellow "Le déploiement nécessite un fichier kubeconfig.txt"
        exit 1
    }
    
    # Configurer kubeconfig
    $env:KUBECONFIG = (Get-Item $KUBECONFIG_FILE).FullName
    Write-ColorOutput Yellow "Utilisation du kubeconfig: $env:KUBECONFIG"
    
    # Vérifier connexion
    Write-ColorOutput Yellow "Vérification de la connexion au cluster..."
    kubectl cluster-info
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "Impossible de se connecter au cluster!"
        exit 1
    }
    
    # Créer namespace
    Write-ColorOutput Yellow "Création du namespace $Namespace (si nécessaire)..."
    kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
    
    # Helm upgrade
    $customValues = ""
    if (Test-Path "custom-values.yaml") {
        $customValues = "-f custom-values.yaml"
        Write-ColorOutput Yellow "Utilisation des valeurs personnalisées"
    }
    
    $helmCmd = "helm upgrade --install ansible-builder ./helm/ansible-builder/ --namespace $Namespace $customValues"
    if ($DryRun) {
        $helmCmd += " --dry-run --debug"
    }
    
    Write-ColorOutput Cyan "Exécution: $helmCmd"
    Invoke-Expression $helmCmd
    
    if ($LASTEXITCODE -eq 0 -and -not $DryRun) {
        Write-ColorOutput Green "✅ Déploiement réussi!"
        
        Start-Sleep -Seconds 5
        Write-ColorOutput Yellow "=== Statut du déploiement ==="
        kubectl get pods -n $Namespace
        Write-Host ""
        kubectl get ingress -n $Namespace
    }
}

# RÉSUMÉ
Write-Host ""
Write-ColorOutput Green "=== Résumé ==="
if (-not $SkipPublish) {
    Write-Host "Version publiée: $Version"
    Write-Host "Images:"
    Write-Host "  - $REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-backend:$Version"
    Write-Host "  - $REGISTRY/$NAMESPACE_REGISTRY/ansible-builder-frontend:$Version"
}
if ($Deploy) {
    Write-Host "Déployé dans le namespace: $Namespace"
}

Write-Host ""
Write-ColorOutput Yellow "Prochaines étapes:"
Write-Host "1. Commit: git add -A && git commit -m `"chore: release v$Version`""
Write-Host "2. Tag: git tag v$Version"
Write-Host "3. Push: git push && git push --tags"

if (-not $Deploy) {
    Write-Host ""
    Write-Host "Pour déployer:"
    Write-Host "  .\deploy.ps1"
    Write-Host "ou"
    Write-Host "  .\publish-and-deploy.ps1 -Deploy"
}