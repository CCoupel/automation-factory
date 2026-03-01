# Commande /hotfix - Correction Urgente Production

$ARGUMENTS

> **Prérequis** : la team `Team-AF` doit être démarrée (`/start-session`)

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. SendMessage au CDP : "HOTFIX: $ARGUMENTS"
3. Relaie les retours CDP à l'utilisateur
4. Demande validation aux points de contrôle signalés par le CDP

## Points de contrôle obligatoires
- Hotfix = bypass Phase 2 possible si urgence critique, mais validation utilisateur OBLIGATOIRE
- Confirmation déploiement production : attendre "go" explicite utilisateur
