# Commande /doc - Mise à Jour Documentation

$ARGUMENTS

## Instructions
Lance directement l'agent `doc-updater` :

```
Agent: doc-updater
Subagent-type: doc-updater
Prompt: "Mets à jour la documentation pour : $ARGUMENTS
Fichiers à vérifier : WORK_IN_PROGRESS.md, DONE.md, BACKLOG.md, CHANGELOG.md.
Si architecture modifiée : ARCHITECTURE_DECISIONS.md, BACKEND_SPECS.md, FRONTEND_SPECS.md.
Si version changée : backend/app/version.py, frontend/package.json, docker-compose.staging.yml.
Confirmer la liste des fichiers mis à jour."
```

Afficher le rapport de mise à jour à l'utilisateur.
