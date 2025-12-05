# 📁 Dossier TOOLING

Ce dossier contient tous les outils, scripts et procédures pour le développement et le déploiement d'Ansible Builder.

## 📋 Contenu

### 🔧 Scripts de Déploiement

- **`build-and-deploy-backend-sqlite.ps1`** - Script PowerShell pour builder et déployer le backend avec SQLite
- **`deploy-with-docker-alternatives.ps1`** - Script avec gestion des alternatives Docker (local/distant/podman)
- **`simple-deploy.ps1`** - Script simplifié de déploiement
- **`create-patch-image.sh`** - Script bash pour créer des images patch

### 📝 Documentation et Procédures

- **`PROCEDURE_DEVELOPPEMENT.md`** - **⭐ IMPORTANT** : Procédure complète de développement et versioning
  - Règles de versioning (X.Y.Z_n vs X.Y.Z)
  - Workflow de développement
  - Tests obligatoires
  - Procédure de push externe

- **`CHANGELOG_CODE_2025-12-05.md`** - Détails techniques des modifications du 05/12/2025
  - Fix URLs localhost:8000
  - Support SQLite complet
  - Modifications ligne par ligne

- **`README_SESSION_2025-12-05.md`** - Résumé exécutif de la session du 05/12/2025

### 🔑 Fichiers de Configuration

- **`github_token.txt`** - Token GitHub pour push vers ghcr.io (ne pas commiter!)
- **`kubeconfig.txt`** - Configuration Kubernetes (ne pas commiter!)

## 🚀 Quick Start

### Pour un nouveau développement :

1. Lire **`PROCEDURE_DEVELOPPEMENT.md`** en premier
2. Modifier le code nécessaire
3. Builder avec version _n : `docker build -t ansible-builder-backend:1.3.8_1`
4. Déployer et tester
5. Incrémenter _n pour chaque nouveau build
6. Push vers ghcr.io uniquement sur validation

### Pour déployer :

```bash
# Développement (version _n)
powershell -ExecutionPolicy Bypass -File simple-deploy.ps1

# Production (après validation)
# Suivre PROCEDURE_DEVELOPPEMENT.md section "Push Externe"
```

## ⚠️ Rappels Importants

1. **Ne jamais push vers ghcr.io sans validation explicite**
2. **Toujours utiliser le format X.Y.Z_n en développement**
3. **Tester TOUTES les APIs après chaque déploiement backend**
4. **Docker distant disponible : 192.168.1.217:2375**

---

**Dernière mise à jour :** 2025-12-05