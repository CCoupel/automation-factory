# Commande /end-session - Fin de Session

$ARGUMENTS

## Instructions

Sans demander confirmation, exécuter dans l'ordre :

### Étape 1 — Archivage documentation
SendMessage à `doc-updater` :
"FIN DE SESSION : Mets à jour WORK_IN_PROGRESS.md pour refléter l'état final. Archive tout travail terminé dans DONE.md. Confirme quand c'est fait."

Attendre la confirmation de `doc-updater`.

### Étape 2 — Mise à jour MEMORY
Mettre à jour `.claude/memory/MEMORY.md` avec :
- L'état final de la session (travail accompli, version courante)
- Les décisions importantes prises
- Les points en suspens pour la prochaine session

### Étape 3 — Merge vers main (si travail livré en Phase 3)
- Vérifier que la branche courante est propre (`git status`)
- Informer l'utilisateur et attendre sa confirmation
- Après confirmation : merge vers `main`

### Étape 4 — Shutdown de la team
SendMessage type `shutdown_request` à chaque agent dans l'ordre :
1. `infra`
2. `deployer`
3. `qa`
4. `doc-updater`
5. `code-reviewer`
6. `test-writer`
7. `dev-frontend`
8. `dev-backend`
9. `planner`
10. `cdp` (en dernier)

Attendre les confirmations de shutdown avant TeamDelete.

### Étape 5 — Nettoyage
TeamDelete pour supprimer la team `Team-AF`.

Confirmer à l'utilisateur : "Session terminée. MEMORY mise à jour. Team dissoute."
