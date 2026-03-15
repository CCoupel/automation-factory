# AGENTS — Automation Factory

Documentation des agents Claude et des commandes disponibles.

---

## Commandes disponibles

| Commande | Description |
|----------|-------------|
| `/start-session` | Crée la TEAM `Team-AF` avec tous les agents |
| `/feature <description>` | Développement d'une nouvelle fonctionnalité |
| `/bugfix <description>` | Correction de bug |
| `/hotfix <description>` | Correction urgente en production |
| `/refactor <description>` | Refactoring de code |
| `/pr [PR_NUMBER] [--base <branche>]` | Validation et merge d'une pull request externe |
| `/deploy` | Déploiement |
| `/review` | Audit périodique du code |
| `/code-review` | Revue de code ciblée |
| `/qa` | Validation qualité |
| `/plan <description>` | Plan d'implémentation |
| `/dev <description>` | Implémentation backend + frontend |
| `/dev-backend <description>` | Implémentation backend |
| `/dev-frontend <description>` | Implémentation frontend |
| `/doc <description>` | Mise à jour documentation |
| `/test-write <description>` | Écriture de tests |
| `/infra <description>` | Infrastructure |
| `/cdp <message>` | Contrôle direct de l'orchestrateur |
| `/backlog` | Gestion du backlog |
| `/end-session` | Fin de session |

---

## Agents disponibles

### Agents permanents (spawned à `/start-session`)

| Agent | Type | Rôle |
|-------|------|------|
| `cdp` | cdp | Chef de Projet — orchestrateur principal |
| `planner` | planner | Décomposition technique des features |
| `dev-backend` | dev-backend | Implémentation FastAPI/Python |
| `dev-frontend` | dev-frontend | Implémentation React/TypeScript |
| `test-writer` | test-writer | Écriture des tests unitaires et d'intégration |
| `code-reviewer` | code-reviewer | Revue de code (APPROUVÉ / REFUSÉ) |
| `qa` | qa | Validation fonctionnelle Phase 1/2/3 |
| `doc-updater` | doc-updater | Mise à jour docs et CHANGELOG |
| `deployer` | deployer | Builds Docker et déploiements |
| `infra` | infra | Variables d'env, services K8s |

### Agents on-demand (spawned par le CDP selon le besoin)

| Agent | Type | Rôle |
|-------|------|------|
| `pr-reviewer` | pr-reviewer | Validation de pull requests externes |

---

## Workflow /pr — Pull Request externe

La gestion d'une PR externe est un workflow **distinct** du cycle Phase 1→2→3.
`develop` ne reçoit du code que lorsque la validation complète est terminée.

### Syntaxe

```
/pr [PR_NUMBER] [--base <branche>]
```

| Paramètre | Obligatoire | Défaut | Description |
|-----------|-------------|--------|-------------|
| PR_NUMBER | Non | — | Numéro de PR. Si absent, le CDP liste les PRs ouvertes. |
| --base | Non | `develop` | Branche de base pour `contrib/xxx` |

### Vue d'ensemble des phases

```
PHASE A — PRÉPARATION
  A1. Résolution PR
  A2. Création branche locale contrib/PR<N>-<nom> (develop non touché)
  A3. Récupération du code → détection conflits
      CONFLIT → REFUSÉ immédiat

PHASE B — VALIDATION TECHNIQUE (sur contrib/xxx)
  B1. Checks parallèles : lint/typecheck + tests + audit sécurité
  B2. Spawn pr-reviewer
  B3. Verdict
      REFUSÉ   → label "needs-work", workflow terminé
      APPROUVÉ → label "ready-for-qa", phase C

PHASE C — VALIDATION FONCTIONNELLE (sur contrib/xxx)
  C1. Build local (backend :8000 + frontend :5173)
  C2. QA smoke tests + non-régression
      ÉCHEC → label "needs-work", workflow terminé
  C3. Bilan complet → GO utilisateur requis

PHASE D — MERGE (develop touché uniquement ici)
  D1. Garde-fou : vérifier head_sha inchangé
  D2. git merge --squash contrib/xxx dans develop
  D3. Nettoyage + fermeture PR + label "merged"
  D4. Handoff CDP → cycle Phase 1 normal
```

### Labels GitHub utilisés

| Label | Signification |
|-------|--------------|
| `needs-work` | PR refusée, corrections requises |
| `ready-for-qa` | Validation technique OK, QA en cours |
| `ready-to-merge` | QA validée, attend go utilisateur |
| `merged` | Intégrée dans develop |

### Variables d'environnement requises

```
GITHUB_TOKEN    # droits : pull_requests:write, issues:write
GITHUB_REPO     # format owner/repo (ex: CCoupel/automation-factory)
```
