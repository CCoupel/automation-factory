# Script de nettoyage
$env:KUBECONFIG = (Get-Item "kubeconfig.txt").FullName

Write-Host "Suppression de l'installation Helm existante..."
helm uninstall ansible-builder -n ansible-builder

Write-Host "Suppression des ressources restantes..."
kubectl delete all -l app.kubernetes.io/instance=ansible-builder -n ansible-builder

Write-Host "Nettoyage terminé."