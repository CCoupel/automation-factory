# Commande /start-session - Démarrage de Session

$ARGUMENTS

## Instructions

### Étape 1 — Lecture MEMORY
Lis `.claude/memory/MEMORY.md`.

### Étape 2 — Création de la TEAM
Sans demander confirmation :
1. TeamCreate avec le nom `Team-AF`
2. Spawner TOUS les agents en parallèle avec le prompt ci-dessous pour chacun :

| Nom | Type | Prompt de spawn |
|-----|------|-----------------|
| `cdp` | `cdp` | `"Lis .claude/agents/cdp.md et applique ces instructions pour toute la session."` |
| `planner` | `planner` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/planner.md, et applique ces instructions pour toute la session."` |
| `code-reviewer` | `code-reviewer` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/code-reviewer.md, et applique ces instructions pour toute la session."` |
| `test-writer` | `test-writer` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/test-writer.md, et applique ces instructions pour toute la session."` |
| `qa` | `qa` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/qa.md, et applique ces instructions pour toute la session."` |
| `doc-updater` | `doc-updater` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/doc-updater.md, et applique ces instructions pour toute la session."` |
| `deployer` | `deployer` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/deployer.md, et applique ces instructions pour toute la session."` |
| `infra` | `infra` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/infra.md, et applique ces instructions pour toute la session."` |
| `dev-backend` | `dev-backend` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/dev-backend.md, et applique ces instructions pour toute la session."` |
| `dev-frontend` | `dev-frontend` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/dev-frontend.md, et applique ces instructions pour toute la session."` |
| `marketing-release` | `marketing-release` | `"Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/marketing-release.md, et applique ces instructions pour toute la session."` |

3. Confirme la liste des 11 agents créés à l'utilisateur.

## Règles
- MEMORY projet = seule source de vérité
- TEAM toujours créée, nom toujours `Team-AF`
- `cdp` toujours le premier agent spawné

> **Note** : `/start-session` pré-initialise les 11 agents en parallèle (session intensive). Les commandes directes (`/feature`, `/bugfix`, etc.) utilisent un bootstrap minimal — elles créent la team avec CDP seul, et le CDP spawne uniquement les agents nécessaires à la demande.
