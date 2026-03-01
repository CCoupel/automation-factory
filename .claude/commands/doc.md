# Commande /doc - Mise à Jour Documentation

$ARGUMENTS

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. Si la team `Team-AF` n'est pas active : `TeamCreate` `Team-AF` + spawner `cdp` (`"Lis .claude/agents/cdp.md et applique ces instructions. Spawn les agents nécessaires selon la demande entrante."`)
3. SendMessage au CDP : "DOC UPDATE REQUEST : $ARGUMENTS"
4. Relaie la liste des fichiers mis à jour retournée par le CDP à l'utilisateur
