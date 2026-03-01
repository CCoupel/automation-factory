# Commande /dev - Implémentation Backend + Frontend

$ARGUMENTS

## Instructions
Lance les deux agents de développement en parallèle :

```
Agent 1: dev-backend
Subagent-type: dev-backend
Prompt: "Implémente la partie backend pour : $ARGUMENTS
Inclure les tests. Valider avec pytest et ruff."

Agent 2: dev-frontend
Subagent-type: dev-frontend
Prompt: "Implémente la partie frontend pour : $ARGUMENTS
Inclure les tests et les clés i18n EN + FR. Valider avec npm test, lint, tsc."
```

Attendre les deux agents et synthétiser leurs résultats à l'utilisateur.
