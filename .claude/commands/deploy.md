# Commande /deploy - Déploiement

$ARGUMENTS

## Instructions
Lance directement l'agent `deployer` :

```
Agent: deployer
Subagent-type: deployer
Prompt: "Exécute le déploiement : $ARGUMENTS
Préciser la phase (Phase 2 staging ou Phase 3 production) et la version cible.
Phase 2 : build images sur 192.168.1.217, docker-compose up, health checks.
Phase 3 : retag staging→prod, push ghcr.io, helm upgrade EXCLUSIVEMENT.
JAMAIS kubectl set image. JAMAIS rebuild en Phase 3."
```

Afficher le rapport de déploiement à l'utilisateur.

## Point de contrôle obligatoire
Demander confirmation explicite de l'utilisateur avant tout déploiement production (Phase 3).
