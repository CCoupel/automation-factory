# Automation Factory Helm Chart

Chart Helm officiel pour déployer Automation Factory sur Kubernetes.

[![Published on GHCR](https://img.shields.io/badge/GHCR-published-blue)](https://ghcr.io/ccoupel/automation-factory)
[![Version](https://img.shields.io/badge/version-1.1.2-green)](https://github.com/ccoupel/automation-factory/releases)

## TL;DR

```bash
helm install automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --version 1.1.2 \
  --namespace automation-factory \
  --create-namespace
```

## Prérequis

- Kubernetes 1.19+
- Helm 3.8+ (support OCI requis)
- kubectl configuré pour accéder à votre cluster
- Cert-Manager (optionnel, pour TLS automatique)
- Ingress Controller (nginx recommandé)

## Architecture

L'application complète inclut:
- **Frontend**: Interface web React/Vite servie par Nginx
- **Backend**: API FastAPI (Python 3.11+)
- **PostgreSQL**: Base de données via CloudNativePG operator
- **Redis**: Cache et sessions
- **Ingress**: Routing HTTP/HTTPS (optionnel)

## Installation

### Méthode 1: Depuis GHCR (Recommandé)

**Installation simple:**

```bash
helm install automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --version 1.1.2 \
  --namespace automation-factory \
  --create-namespace
```

**Installation avec configuration personnalisée:**

```bash
# Générer des secrets sécurisés
JWT_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 24)

# Installer
helm install automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --version 1.1.2 \
  --namespace automation-factory \
  --create-namespace \
  --set ingress.hosts[0].host=ansible.mydomain.com \
  --set backend.env.JWT_SECRET_KEY="$JWT_SECRET" \
  --set redis.auth.password="$REDIS_PASSWORD"
```

**Installation avec fichier values:**

Créez `my-values.yaml`:

```yaml
ingress:
  enabled: true
  hosts:
    - host: ansible.mydomain.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
        - path: /api
          pathType: Prefix
          service: backend

backend:
  replicaCount: 3
  env:
    JWT_SECRET_KEY: "your-secure-secret-here"
    CORS_ORIGINS: "https://ansible.mydomain.com"

redis:
  auth:
    password: "your-redis-password"

cloudnative-pg:
  enabled: true
```

Puis installez:

```bash
helm install automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --version 1.1.2 \
  --namespace automation-factory \
  --create-namespace \
  --values my-values.yaml
```

### Méthode 2: Depuis le code source (Développement)

```bash
git clone https://bitbucket.org/ccoupel/automation_factory
cd automation_factory/helm/automation-factory

# Télécharger les dépendances
helm dependency update

# Installer
helm install automation-factory . \
  --namespace automation-factory \
  --create-namespace
```

## Configuration

### Valeurs principales

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `backend.replicaCount` | Nombre de replicas backend | `2` |
| `backend.image.repository` | Image Docker backend | `automation-factory-backend` |
| `backend.image.tag` | Tag de l'image | `1.1.0` |
| `backend.resources.limits.cpu` | CPU limit backend | `1000m` |
| `backend.resources.limits.memory` | Memory limit backend | `1Gi` |
| `backend.autoscaling.enabled` | Activer l'autoscaling | `true` |
| `backend.autoscaling.minReplicas` | Replicas minimum | `2` |
| `backend.autoscaling.maxReplicas` | Replicas maximum | `10` |
| `frontend.replicaCount` | Nombre de replicas frontend | `2` |
| `frontend.image.repository` | Image Docker frontend | `automation-factory-frontend` |
| `postgresql.enabled` | Utiliser PostgreSQL intégré | `true` |
| `postgresql.auth.password` | Mot de passe PostgreSQL | `changeme-in-production` |
| `redis.enabled` | Utiliser Redis intégré | `true` |
| `redis.auth.password` | Mot de passe Redis | `changeme-in-production` |
| `ingress.enabled` | Activer Ingress | `true` |
| `ingress.className` | Ingress class | `nginx` |

### Base de données externe

Pour utiliser une base PostgreSQL externe:

```yaml
postgresql:
  enabled: false
  external:
    host: "external-postgres.example.com"
    port: 5432
    username: ansible
    password: "secure-password"
    database: automation_factory
```

### Redis externe

Pour utiliser un Redis externe:

```yaml
redis:
  enabled: false
  external:
    host: "external-redis.example.com"
    port: 6379
    password: "secure-password"
    database: 0
```

## Mise à jour

```bash
helm upgrade automation-factory . \
  --namespace automation-factory \
  --values values-production.yaml
```

## Désinstallation

```bash
helm uninstall automation-factory --namespace automation-factory
```

## Surveillance

### Health checks

- Backend: `http://backend-service:8000/api/health`
- Frontend: `http://frontend-service/health`

### Logs

```bash
# Backend logs
kubectl logs -f -l app.kubernetes.io/component=backend -n automation-factory

# Frontend logs
kubectl logs -f -l app.kubernetes.io/component=frontend -n automation-factory

# PostgreSQL logs
kubectl logs -f -l app=postgresql -n automation-factory

# Redis logs
kubectl logs -f -l app=redis -n automation-factory
```

### Métriques

Le chart configure automatiquement:
- HPA (Horizontal Pod Autoscaler) pour le backend et frontend
- Resource limits et requests
- Liveness et Readiness probes

## Sécurité

### Best practices implémentées

- ✅ Utilisation de comptes non-root
- ✅ Security Context configuré
- ✅ Network Policies
- ✅ Secret management pour les mots de passe
- ✅ TLS/SSL via cert-manager
- ✅ Health checks configurés
- ✅ Resource limits définis

### Changements de mots de passe en production

**IMPORTANT**: Changez TOUS les mots de passe par défaut en production:

```yaml
backend:
  env:
    JWT_SECRET_KEY: "generate-secure-random-key"

postgresql:
  auth:
    password: "generate-secure-password"

redis:
  auth:
    password: "generate-secure-password"
```

Générer des mots de passe sécurisés:

```bash
# JWT Secret
openssl rand -base64 32

# Passwords
openssl rand -base64 24
```

## Troubleshooting

### Les pods ne démarrent pas

```bash
# Vérifier les events
kubectl get events -n automation-factory --sort-by='.lastTimestamp'

# Décrire les pods
kubectl describe pod <pod-name> -n automation-factory

# Vérifier les logs
kubectl logs <pod-name> -n automation-factory
```

### Problèmes de connexion à la base de données

```bash
# Vérifier que PostgreSQL est running
kubectl get pods -l app=postgresql -n automation-factory

# Test de connexion depuis un pod backend
kubectl exec -it <backend-pod> -n automation-factory -- python -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://ansible:password@postgresql:5432/automation_factory'); print(engine.connect())"
```

### Problèmes d'ingress

```bash
# Vérifier l'ingress
kubectl describe ingress -n automation-factory

# Vérifier les services
kubectl get svc -n automation-factory

# Logs de l'ingress controller
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Support

Pour toute question ou problème:
- Issues: https://bitbucket.org/ccoupel/automation_factory/issues
- Documentation: https://bitbucket.org/ccoupel/automation_factory

## License

Propriétaire
