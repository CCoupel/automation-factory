# Commande /code-review - Revue de Code

$ARGUMENTS

## Instructions
Lance directement l'agent `code-reviewer` :

```
Agent: code-reviewer
Subagent-type: code-reviewer
Prompt: "Effectue une revue de code pour : $ARGUMENTS
Appliquer la checklist complète (qualité, backend, frontend, sécurité).
Retourner : APPROUVÉ / APPROUVÉ AVEC RÉSERVES / REFUSÉ + liste des points."
```

Afficher le rapport de revue à l'utilisateur.
