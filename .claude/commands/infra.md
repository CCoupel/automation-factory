# Commande /infra - Infrastructure

$ARGUMENTS

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. Si la team `Team-AF` n'est pas active : `TeamCreate` `Team-AF` + spawner `cdp` (`"Lis .claude/agents/cdp.md et applique ces instructions. Spawn les agents nécessaires selon la demande entrante."`)
3. SendMessage au CDP : "INFRA REQUEST : $ARGUMENTS"
4. Relaie le rapport infra retourné par le CDP à l'utilisateur

## Usage
Utiliser pour déclencher directement des changements d'infrastructure :
- Modification Helm chart (nouveau service, env var, probe)
- Mise à jour `docker-compose.staging.yml` (structure)
- Optimisation Dockerfile
- Ajout ConfigMap, Secret, Ingress K8s
