# Commande /dev-backend - Implémentation Backend

$ARGUMENTS

## Instructions
Lance directement l'agent `dev-backend` :

```
Agent: dev-backend
Subagent-type: dev-backend
Prompt: "Implémente la partie backend pour : $ARGUMENTS
Inclure les tests. Valider avec : cd backend && python -m pytest tests/ -v --cov=app && python -m ruff check ."
```

Afficher le résultat retourné par l'agent à l'utilisateur.
