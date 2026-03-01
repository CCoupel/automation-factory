# Commande /dev-frontend - Implémentation Frontend

$ARGUMENTS

## Instructions
Lance directement l'agent `dev-frontend` :

```
Agent: dev-frontend
Subagent-type: dev-frontend
Prompt: "Implémente la partie frontend pour : $ARGUMENTS
Inclure les tests et les clés i18n EN + FR. Valider avec : cd frontend && npm test && npm run lint && npx tsc --noEmit"
```

Afficher le résultat retourné par l'agent à l'utilisateur.
