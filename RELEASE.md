# Guide de Publication - Ansible Builder

## Vue d'ensemble

Ce document décrit le processus de publication d'une nouvelle version d'Ansible Builder.

## Prérequis

- Docker installé et configuré
- Helm 3.x installé
- Accès au registry GitHub Container Registry (ghcr.io/ccoupel)
- Token GitHub avec permissions `write:packages` (dans `github_token.txt`)

## Processus de publication

### 1. Méthode automatisée (recommandée)

#### Script principal d'orchestration
```powershell
# Windows
.\TOOLING\ansible-builder.ps1 publish 1.2.9

# Linux/macOS  
./TOOLING/ansible-builder.sh publish 1.2.9
```

#### Scripts individuels
```powershell
# Windows
.\TOOLING\publish.ps1 1.2.9

# Linux/macOS
./TOOLING/publish.sh 1.2.9
```

Le script effectue automatiquement :
- Connexion au registry GitHub
- Construction des images Docker (backend et frontend)
- Tag des images avec la version et `latest`
- Push vers ghcr.io/ccoupel
- Mise à jour des versions dans Chart.yaml et values.yaml
- Package du chart Helm

### 2. Méthode manuelle

#### Étape 1 : Connexion au registry
```bash
# Lire le token depuis le fichier
TOKEN=$(grep "token:" github_token.txt | cut -d' ' -f2)

# Se connecter
echo $TOKEN | docker login ghcr.io -u ccoupel --password-stdin
```

#### Étape 2 : Construction et push des images
```bash
# Backend
docker build -t ghcr.io/ccoupel/ansible-builder-backend:1.2.7 ./backend/
docker tag ghcr.io/ccoupel/ansible-builder-backend:1.2.7 ghcr.io/ccoupel/ansible-builder-backend:latest
docker push ghcr.io/ccoupel/ansible-builder-backend:1.2.7
docker push ghcr.io/ccoupel/ansible-builder-backend:latest

# Frontend
docker build -t ghcr.io/ccoupel/ansible-builder-frontend:1.2.7 ./frontend/
docker tag ghcr.io/ccoupel/ansible-builder-frontend:1.2.7 ghcr.io/ccoupel/ansible-builder-frontend:latest
docker push ghcr.io/ccoupel/ansible-builder-frontend:1.2.7
docker push ghcr.io/ccoupel/ansible-builder-frontend:latest
```

#### Étape 3 : Mise à jour des fichiers Helm
1. Éditer `helm/ansible-builder/Chart.yaml` :
   - `version: 1.2.7`
   - `appVersion: "1.2.7"`

2. Éditer `helm/ansible-builder/values.yaml` :
   - `backend.image.tag: "1.2.7"`
   - `frontend.image.tag: "1.2.7"`

#### Étape 4 : Package du chart
```bash
helm package helm/ansible-builder/ -d helm/packages/
```

## Déploiement

### Déploiement sur Kubernetes

#### Avec les scripts TOOLING
```powershell
# Windows - Déploiement seul
.\TOOLING\ansible-builder.ps1 deploy

# Windows - Publication + Déploiement
.\TOOLING\ansible-builder.ps1 full 1.2.9

# Linux/macOS
./TOOLING/ansible-builder.sh deploy
```

#### Commande Helm manuelle
```bash
helm upgrade --install ansible-builder ./helm/ansible-builder/ \
  --namespace ansible-builder \
  --create-namespace \
  -f custom-values.yaml
```

### Vérification du déploiement
```bash
# Vérifier les pods
kubectl get pods -n ansible-builder

# Vérifier les services
kubectl get svc -n ansible-builder

# Voir les logs
kubectl logs -n ansible-builder -l app.kubernetes.io/name=ansible-builder-backend
kubectl logs -n ansible-builder -l app.kubernetes.io/name=ansible-builder-frontend
```

## Post-publication

1. **Commit des changements**
   ```bash
   git add -A
   git commit -m "chore: bump version to 1.2.7"
   ```

2. **Créer un tag Git**
   ```bash
   git tag v1.2.7
   ```

3. **Pousser vers le repository**
   ```bash
   git push
   git push --tags
   ```

## Structure des versions

- **Chart version** : Version du chart Helm (ex: 1.2.7)
- **App version** : Version de l'application (identique à la chart version)
- **Image tags** : Tags Docker (version + latest)

## Registry GitHub Container

Les images sont publiées sur :
- Backend : `ghcr.io/ccoupel/ansible-builder-backend`
- Frontend : `ghcr.io/ccoupel/ansible-builder-frontend`

## Troubleshooting

### Erreur de connexion au registry
- Vérifier que le token GitHub a les permissions `write:packages`
- S'assurer que le fichier `github_token.txt` est présent et correctement formaté

### Erreur de build Docker
- Vérifier que Docker est en cours d'exécution
- S'assurer d'être à la racine du projet

### Erreur Helm
- Vérifier la syntaxe YAML avec `helm lint helm/ansible-builder/`
- Utiliser `--debug` pour plus d'informations

## Changelog

### v1.2.7
- Fix: Utilisation d'URLs relatives pour l'API (`./api` au lieu de `localhost`)
- Amélioration de la compatibilité avec les reverse proxy et différents base paths