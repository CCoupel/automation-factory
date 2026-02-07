#!/bin/bash

# Script de déploiement Automation Factory sur Kubernetes
# Usage: ./deploy.sh [-n namespace] [-r release-name] [--dry-run]

set -e

# Configuration par défaut
NAMESPACE="automation-factory"
RELEASE="automation-factory"
KUBECONFIG_FILE="kubeconfig.txt"
DRY_RUN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="--dry-run --debug"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [-n namespace] [-r release-name] [--dry-run]"
            echo "  -n, --namespace    Namespace Kubernetes (default: automation-factory)"
            echo "  -r, --release      Nom de la release Helm (default: automation-factory)"
            echo "  --dry-run          Mode simulation, aucune modification"
            exit 0
            ;;
        *)
            echo -e "${RED}Option inconnue: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}=== Déploiement Automation Factory ===${NC}"

# Vérifier que kubeconfig existe
if [ ! -f "$KUBECONFIG_FILE" ]; then
    echo -e "${RED}Fichier $KUBECONFIG_FILE non trouvé!${NC}"
    exit 1
fi

# Exporter KUBECONFIG
export KUBECONFIG="$(pwd)/$KUBECONFIG_FILE"
echo -e "${YELLOW}Utilisation du kubeconfig: $KUBECONFIG${NC}"

# Vérifier la connexion au cluster
echo -e "${YELLOW}Vérification de la connexion au cluster...${NC}"
kubectl cluster-info
if [ $? -ne 0 ]; then
    echo -e "${RED}Impossible de se connecter au cluster Kubernetes!${NC}"
    exit 1
fi

# Créer le namespace si nécessaire
echo -e "${YELLOW}Création du namespace $NAMESPACE (si nécessaire)...${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Vérifier si des valeurs personnalisées existent
CUSTOM_VALUES=""
if [ -f "custom-values.yaml" ]; then
    CUSTOM_VALUES="-f custom-values.yaml"
    echo -e "${YELLOW}Utilisation des valeurs personnalisées: custom-values.yaml${NC}"
fi

# Préparer la commande Helm
HELM_CMD="helm upgrade --install $RELEASE ./helm/automation-factory/ --namespace $NAMESPACE $CUSTOM_VALUES $DRY_RUN"

if [ -n "$DRY_RUN" ]; then
    echo -e "${YELLOW}Mode DRY RUN activé - aucune modification ne sera effectuée${NC}"
fi

# Afficher la commande
echo -e "${CYAN}Exécution: $HELM_CMD${NC}"

# Exécuter le déploiement
eval $HELM_CMD

if [ $? -eq 0 ] && [ -z "$DRY_RUN" ]; then
    echo -e "${GREEN}✅ Déploiement réussi!${NC}"
    echo ""
    
    # Attendre que les pods soient prêts
    echo -e "${YELLOW}Attente du démarrage des pods...${NC}"
    sleep 5
    
    # Afficher le statut
    echo -e "${YELLOW}=== Statut du déploiement ===${NC}"
    kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE
    echo ""
    
    echo -e "${YELLOW}=== Services ===${NC}"
    kubectl get svc -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE
    echo ""
    
    echo -e "${YELLOW}=== Ingress ===${NC}"
    kubectl get ingress -n $NAMESPACE
    echo ""
    
    # Instructions post-déploiement
    echo -e "${GREEN}=== Instructions ===${NC}"
    echo "Pour suivre les logs:"
    echo "  Backend:  kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=automation-factory-backend -f"
    echo "  Frontend: kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=automation-factory-frontend -f"
    echo ""
    echo "Pour obtenir l'URL d'accès:"
    echo "  kubectl get ingress -n $NAMESPACE"
elif [ $? -ne 0 ]; then
    echo -e "${RED}❌ Le déploiement a échoué!${NC}"
    exit 1
fi