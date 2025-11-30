# Guide de Déploiement Helm - Ansible Builder

Ce document explique comment déployer Ansible Builder sur Kubernetes en utilisant le Helm chart depuis GitHub Container Registry (GHCR).

## 📦 Chart Information

- **Registry**: GitHub Container Registry (GHCR)
- **URL**: `oci://ghcr.io/ccoupel/ansible-builder`
- **Version actuelle**: `1.1.0`
- **Source**: https://bitbucket.org/ccoupel/ansible_builder

## 🚀 Installation Rapide

### 1. Prérequis

```bash
# Vérifier que Helm 3.8+ est installé (support OCI requis)
helm version

# Vérifier l'accès au cluster Kubernetes
kubectl cluster-info
kubectl get nodes

# Si besoin, mettre à jour Helm
# Voir: https://helm.sh/docs/intro/install/
```

### 2. Installation Standard

**Installation avec valeurs par défaut:**

```bash
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --version 1.1.0 \
  --namespace ansible-builder \
  --create-namespace
```

**Installation avec configuration personnalisée:**

```bash
# Générer des secrets sécurisés
JWT_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 24)

# Installer avec configuration
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --version 1.1.0 \
  --namespace ansible-builder \
  --create-namespace \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=ansible-builder.yourdomain.com \
  --set backend.env.JWT_SECRET_KEY="$JWT_SECRET" \
  --set redis.auth.password="$REDIS_PASSWORD"
```

### 3. Vérifier le Déploiement

```bash
# Vérifier les pods
kubectl get pods -n ansible-builder

# Vérifier les services
kubectl get svc -n ansible-builder

# Vérifier l'ingress
kubectl get ingress -n ansible-builder

# Voir les logs
kubectl logs -f -l app.kubernetes.io/component=backend -n ansible-builder
```

## 📝 Configuration Personnalisée

### Créer un fichier values.yaml

Créez `my-values.yaml`:

```yaml
# Configuration de base
global:
  imageRegistry: "your-registry.com/"

# Backend
backend:
  replicaCount: 3
  env:
    JWT_SECRET_KEY: "your-secret-key-here"
    CORS_ORIGINS: "https://ansible-builder.yourdomain.com"

  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 2Gi

  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20

# Frontend
frontend:
  replicaCount: 2
  env:
    VITE_API_URL: "https://ansible-builder.yourdomain.com/api"

# Ingress
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
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

# PostgreSQL
postgresql:
  enabled: true
  auth:
    password: "change-me-secure-password"
  primary:
    persistence:
      size: 50Gi

# Redis
redis:
  enabled: true
  auth:
    password: "change-me-secure-password"
```

### Installer avec le fichier personnalisé

```bash
helm install ansible-builder ansible-builder/ansible-builder \
  --namespace ansible-builder \
  --create-namespace \
  --values my-values.yaml
```

## 🔄 Mise à Jour

```bash
# Voir les informations de version disponible
helm show chart oci://ghcr.io/ccoupel/ansible-builder

# Mettre à jour vers la dernière version
helm upgrade ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --namespace ansible-builder \
  --values my-values.yaml

# Mettre à jour vers une version spécifique
helm upgrade ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --namespace ansible-builder \
  --version 1.2.0 \
  --values my-values.yaml
```

## 🗑️ Désinstallation

```bash
# Désinstaller l'application
helm uninstall ansible-builder --namespace ansible-builder

# Supprimer le namespace (attention: supprime aussi les PVC)
kubectl delete namespace ansible-builder
```

## 🔧 Debugging

### Voir les valeurs appliquées

```bash
# Valeurs par défaut du chart
helm show values oci://ghcr.io/ccoupel/ansible-builder

# Valeurs actuelles de votre installation
helm get values ansible-builder -n ansible-builder
```

### Dry-run avant installation

```bash
# Vérifier ce qui sera créé
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --namespace ansible-builder \
  --dry-run \
  --debug \
  --values my-values.yaml
```

### Rollback en cas de problème

```bash
# Lister les révisions
helm history ansible-builder -n ansible-builder

# Rollback vers la révision précédente
helm rollback ansible-builder -n ansible-builder

# Rollback vers une révision spécifique
helm rollback ansible-builder 1 -n ansible-builder
```

## 📦 Pour les Développeurs

### Publier une nouvelle version sur OCI Registry

Si vous avez modifié le chart localement:

```bash
# 1. Mettre à jour la version dans helm/ansible-builder/Chart.yaml

# 2. Se connecter au registry (une seule fois)
echo $GITHUB_TOKEN | helm registry login ghcr.io -u $GITHUB_USERNAME --password-stdin

# 3. Packager et pousser avec le script
cd charts
./package-oci.sh ghcr.io/ccoupel

# 4. Commit et push dans Git (optionnel)
cd ..
git add helm/ansible-builder/Chart.yaml
git commit -m "chore: release helm chart v1.2.0"
git push
```

### Configuration du Token GitHub

Pour publier sur GitHub Container Registry (GHCR):

1. Créer un Personal Access Token (PAT):
   - Aller sur https://github.com/settings/tokens
   - Créer un nouveau token avec scope `write:packages`

2. Configurer les variables d'environnement:
   ```bash
   export GITHUB_USERNAME="votre-username"
   export GITHUB_TOKEN="ghp_votre_token_ici"
   ```

3. Se connecter au registry:
   ```bash
   echo $GITHUB_TOKEN | helm registry login ghcr.io -u $GITHUB_USERNAME --password-stdin
   ```

### Tester localement (sans publier)

```bash
# Installer depuis le chart local (non packagé)
helm install test-ansible-builder ./helm/ansible-builder \
  --namespace test \
  --create-namespace \
  --dependency-update

# Nettoyer après test
helm uninstall test-ansible-builder -n test
kubectl delete namespace test
```

### Publier sur d'autres Registries

**Docker Hub:**
```bash
echo $DOCKER_TOKEN | helm registry login docker.io -u $DOCKER_USERNAME --password-stdin
./package-oci.sh docker.io/ccoupel
```

**GitLab Registry:**
```bash
echo $GITLAB_TOKEN | helm registry login registry.gitlab.com -u $GITLAB_USERNAME --password-stdin
./package-oci.sh registry.gitlab.com/ccoupel
```

## 🔐 Bonnes Pratiques de Sécurité

1. **Toujours changer les mots de passe par défaut**
   ```bash
   # Générer des secrets sécurisés
   JWT_SECRET=$(openssl rand -base64 32)
   PG_PASSWORD=$(openssl rand -base64 24)
   REDIS_PASSWORD=$(openssl rand -base64 24)
   ```

2. **Utiliser des Secrets Kubernetes**
   ```bash
   # Créer un secret pour les mots de passe
   kubectl create secret generic ansible-builder-secrets \
     --from-literal=jwt-secret=$JWT_SECRET \
     --from-literal=postgres-password=$PG_PASSWORD \
     --from-literal=redis-password=$REDIS_PASSWORD \
     -n ansible-builder
   ```

3. **Activer TLS/SSL**
   - Installer cert-manager
   - Configurer un ClusterIssuer
   - Utiliser les annotations dans l'Ingress

4. **Network Policies**
   - Activées par défaut dans le chart
   - Limitent la communication entre pods

## 📚 Documentation Complète

Pour plus de détails:
- [README du Chart](../helm/ansible-builder/README.md)
- [Documentation Backend](../backend/CLAUDE_BACKEND.md)
- [Documentation Frontend](../frontend/CLAUDE_FRONTEND.md)

## 🆘 Support

- **Issues**: https://bitbucket.org/ccoupel/ansible_builder/issues
- **Repository**: https://bitbucket.org/ccoupel/ansible_builder
