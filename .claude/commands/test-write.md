# Commande /test-write - Écriture des Tests

$ARGUMENTS

## Instructions
Lance directement l'agent `test-writer` :

```
Agent: test-writer
Subagent-type: test-writer
Prompt: "Écris les tests pour : $ARGUMENTS
Backend : pytest avec SQLite in-memory via conftest.py (succès + erreur + auth).
Frontend : Vitest + React Testing Library, mock httpClient via vi.mock().
Ne pas diminuer la couverture existante (backend ~47%, frontend ~24%)."
```

Afficher le rapport de couverture retourné par l'agent à l'utilisateur.
