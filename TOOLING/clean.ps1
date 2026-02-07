# Script de nettoyage
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

Write-Host "Suppression de l'installation Helm existante..."
helm uninstall automation-factory -n automation-factory

Write-Host "Suppression des ressources restantes..."
kubectl delete all -l app.kubernetes.io/instance=automation-factory -n automation-factory

Write-Host "Nettoyage terminé."