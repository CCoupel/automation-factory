# Commande /infra - Infrastructure

$ARGUMENTS

> **Prérequis** : la team `Team-AF` doit être démarrée (`/start-session`)

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. SendMessage au CDP : "INFRA REQUEST : $ARGUMENTS"
3. Relaie le rapport infra retourné par le CDP à l'utilisateur

## Usage
Utiliser pour déclencher directement des changements d'infrastructure :
- Modification Helm chart (nouveau service, env var, probe)
- Mise à jour `docker-compose.staging.yml` (structure)
- Optimisation Dockerfile
- Ajout ConfigMap, Secret, Ingress K8s
