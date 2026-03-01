# Commande /test-write - Écriture des Tests

$ARGUMENTS

> **Prérequis** : la team `Team-AF` doit être démarrée (`/start-session`)

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. SendMessage au CDP : "TEST WRITE REQUEST : $ARGUMENTS"
3. Relaie le rapport de couverture retourné par le CDP à l'utilisateur
