#!/bin/bash

# Ansible Builder - Script principal d'orchestration
# Usage: ./ansible-builder.sh <command> [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

function show_help() {
    echo -e "${GREEN}🚀 Ansible Builder - Script d'orchestration

COMMANDES DISPONIBLES:
  publish <version>     Publier les images Docker et package Helm
  deploy               Déployer sur Kubernetes  
  full <version>       Publication + Déploiement complet
  clean                Nettoyer le déploiement existant
  status               Afficher le statut du déploiement
  debug                Diagnostic approfondi des problèmes
  test                 Tester les endpoints API
  help                 Afficher cette aide

EXEMPLES:
  ./ansible-builder.sh publish 1.3.0
  ./ansible-builder.sh deploy --namespace ansible-builder-dev
  ./ansible-builder.sh full 1.3.0 --dry-run
  ./ansible-builder.sh clean
  ./ansible-builder.sh status
  ./ansible-builder.sh debug
  ./ansible-builder.sh test

OPTIONS:
  --version <version>   Version à publier/déployer
  --namespace <name>    Namespace Kubernetes (défaut: ansible-builder)
  --dry-run            Mode simulation
  --skip-publish       Déployer sans publier (pour 'full')

DOCUMENTATION COMPLÈTE:
  Voir TOOLING/README.md${NC}"
}

function invoke_command() {
    local script_name="$1"
    shift
    local script_path="$SCRIPT_DIR/$script_name"
    
    if [[ ! -f "$script_path" ]]; then
        echo -e "${RED}❌ Script non trouvé: $script_path${NC}"
        exit 1
    fi
    
    echo -e "${CYAN}🔧 Exécution: $script_name $*${NC}"
    chmod +x "$script_path"
    "$script_path" "$@"
}

# Parse arguments
COMMAND=""
VERSION=""
NAMESPACE="ansible-builder"
DRY_RUN=""
SKIP_PUBLISH=""

while [[ $# -gt 0 ]]; do
    case $1 in
        publish|deploy|full|clean|status|debug|test|help)
            COMMAND="$1"
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="--dry-run"
            shift
            ;;
        --skip-publish)
            SKIP_PUBLISH="--skip-publish"
            shift
            ;;
        *)
            if [[ -z "$VERSION" && "$COMMAND" == "publish" || "$COMMAND" == "full" ]]; then
                VERSION="$1"
                shift
            else
                echo -e "${RED}❌ Option inconnue: $1${NC}"
                show_help
                exit 1
            fi
            ;;
    esac
done

if [[ -z "$COMMAND" ]]; then
    echo -e "${RED}❌ Commande requise${NC}"
    show_help
    exit 1
fi

# Routing des commandes
case "$COMMAND" in
    "publish")
        if [[ -z "$VERSION" ]]; then
            echo -e "${RED}❌ Version requise pour publish${NC}"
            echo -e "${YELLOW}Usage: ./ansible-builder.sh publish <version>${NC}"
            exit 1
        fi
        invoke_command "publish.sh" "$VERSION"
        ;;
    
    "deploy")
        args=()
        if [[ "$NAMESPACE" != "ansible-builder" ]]; then
            args+=("--namespace" "$NAMESPACE")
        fi
        if [[ -n "$DRY_RUN" ]]; then
            args+=("$DRY_RUN")
        fi
        
        invoke_command "deploy.sh" "${args[@]}"
        ;;
    
    "full")
        if [[ -z "$VERSION" ]]; then
            echo -e "${RED}❌ Version requise pour full${NC}"
            echo -e "${YELLOW}Usage: ./ansible-builder.sh full <version>${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}⚠️ Fonction 'full' pas encore implémentée en bash${NC}"
        echo -e "${CYAN}Utilisez: ./publish.sh $VERSION && ./deploy.sh${NC}"
        ;;
    
    "clean")
        echo -e "${YELLOW}⚠️ Nettoyage du déploiement - Êtes-vous sûr ? [y/N]${NC}"
        read -r confirmation
        if [[ "$confirmation" == "y" || "$confirmation" == "Y" ]]; then
            echo -e "${YELLOW}⚠️ Script clean.ps1 requis - utilisez PowerShell${NC}"
        else
            echo -e "${RED}❌ Opération annulée${NC}"
        fi
        ;;
    
    "status"|"debug"|"test")
        echo -e "${YELLOW}⚠️ Script $COMMAND.ps1 requis - utilisez PowerShell${NC}"
        ;;
    
    "help")
        show_help
        ;;
    
    *)
        echo -e "${RED}❌ Commande inconnue: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac

echo -e "\n${GREEN}✅ Commande '$COMMAND' terminée.${NC}"