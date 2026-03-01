# Commande /qa - Validation Qualité

$ARGUMENTS

> **Prérequis** : la team `Team-AF` doit être démarrée (`/start-session`)

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. SendMessage au CDP : "QA REQUEST : $ARGUMENTS (préciser Phase 1, 2 ou 3)"
3. Relaie le rapport GO / NO-GO retourné par le CDP à l'utilisateur
