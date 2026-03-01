# Commande /start-session - Démarrage de Session

$ARGUMENTS

## Instructions

### Étape 1 — Lecture MEMORY
Lis `.claude/memory/MEMORY.md`.

### Étape 2 — Création de la TEAM
Sans demander confirmation :
1. TeamCreate avec le nom `myTEAM`
2. Spawner TOUS les agents en parallèle :

| Nom | Type | Rôle |
|-----|------|------|
| `cdp` | cdp | Chef de Projet — Team Leader |
| `planner` | implementation-planner | Planification |
| `code-reviewer` | code-reviewer | Revue de code |
| `test-writer` | test-writer | Rédaction des tests |
| `qa` | QA | Tests et validation |
| `doc-updater` | doc-updater | Documentation |
| `deployer` | deploy | Déploiement |
| `dev-backend` | dev-backend | FastAPI / Python |
| `dev-frontend` | dev-frontend | React 18 / TypeScript |

3. Confirme la liste des agents à l'utilisateur.

## Règles
- MEMORY projet = seule source de vérité
- TEAM toujours créée, nom toujours `myTEAM`
- `cdp` toujours le premier agent spawné
