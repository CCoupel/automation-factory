# Commande /deploy - Déploiement

$ARGUMENTS

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. Si la team `Team-AF` n'est pas active : `TeamCreate` `Team-AF` + spawner `cdp` (`"Lis .claude/agents/cdp.md et applique ces instructions. Spawn les agents nécessaires selon la demande entrante."`)
3. Si Phase 3 : demander confirmation explicite à l'utilisateur avant de continuer
4. SendMessage au CDP : "DEPLOY REQUEST : $ARGUMENTS (Phase 2 staging ou Phase 3 production)"
5. Relaie le rapport de déploiement retourné par le CDP à l'utilisateur
