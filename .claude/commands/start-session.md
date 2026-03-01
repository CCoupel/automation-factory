# Commande /start-session - Démarrage de Session

$ARGUMENTS

## Instructions

### Étape 1 — Lecture MEMORY
Lis `.claude/memory/MEMORY.md`.

### Étape 2 — Création de la TEAM
Sans demander confirmation :
1. TeamCreate avec le nom `myTEAM`
2. Spawner TOUS les agents en parallèle avec leur spécialisation :

| Nom | Type | Fichier de spécialisation |
|-----|------|--------------------------|
| `cdp` | cdp | `.claude/commands/agents/cdp.md` |
| `planner` | implementation-planner | `.claude/commands/agents/planner.md` |
| `code-reviewer` | code-reviewer | `.claude/commands/agents/code-reviewer.md` |
| `test-writer` | test-writer | `.claude/commands/agents/test-writer.md` |
| `qa` | QA | `.claude/commands/agents/qa.md` |
| `doc-updater` | doc-updater | `.claude/commands/agents/doc-updater.md` |
| `deployer` | deploy | `.claude/commands/agents/deployer.md` |
| `dev-backend` | dev-backend | `.claude/commands/agents/dev-backend.md` |
| `dev-frontend` | dev-frontend | `.claude/commands/agents/dev-frontend.md` |

**Prompt de spawn pour chaque agent :**
> "Lis `.claude/commands/agents/<nom>.md` et applique ces instructions pour toute la session."

3. Confirme la liste des agents créés à l'utilisateur.

## Règles
- MEMORY projet = seule source de vérité
- TEAM toujours créée, nom toujours `myTEAM`
- `cdp` toujours le premier agent spawné
- Chaque agent lit son fichier de spécialisation au démarrage
