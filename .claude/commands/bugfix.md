# Commande /bugfix - Correction de Bug

$ARGUMENTS

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. Si la team `Team-AF` n'est pas active : `TeamCreate` `Team-AF` + spawner `cdp` (`"Lis .claude/agents/cdp.md et applique ces instructions. Spawn les agents nécessaires selon la demande entrante."`)
3. SendMessage au CDP : "BUGFIX: $ARGUMENTS"
4. Relaie les retours CDP à l'utilisateur
5. Demande validation aux points de contrôle signalés par le CDP

## Points de contrôle obligatoires
- Gate Phase 1 → Phase 2 : attendre "go" explicite utilisateur
- Gate Phase 2 → Phase 3 : attendre "go" explicite utilisateur
