# Commande /review - Revue Périodique

$ARGUMENTS

## Instructions
Lance une revue périodique complète de la codebase via `code-reviewer` :

```
Agent: code-reviewer
Subagent-type: code-reviewer
Prompt: "Effectue une revue périodique de la codebase Automation Factory.
Périmètre : $ARGUMENTS (ou tout le code modifié depuis le dernier merge si non précisé).
Focus : dette technique, violations des règles du projet, sécurité, couverture de tests.
Produire un rapport priorisé : CRITIQUE / MAJEUR / MINEUR."
```

Afficher le rapport complet à l'utilisateur avec recommandations priorisées.
