# Ansible Builder Helm Chart

Ce Helm chart déploie l'application Ansible Builder dans un cluster Kubernetes.

## Prérequis

- Kubernetes 1.23+
- Helm 3.8+
- kubectl configuré pour accéder à votre cluster
- Cert-Manager (pour les certificats TLS automatiques)
- Ingress Controller (nginx recommandé)

## Architecture

L'application est composée de:
- **Frontend**: Application React/Vite servie par Nginx
- **Backend**: API FastAPI (Python)
- **PostgreSQL**: Base de données (chart Bitnami)
- **Redis**: Cache (chart Bitnami)

## Installation

### 1. Ajouter les dépendances Helm

```bash
# Ajouter le repository Bitnami
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### 2. Construire les images Docker

```bash
# Backend
cd backend
docker build -t ansible-builder-backend:1.1.0 .

# Frontend
cd ../frontend
docker build -t ansible-builder-frontend:1.1.0 .

# Pousser vers votre registry
docker tag ansible-builder-backend:1.1.0 your-registry/ansible-builder-backend:1.1.0
docker push your-registry/ansible-builder-backend:1.1.0

docker tag ansible-builder-frontend:1.1.0 your-registry/ansible-builder-frontend:1.1.0
docker push your-registry/ansible-builder-frontend:1.1.0
```

### 3. Créer un fichier de values personnalisés

Créez `values-production.yaml`:

```yaml
global:
  imageRegistry: "your-registry/"

backend:
  image:
    repository: ansible-builder-backend
    tag: "1.1.0"

  env:
    JWT_SECRET_KEY: "your-super-secret-key-here"
    CORS_ORIGINS: "https://ansible-builder.yourdomain.com"

frontend:
  image:
    repository: ansible-builder-frontend
    tag: "1.1.0"

  env:
    VITE_API_URL: "https://ansible-builder.yourdomain.com/api"

ingress:
  enabled: true
  hosts:
    - host: ansible-builder.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
        - path: /api
          pathType: Prefix
          service: backend
  tls:
    - secretName: ansible-builder-tls
      hosts:
        - ansible-builder.yourdomain.com

postgresql:
  auth:
    password: "change-me-in-production"
  primary:
    persistence:
      size: 20Gi

redis:
  auth:
    password: "change-me-in-production"
```

### 4. Installer le chart

```bash
cd helm/ansible-builder

# Update dependencies
helm dependency update

# Install
helm install ansible-builder . \
  --namespace ansible-builder \
  --create-namespace \
  --values values-production.yaml
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
