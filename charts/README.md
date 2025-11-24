# Ansible Builder Helm Chart - OCI Registry

Ce repository contient le Helm chart pour Ansible Builder, distribué via OCI registry.

## 🚀 Installation depuis OCI Registry

### Prérequis

- Helm 3.8.0 ou supérieur (support OCI)
- kubectl configuré avec accès à votre cluster Kubernetes

### Installation Directe

```bash
# Installation avec Docker Hub
helm install ansible-builder oci://docker.io/ccoupel/ansible-builder \
  --namespace ansible-builder \
  --create-namespace

# Installation avec GitHub Container Registry
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --namespace ansible-builder \
  --create-namespace

# Installation avec GitLab Registry
helm install ansible-builder oci://registry.gitlab.com/ccoupel/ansible-builder \
  --namespace ansible-builder \
  --create-namespace
```

### Installation avec Version Spécifique

```bash
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --version 1.1.0 \
  --namespace ansible-builder \
  --create-namespace
```

### Installation avec Configuration Personnalisée

```bash
# Créer un fichier my-values.yaml avec vos configurations
helm install ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --namespace ansible-builder \
  --create-namespace \
  --values my-values.yaml
```

## 📝 Lister les Versions Disponibles

```bash
# Pour Docker Hub
helm show chart oci://docker.io/ccoupel/ansible-builder

# Pour GitHub Container Registry
helm show chart oci://ghcr.io/ccoupel/ansible-builder
```

## 🔄 Mise à Jour

```bash
# Vers la dernière version
helm upgrade ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --namespace ansible-builder

# Vers une version spécifique
helm upgrade ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --version 1.2.0 \
  --namespace ansible-builder
```

## 🗑️ Désinstallation

```bash
helm uninstall ansible-builder --namespace ansible-builder
kubectl delete namespace ansible-builder
```

## 📦 Pour les Développeurs - Publier sur OCI Registry

### 1. Se connecter au Registry

```bash
# Docker Hub
echo $DOCKER_TOKEN | helm registry login docker.io -u $DOCKER_USERNAME --password-stdin

# GitHub Container Registry
echo $GITHUB_TOKEN | helm registry login ghcr.io -u $GITHUB_USERNAME --password-stdin

# GitLab Registry
echo $GITLAB_TOKEN | helm registry login registry.gitlab.com -u $GITLAB_USERNAME --password-stdin
```

### 2. Packager et Pousser le Chart

```bash
# Utiliser le script automatique
cd charts
./package-oci.sh ghcr.io/ccoupel

# Ou manuellement
cd ../helm/ansible-builder
helm dependency update
helm package .
helm push ansible-builder-1.1.0.tgz oci://ghcr.io/ccoupel
```

### 3. Script de Publication Automatisé

Le script `package-oci.sh` automatise tout le processus:

```bash
# Syntaxe
./package-oci.sh <registry> [version]

# Exemples
./package-oci.sh ghcr.io/ccoupel              # Version depuis Chart.yaml
./package-oci.sh docker.io/myuser 1.2.0       # Version spécifique
./package-oci.sh registry.gitlab.com/mygroup  # GitLab Registry
```

## 🔐 Configuration des Tokens

### GitHub Container Registry (Recommandé)

1. Créer un Personal Access Token (PAT) avec scope `write:packages`
2. Se connecter:
   ```bash
   echo $GITHUB_TOKEN | helm registry login ghcr.io -u $GITHUB_USERNAME --password-stdin
   ```

### Docker Hub

1. Créer un Access Token dans les paramètres Docker Hub
2. Se connecter:
   ```bash
   echo $DOCKER_TOKEN | helm registry login docker.io -u $DOCKER_USERNAME --password-stdin
   ```

### GitLab Container Registry

1. Créer un Personal Access Token avec scope `write_registry`
2. Se connecter:
   ```bash
   echo $GITLAB_TOKEN | helm registry login registry.gitlab.com -u $GITLAB_USERNAME --password-stdin
   ```

## 📊 Comparaison OCI vs Repository HTTP

| Caractéristique | OCI Registry | HTTP Repository |
|----------------|--------------|-----------------|
| **Hébergement** | Registry standard (Docker Hub, ghcr.io, etc.) | Serveur HTTP statique |
| **Authentication** | Token-based | Pas d'auth par défaut |
| **Versioning** | Tags OCI natifs | index.yaml manuel |
| **Distribution** | Infrastructure existante | Configuration custom |
| **Standard** | OCI standard | Helm-specific |
| **Performance** | Excellente (CDN) | Dépend de l'hébergement |

## 🎯 Registries Recommandés

### 1. GitHub Container Registry (GHCR) - **Recommandé**
- ✅ Gratuit pour repositories publics
- ✅ Intégré avec GitHub Actions
- ✅ Excellent CDN global
- ✅ Pas de limite de bande passante

### 2. Docker Hub
- ✅ Le plus populaire
- ⚠️ Limite de pull pour comptes gratuits
- ✅ Bon CDN

### 3. GitLab Container Registry
- ✅ Intégré avec GitLab CI/CD
- ✅ Gratuit pour repositories publics
- ✅ Bon pour écosystème GitLab

## 📚 Documentation Complète

Pour plus de détails:
- [Guide de Déploiement](../HELM_DEPLOYMENT.md)
- [Documentation du Chart](../helm/ansible-builder/README.md)
- [Helm OCI Documentation](https://helm.sh/docs/topics/registries/)

## 🆘 Support

- **Issues**: https://bitbucket.org/ccoupel/ansible_builder/issues
- **Repository**: https://bitbucket.org/ccoupel/ansible_builder

## 📋 Versions Disponibles

| Version | Date | Description |
|---------|------|-------------|
| 1.1.0 | 2025-11-23 | Version initiale avec persistence et auth |

---

**Note**: Ce chart utilise OCI registry au lieu du repository HTTP traditionnel pour une distribution plus moderne et standardisée.
