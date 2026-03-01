# Commande /bugfix - Correction de Bug

$ARGUMENTS

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. SendMessage au CDP : "BUGFIX: $ARGUMENTS"
3. Relaie les retours CDP à l'utilisateur
4. Demande validation aux points de contrôle signalés par le CDP

## Points de contrôle obligatoires
- Gate Phase 1 → Phase 2 : attendre "go" explicite utilisateur
- Gate Phase 2 → Phase 3 : attendre "go" explicite utilisateur
