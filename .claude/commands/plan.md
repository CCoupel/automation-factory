# Commande /plan - Plan d'Implémentation

$ARGUMENTS

## Instructions
Lance directement l'agent `planner` (hors team si non démarrée) :

```
Agent: planner
Subagent-type: planner
Prompt: "Produis un plan d'implémentation détaillé pour : $ARGUMENTS
Inclure : résumé, impact versioning, fichiers impactés, fichiers à créer, tests à écrire, ordre d'implémentation, risques."
```

Afficher le plan retourné par l'agent à l'utilisateur.
