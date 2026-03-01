# Commande /hotfix - Correction Urgente Production

$ARGUMENTS

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. Si la team `Team-AF` n'est pas active : `TeamCreate` `Team-AF` + spawner `cdp` (`"Lis .claude/agents/cdp.md et applique ces instructions. Spawn les agents nécessaires selon la demande entrante."`)
3. SendMessage au CDP : "HOTFIX: $ARGUMENTS"
4. Relaie les retours CDP à l'utilisateur
5. Demande validation aux points de contrôle signalés par le CDP

## Points de contrôle obligatoires
- Hotfix = bypass Phase 2 possible si urgence critique, mais validation utilisateur OBLIGATOIRE
- Confirmation déploiement production : attendre "go" explicite utilisateur
