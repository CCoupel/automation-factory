# Commande /qa - Exécution Tests + Rapport Qualité

$ARGUMENTS

## Instructions
Lance directement l'agent `qa` :

```
Agent: qa
Subagent-type: qa
Prompt: "Exécute les validations QA pour la phase : $ARGUMENTS (Phase 1, 2 ou 3).
Phase 1 : tests unitaires, API :8000, frontend :5173, versions.
Phase 2 : health checks 192.168.1.217, E2E, performances, version RC.
Phase 3 : smoke tests production coupel.net/automation-factory, monitoring 30min.
Retourner : GO / NO-GO avec détail des checks."
```

Afficher le rapport QA à l'utilisateur.
