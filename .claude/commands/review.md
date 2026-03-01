# Commande /review - Audit Périodique

$ARGUMENTS

> **Prérequis** : la team `Team-AF` doit être démarrée (`/start-session`)

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. SendMessage au CDP : "PERIODIC REVIEW REQUEST : $ARGUMENTS (périmètre : tout le code modifié depuis le dernier merge si non précisé)"
3. Relaie le rapport priorisé (CRITIQUE / MAJEUR / MINEUR) à l'utilisateur
