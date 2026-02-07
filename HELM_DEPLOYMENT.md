# Guide de Déploiement Helm - Automation Factory

Ce document explique comment déployer Automation Factory sur Kubernetes en utilisant le Helm chart depuis GitHub Container Registry (GHCR).

## 📦 Chart Information

- **Registry**: GitHub Container Registry (GHCR)
- **URL**: `oci://ghcr.io/ccoupel/automation-factory`
- **Version actuelle**: `1.1.1`
- **Source**: https://bitbucket.org/ccoupel/automation_factory

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
helm install automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --version 1.1.1 \
  --namespace automation-factory \
  --create-namespace
```

**Installation avec configuration personnalisée:**

```bash
# Générer des secrets sécurisés
JWT_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 24)

# Installer avec configuration
helm install automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --version 1.1.1 \
  --namespace automation-factory \
  --create-namespace \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=automation-factory.yourdomain.com \
  --set backend.env.JWT_SECRET_KEY="$JWT_SECRET" \
  --set redis.auth.password="$REDIS_PASSWORD"
```

### 3. Vérifier le Déploiement

```bash
# Vérifier les pods
kubectl get pods -n automation-factory

# Vérifier les services
kubectl get svc -n automation-factory

# Vérifier l'ingress
kubectl get ingress -n automation-factory

# Voir les logs
kubectl logs -f -l app.kubernetes.io/component=backend -n automation-factory
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
    CORS_ORIGINS: "https://automation-factory.yourdomain.com"

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
    VITE_API_URL: "https://automation-factory.yourdomain.com/api"

# Ingress
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: automation-factory.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
        - path: /api
          pathType: Prefix
          service: backend
  tls:
    - secretName: automation-factory-tls
      hosts:
        - automation-factory.yourdomain.com

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
helm install automation-factory automation-factory/automation-factory \
  --namespace automation-factory \
  --create-namespace \
  --values my-values.yaml
```

## 🔄 Mise à Jour

```bash
# Voir les informations de version disponible
helm show chart oci://ghcr.io/ccoupel/automation-factory

# Mettre à jour vers la dernière version
helm upgrade automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --namespace automation-factory \
  --values my-values.yaml

# Mettre à jour vers une version spécifique
helm upgrade automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --namespace automation-factory \
  --version 1.2.0 \
  --values my-values.yaml
```

## 🗑️ Désinstallation

```bash
# Désinstaller l'application
helm uninstall automation-factory --namespace automation-factory

# Supprimer le namespace (attention: supprime aussi les PVC)
kubectl delete namespace automation-factory
```

## 🔧 Debugging

### Voir les valeurs appliquées

```bash
# Valeurs par défaut du chart
helm show values oci://ghcr.io/ccoupel/automation-factory

# Valeurs actuelles de votre installation
helm get values automation-factory -n automation-factory
```

### Dry-run avant installation

```bash
# Vérifier ce qui sera créé
helm install automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --namespace automation-factory \
  --dry-run \
  --debug \
  --values my-values.yaml
```

### Rollback en cas de problème

```bash
# Lister les révisions
helm history automation-factory -n automation-factory

# Rollback vers la révision précédente
helm rollback automation-factory -n automation-factory

# Rollback vers une révision spécifique
helm rollback automation-factory 1 -n automation-factory
```

## 📦 Pour les Développeurs

### Publier une nouvelle version sur OCI Registry

Si vous avez modifié le chart localement:

```bash
# 1. Mettre à jour la version dans helm/automation-factory/Chart.yaml

# 2. Se connecter au registry (une seule fois)
echo $GITHUB_TOKEN | helm registry login ghcr.io -u $GITHUB_USERNAME --password-stdin

# 3. Packager et pousser avec le script
cd charts
./package-oci.sh ghcr.io/ccoupel

# 4. Commit et push dans Git (optionnel)
cd ..
git add helm/automation-factory/Chart.yaml
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
helm install test-automation-factory ./helm/automation-factory \
  --namespace test \
  --create-namespace \
  --dependency-update

# Nettoyer après test
helm uninstall test-automation-factory -n test
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
   kubectl create secret generic automation-factory-secrets \
     --from-literal=jwt-secret=$JWT_SECRET \
     --from-literal=postgres-password=$PG_PASSWORD \
     --from-literal=redis-password=$REDIS_PASSWORD \
     -n automation-factory
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
- [README du Chart](../helm/automation-factory/README.md)
- [Documentation Backend](../backend/CLAUDE_BACKEND.md)
- [Documentation Frontend](../frontend/CLAUDE_FRONTEND.md)

## 🆘 Support

- **Issues**: https://bitbucket.org/ccoupel/automation_factory/issues
- **Repository**: https://bitbucket.org/ccoupel/automation_factory
