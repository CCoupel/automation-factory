# Commande /doc - Mise à Jour Documentation

$ARGUMENTS

> **Prérequis** : la team `Team-AF` doit être démarrée (`/start-session`)

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. SendMessage au CDP : "DOC UPDATE REQUEST : $ARGUMENTS"
3. Relaie la liste des fichiers mis à jour retournée par le CDP à l'utilisateur
