# Commande /code-review - Revue de Code

$ARGUMENTS

> **Prérequis** : la team `Team-AF` doit être démarrée (`/start-session`)

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. SendMessage au CDP : "CODE REVIEW REQUEST : $ARGUMENTS"
3. Relaie le rapport de revue (APPROUVÉ / APPROUVÉ AVEC RÉSERVES / REFUSÉ) à l'utilisateur
