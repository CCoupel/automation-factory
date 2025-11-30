# Ansible Builder Helm Chart

Chart Helm officiel pour déployer Ansible Builder sur Kubernetes.

[![Published on GHCR](https://img.shields.io/badge/GHCR-published-blue)](https://ghcr.io/ccoupel/ansible-builder)
[![Version](https://img.shields.io/badge/version-1.1.1-green)](https://github.com/ccoupel/ansible-builder/releases)

## TL;DR

```bash
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --version 1.1.1 \
  --namespace ansible-builder \
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
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --version 1.1.1 \
  --namespace ansible-builder \
  --create-namespace
```

**Installation avec configuration personnalisée:**

```bash
# Générer des secrets sécurisés
JWT_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 24)

# Installer
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --version 1.1.1 \
  --namespace ansible-builder \
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
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --version 1.1.1 \
  --namespace ansible-builder \
  --create-namespace \
  --values my-values.yaml
```

### Méthode 2: Depuis le code source (Développement)

```bash
git clone https://bitbucket.org/ccoupel/ansible_builder
cd ansible_builder/helm/ansible-builder

# Télécharger les dépendances
helm dependency update

# Installer
helm install ansible-builder . \
  --namespace ansible-builder \
  --create-namespace
```

## Configuration

### Valeurs principales

| Paramètre | Description | Défaut |
|-----------|-------------|--------|
| `backend.replicaCount` | Nombre de replicas backend | `2` |
| `backend.image.repository` | Image Docker backend | `ansible-builder-backend` |
| `backend.image.tag` | Tag de l'image | `1.1.0` |
| `backend.resources.limits.cpu` | CPU limit backend | `1000m` |
| `backend.resources.limits.memory` | Memory limit backend | `1Gi` |
| `backend.autoscaling.enabled` | Activer l'autoscaling | `true` |
| `backend.autoscaling.minReplicas` | Replicas minimum | `2` |
| `backend.autoscaling.maxReplicas` | Replicas maximum | `10` |
| `frontend.replicaCount` | Nombre de replicas frontend | `2` |
| `frontend.image.repository` | Image Docker frontend | `ansible-builder-frontend` |
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
    database: ansible_builder
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
helm upgrade ansible-builder . \
  --namespace ansible-builder \
  --values values-production.yaml
```

## Désinstallation

```bash
helm uninstall ansible-builder --namespace ansible-builder
```

## Surveillance

### Health checks

- Backend: `http://backend-service:8000/api/health`
- Frontend: `http://frontend-service/health`

### Logs

```bash
# Backend logs
kubectl logs -f -l app.kubernetes.io/component=backend -n ansible-builder

# Frontend logs
kubectl logs -f -l app.kubernetes.io/component=frontend -n ansible-builder

# PostgreSQL logs
kubectl logs -f -l app=postgresql -n ansible-builder

# Redis logs
kubectl logs -f -l app=redis -n ansible-builder
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
kubectl get events -n ansible-builder --sort-by='.lastTimestamp'

# Décrire les pods
kubectl describe pod <pod-name> -n ansible-builder

# Vérifier les logs
kubectl logs <pod-name> -n ansible-builder
```

### Problèmes de connexion à la base de données

```bash
# Vérifier que PostgreSQL est running
kubectl get pods -l app=postgresql -n ansible-builder

# Test de connexion depuis un pod backend
kubectl exec -it <backend-pod> -n ansible-builder -- python -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://ansible:password@postgresql:5432/ansible_builder'); print(engine.connect())"
```

### Problèmes d'ingress

```bash
# Vérifier l'ingress
kubectl describe ingress -n ansible-builder

# Vérifier les services
kubectl get svc -n ansible-builder

# Logs de l'ingress controller
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Support

Pour toute question ou problème:
- Issues: https://bitbucket.org/ccoupel/ansible_builder/issues
- Documentation: https://bitbucket.org/ccoupel/ansible_builder

## License

Propriétaire
