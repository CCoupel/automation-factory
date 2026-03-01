# Commande /code-review - Revue de Code

$ARGUMENTS

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. Si la team `Team-AF` n'est pas active : `TeamCreate` `Team-AF` + spawner `cdp` (`"Lis .claude/agents/cdp.md et applique ces instructions. Spawn les agents nécessaires selon la demande entrante."`)
3. SendMessage au CDP : "CODE REVIEW REQUEST : $ARGUMENTS"
4. Relaie le rapport de revue (APPROUVÉ / APPROUVÉ AVEC RÉSERVES / REFUSÉ) à l'utilisateur
