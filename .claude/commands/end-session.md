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
Lire la config team (`~/.claude/teams/Team-AF/config.json`) pour connaître les agents actifs.
Envoyer `shutdown_request` uniquement aux agents présents, dans l'ordre :
`infra` → `deployer` → `qa` → `doc-updater` → `code-reviewer` → `test-writer` → `dev-frontend` → `dev-backend` → `planner` → `cdp` (en dernier)

Attendre les confirmations de shutdown avant TeamDelete.

### Étape 5 — Nettoyage
TeamDelete pour supprimer la team `Team-AF`.

Confirmer à l'utilisateur : "Session terminée. MEMORY mise à jour. Team dissoute."
