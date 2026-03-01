# Commande /review - Audit Périodique

$ARGUMENTS

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. Si la team `Team-AF` n'est pas active : `TeamCreate` `Team-AF` + spawner `cdp` (`"Lis .claude/agents/cdp.md et applique ces instructions. Spawn les agents nécessaires selon la demande entrante."`)
3. SendMessage au CDP : "PERIODIC REVIEW REQUEST : $ARGUMENTS (périmètre : tout le code modifié depuis le dernier merge si non précisé)"
4. Relaie le rapport priorisé (CRITIQUE / MAJEUR / MINEUR) à l'utilisateur
