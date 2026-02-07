# Script de déploiement Automation Factory sur Kubernetes
# Usage: .\deploy.ps1 [-Namespace <namespace>] [-Release <release-name>]

param(
    [string]$Namespace = "automation-factory",
    [string]$Release = "automation-factory",
    [switch]$DryRun
)

# Configuration
$KUBECONFIG_FILE = "kubeconfig.txt"

# Colors
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Host $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "=== Déploiement Automation Factory ==="

# Vérifier que kubeconfig existe
if (-not (Test-Path $KUBECONFIG_FILE)) {
    Write-ColorOutput Red "Fichier $KUBECONFIG_FILE non trouvé!"
    exit 1
}

# Exporter KUBECONFIG
$env:KUBECONFIG = (Get-Item $KUBECONFIG_FILE).FullName
Write-ColorOutput Yellow "Utilisation du kubeconfig: $env:KUBECONFIG"

# Vérifier la connexion au cluster
Write-ColorOutput Yellow "Vérification de la connexion au cluster..."
kubectl cluster-info
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "Impossible de se connecter au cluster Kubernetes!"
    exit 1
}

# Créer le namespace si nécessaire
Write-ColorOutput Yellow "Création du namespace $Namespace (si nécessaire)..."
kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -

# Vérifier si des valeurs personnalisées existent
$customValues = ""
if (Test-Path "custom-values.yaml") {
    $customValues = "-f custom-values.yaml"
    Write-ColorOutput Yellow "Utilisation des valeurs personnalisées: custom-values.yaml"
}

# Préparer la commande Helm
$helmCmd = "helm upgrade --install $Release ./helm/automation-factory/ --namespace $Namespace $customValues"

if ($DryRun) {
    $helmCmd += " --dry-run --debug"
    Write-ColorOutput Yellow "Mode DRY RUN activé - aucune modification ne sera effectuée"
}

# Afficher la commande
Write-ColorOutput Cyan "Exécution: $helmCmd"

# Exécuter le déploiement
Invoke-Expression $helmCmd

if ($LASTEXITCODE -eq 0 -and -not $DryRun) {
    Write-ColorOutput Green "✅ Déploiement réussi!"
    Write-Host ""
    
    # Attendre que les pods soient prêts
    Write-ColorOutput Yellow "Attente du démarrage des pods..."
    Start-Sleep -Seconds 5
    
    # Afficher le statut
    Write-ColorOutput Yellow "=== Statut du déploiement ==="
    kubectl get pods -n $Namespace -l app.kubernetes.io/instance=$Release
    Write-Host ""
    
    Write-ColorOutput Yellow "=== Services ==="
    kubectl get svc -n $Namespace -l app.kubernetes.io/instance=$Release
    Write-Host ""
    
    Write-ColorOutput Yellow "=== Ingress ==="
    kubectl get ingress -n $Namespace
    Write-Host ""
    
    # Instructions post-déploiement
    Write-ColorOutput Green "=== Instructions ==="
    Write-Host "Pour suivre les logs:"
    Write-Host "  Backend:  kubectl logs -n $Namespace -l app.kubernetes.io/name=automation-factory-backend -f"
    Write-Host "  Frontend: kubectl logs -n $Namespace -l app.kubernetes.io/name=automation-factory-frontend -f"
    Write-Host ""
    Write-Host "Pour obtenir l'URL d'accès:"
    Write-Host "  kubectl get ingress -n $Namespace"
} elseif ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ Le déploiement a échoué!"
    exit 1
}