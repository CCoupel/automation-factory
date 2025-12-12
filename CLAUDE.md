Session_id: 767f34c1-c453-4c33-b9a2-e8eaf2d2fa45

# Guide Claude - Ansible Builder

Ce document est l'index principal pour les futures instances de Claude travaillant sur ce projet. Il contient les liens vers toute la documentation technique organisée.

---

## 🚀 **Status Actuel**

**Version Développement :** Backend 1.8.0_2 / Frontend 1.8.0_2  
**Version Production :** Backend 1.5.0_3 / Frontend 1.6.5  
**URL Production :** https://coupel.net/ansible-builder  
**URL Développement :** http://192.168.1.217:80  
**Dernière mise à jour :** 2025-12-08

## 📚 **Documentation Organisée**

### 🎯 **Documentation Projet**
- **[Vue d'Ensemble](docs/core/PROJECT_OVERVIEW.md)** - Description du projet et objectifs
- **[Décisions Architecture](docs/core/ARCHITECTURE_DECISIONS.md)** - Choix techniques importants
- **[Process Développement](docs/core/DEVELOPMENT_PROCESS.md)** - Méthodologie et phases

### 💻 **Documentation Frontend**
- **[Spécifications Frontend](docs/frontend/FRONTEND_SPECS.md)** - Interface utilisateur et fonctionnalités
- **[Implémentation Frontend](docs/frontend/FRONTEND_IMPLEMENTATION.md)** - Détails techniques React/TypeScript
- **[Optimisations Frontend](frontend/docs/README_OPTIMISATION.md)** - Refactoring et optimisations

### ⚙️ **Documentation Backend**
- **[Spécifications Backend](docs/backend/BACKEND_SPECS.md)** - APIs, architecture et modèles de données
- **[Implémentation Backend](docs/backend/BACKEND_IMPLEMENTATION.md)** - Détails techniques FastAPI/Python
- **[Intégration Galaxy](docs/backend/GALAXY_INTEGRATION.md)** - Service Galaxy API SMART

### 🚀 **Documentation Opérations**
- **[Guide Déploiement](docs/operations/DEPLOYMENT_GUIDE.md)** - Docker, Kubernetes, environnements
- **[Stratégie Tests](docs/operations/TESTING_STRATEGY.md)** - Tests unitaires et intégration
- **[Dépannage](docs/operations/TROUBLESHOOTING.md)** - Guide de résolution des problèmes

### 📋 **Travail en Cours**
- **[Session Actuelle](docs/work/CURRENT_WORK.md)** - Versions, features, bugs en cours
- **[Métriques Performance](docs/work/PERFORMANCE_METRICS.md)** - Mesures et optimisations

---

## 🛠️ **Quick Start pour Claude**

1. **Nouvelle session :** Lire `docs/work/CURRENT_WORK.md` pour l'état actuel
2. **Nouvelle feature :** Consulter `docs/core/DEVELOPMENT_PROCESS.md`
3. **Problème technique :** Vérifier `docs/operations/TROUBLESHOOTING.md`
4. **Questions architecture :** Voir `docs/core/ARCHITECTURE_DECISIONS.md`

## 📋 **Règles de Versioning**

**Format :** `X.Y.Z_n`
- **X** : Structure base de données
- **Y** : Nouvelle fonctionnalité  
- **Z** : Bugfix
- **n** : Build incrémental (développement uniquement)

**Phases :**
- **Phase 1** : Développement avec version `_n` 
- **Phase 2** : Intégration et production (suppression `_n`)

---

## 🎯 **Contact Points**

**URLs :**
- **Production :** https://coupel.net/ansible-builder
- **Docker Host :** 192.168.1.217:2375
- **Registry :** ghcr.io/ccoupel

**Configuration :**
- **Kubeconfig :** kubeconfig.txt
- **GitHub Token :** github_token.txt
- **Custom Values :** custom-values.yaml

---

*Ce fichier est maintenu automatiquement. Pour les détails techniques, consultez la documentation spécialisée ci-dessus.*