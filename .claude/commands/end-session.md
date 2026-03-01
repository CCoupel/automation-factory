# Commande /end-session - Fin de Session

$ARGUMENTS

## Instructions

Sans demander confirmation, exécuter dans l'ordre :

### Étape 1 — Archivage documentation
SendMessage à `doc-updater` :
"FIN DE SESSION : Mets à jour WORK_IN_PROGRESS.md pour refléter l'état final de la session. Archive tout travail terminé dans DONE.md. Confirme quand c'est fait."

Attendre la confirmation de `doc-updater`.

### Étape 2 — Mise à jour MEMORY
Mettre à jour `.claude/memory/MEMORY.md` avec :
- L'état final de la session (travail accompli, version courante)
- Les décisions importantes prises
- Les points en suspens pour la prochaine session

### Étape 3 — Merge vers main (si travail terminé)
Si du travail a été livré en Phase 3 :
- Vérifier que la branche courante est propre (`git status`)
- Informer l'utilisateur du merge à effectuer et attendre confirmation
- Après confirmation : merge vers `main` via PR ou merge direct selon le cas

### Étape 4 — Shutdown de la team
SendMessage type `shutdown_request` à chaque agent dans l'ordre :
1. `deployer`
2. `qa`
3. `doc-updater`
4. `code-reviewer`
5. `test-writer`
6. `dev-frontend`
7. `dev-backend`
8. `planner`
9. `cdp` (en dernier)

Attendre les confirmations de shutdown avant TeamDelete.

### Étape 5 — Nettoyage
TeamDelete pour supprimer la team `Team-AF`.

Confirmer à l'utilisateur : "Session terminée. MEMORY mise à jour. Team dissoute."
