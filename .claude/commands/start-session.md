# Commande /start-session - Démarrage de Session

$ARGUMENTS

## Instructions

### Étape 1 — Lecture MEMORY
Lis `.claude/memory/MEMORY.md`.

### Étape 2 — Création de la TEAM
Sans demander confirmation :
1. TeamCreate avec le nom `myTEAM`
2. Spawner TOUS les agents en parallèle avec le prompt ci-dessous pour chacun :

| Nom | Type | Prompt de spawn |
|-----|------|-----------------|
| `cdp` | cdp | `"Lis .claude/agents/cdp.md et applique ces instructions pour toute la session."` |
| `planner` | implementation-planner | `"Lis .claude/agents/planner.md et applique ces instructions pour toute la session."` |
| `code-reviewer` | code-reviewer | `"Lis .claude/agents/code-reviewer.md et applique ces instructions pour toute la session."` |
| `test-writer` | test-writer | `"Lis .claude/agents/test-writer.md et applique ces instructions pour toute la session."` |
| `qa` | QA | `"Lis .claude/agents/qa.md et applique ces instructions pour toute la session."` |
| `doc-updater` | doc-updater | `"Lis .claude/agents/doc-updater.md et applique ces instructions pour toute la session."` |
| `deployer` | deploy | `"Lis .claude/agents/deployer.md et applique ces instructions pour toute la session."` |
| `dev-backend` | dev-backend | `"Lis .claude/agents/dev-backend.md et applique ces instructions pour toute la session."` |
| `dev-frontend` | dev-frontend | `"Lis .claude/agents/dev-frontend.md et applique ces instructions pour toute la session."` |

3. Confirme la liste des agents créés à l'utilisateur.

## Règles
- MEMORY projet = seule source de vérité
- TEAM toujours créée, nom toujours `myTEAM`
- `cdp` toujours le premier agent spawné
