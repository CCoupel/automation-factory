# Adaptations projet — Automation Factory

> Complète `infra.template.md` avec le périmètre réel d'infrastructure du projet.

## Périmètre

### Helm Chart (`helm/automation-factory/`)
- `Chart.yaml` / `Chart.lock` — version du chart + dépendance subchart `redis` (`charts/redis-*.tgz`)
- Templates par composant (pas de fichiers génériques `deployment.yaml`/`service.yaml`) :
  - `backend-deployment.yaml`, `backend-service.yaml`, `backend-configmap.yaml`,
    `backend-secret.yaml`, `backend-hpa.yaml`
  - `frontend-deployment.yaml`, `frontend-service.yaml`, `frontend-configmap.yaml`,
    `frontend-dist-configmap.yaml`, `frontend-hpa.yaml`
  - `postgresql-cluster.yaml`, `postgresql-statefulset.yaml` — **PostgreSQL est déployé PAR le
    chart lui-même**, ce n'est pas un service managé externe. Deux modes conditionnés par
    `.Values.postgresql.enabled` / `.Values["cloudnative-pg"].enabled` : cluster CNPG
    (`postgresql.cnpg.io/v1`, opérateur installé séparément dans le namespace `cnpg-system`) ou
    StatefulSet standard. **Mode actif en prod aujourd'hui : StatefulSet standard**
    (`custom-values.yaml` : "Using standard PostgreSQL StatefulSet instead", CNPG désactivé —
    problèmes d'image pull rencontrés avec la dépendance Bitnami `postgresql`, retirée de
    `Chart.yaml` au profit du StatefulSet maison)
  - `ingress.yaml` — ⚠️ **Traefik**, pas nginx-ingress (voir `traefik-middleware.yaml` — le fix
    "base href injection" de nginx dans le frontend existe précisément pour la compatibilité
    avec le strip de préfixe Traefik, cf. commit `e79fb92`)
  - `networkpolicy.yaml`, `serviceaccount.yaml`, `_helpers.tpl`, `NOTES.txt`
- `values.yaml` — valeurs par défaut
- `custom-values.yaml` — valeurs de surcharge production

### Docker Compose (`docker-compose.staging.yml`)
- Ajout/modification de services, volumes, réseaux, variables d'environnement
- ⚠️ Les **tags des images** (numéros de version) sont gérés par `doc-updater`, pas `infra`

### Dockerfiles
- `backend/Dockerfile` — image production backend
- `frontend/Dockerfile` — image production frontend (nginx)
- Optimisations multi-stage, layer caching

## Règles absolues (projet)
- **Principe BORE** : les Dockerfiles produisent la même image pour staging et production
- **Jamais** de secrets en clair — Secrets K8s ou variables d'environnement
- **Toujours** définir `resources.requests`/`resources.limits` pour les nouveaux containers
- **Toujours** définir `livenessProbe`/`readinessProbe` pour les nouveaux services
- Toute modification Helm → bumper la version dans `Chart.yaml`
