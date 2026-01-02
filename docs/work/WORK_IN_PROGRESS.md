# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2026-01-02**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `2.0.0` (ghcr.io/ccoupel/ansible-builder-backend:2.0.0) ✅
- **Frontend :** `2.0.0` (ghcr.io/ccoupel/ansible-builder-frontend:2.0.0) ✅
- **Database :** PostgreSQL 16 (StatefulSet) ✅
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `v2.0.0`
- **Helm Revision :** 93

**Staging (Docker) :**
- **Backend :** `2.0.0-rc.1`
- **Frontend :** `2.0.0-rc.3-vite`
- **URL :** http://192.168.1.217

---

## ✅ **Version 2.0.0 - Déployée en Production (2026-01-01)**

### Galaxy Roles Integration

**Objectif :** Permettre l'intégration des rôles Ansible Galaxy (standalone v1 et collections v3) dans les playbooks avec support Galaxy privée.

#### Fonctionnalités implémentées

**Backend - Galaxy Roles Service :**
- [x] `galaxy_roles_service.py` : Accès unifié API v1 + v3
- [x] API v1 pour rôles standalone (36,000+ rôles, format author.role_name)
- [x] API v3 pour rôles dans collections (format namespace.collection.role)
- [x] Support Galaxy privée (AAP Automation Hub / Galaxy NG)
- [x] Configuration `GALAXY_PUBLIC_ENABLED` pour désactiver Galaxy publique
- [x] Token-based authentication pour Galaxy privée
- [x] Cache 30 minutes pour listes de rôles

**Backend - Endpoints :**
- [x] `GET /api/galaxy-roles/standalone` : Liste rôles standalone
- [x] `GET /api/galaxy-roles/standalone/{namespace}/{name}` : Détails rôle
- [x] `GET /api/galaxy-roles/collections/{ns}/{coll}/roles` : Rôles d'une collection
- [x] `GET /api/galaxy-roles/config` : Configuration Galaxy

**Frontend - RolesTreeView :**
- [x] Refonte complète avec onglets Standalone/Collections
- [x] Toggle source (Public/Private) si Galaxy privée configurée
- [x] Chargement paresseux des auteurs et rôles
- [x] Recherche dans les rôles
- [x] Drag & drop vers zone de travail

**Frontend - Gestion des rôles dans playbook :**
- [x] Drag & drop rôles depuis palette
- [x] Ajout multiple du même rôle autorisé
- [x] Réordonnancement par drag & drop
- [x] Toggle activer/désactiver rôle (icône œil)
- [x] Style visuel pour rôles désactivés (grisé, barré)
- [x] Configuration des variables par rôle
- [x] Rôles désactivés exclus de la génération YAML

**Frontend - Types et Services :**
- [x] `RoleDefinition` type avec `enabled` property
- [x] `galaxyRolesApiService.ts` : Client API avec cache
- [x] `playbookPreviewService.ts` : Génération YAML avec roles

#### Tests Phase 2 - Staging (2026-01-01)
- [x] Build Docker backend: `ansible-builder-backend:2.0.0-rc.1`
- [x] Build Docker frontend: `ansible-builder-frontend:2.0.0-rc.3-vite`
- [x] Déploiement containers OK
- [x] Health checks passés
- [x] 36,726 rôles standalone disponibles
- [x] Drag & drop rôles fonctionne
- [x] Toggle enabled/disabled fonctionne
- [x] Génération YAML avec roles OK
- [x] Validation utilisateur approuvée

#### Phase 3 - Production (2026-01-01) ✅
- [x] Build images production (backend:2.0.0, frontend:2.0.0)
- [x] Tag images pour ghcr.io
- [x] Push ghcr.io (backend + frontend + latest)
- [x] Mise à jour custom-values.yaml
- [x] Déploiement Kubernetes via Helm (Revision 86)
- [x] Smoke tests passés (HTTP 200, 33ms)
- [x] Version API: 2.0.0, environment: PROD, is_rc: false
- [x] Tag git v2.0.0 créé et pushé

---

## ✅ **Migration PostgreSQL - 2026-01-02**

### Objectif
Remplacer SQLite par PostgreSQL pour une meilleure scalabilité et fiabilité en production.

### Implémentation
- [x] Création template Helm `postgresql-statefulset.yaml` avec initContainer
- [x] Support CloudNativePG (désactivé pour MooseFS) et StatefulSet standard
- [x] Mise à jour helpers pour switch entre CNPG et StatefulSet
- [x] Configuration custom-values.yaml avec credentials sécurisés
- [x] InitContainer pour fixer permissions sur volumes MooseFS
- [x] Correction UID postgres (70 pour postgres:16-alpine)
- [x] Déploiement via Helm (Revision 93)
- [x] Tests inscription/login validés

### Configuration Production
```yaml
postgresql:
  enabled: true
  auth:
    username: ansible
    database: ansible_builder
  storage:
    size: 5Gi
backend:
  env:
    DATABASE_TYPE: "postgresql"
```

---

## 📋 **Prochaines Priorités**

- v2.0.0 Galaxy Roles déployée en production ✅
- PostgreSQL en production ✅
- Voir [BACKLOG.md](BACKLOG.md) pour la roadmap complète

---

## 🔗 **Liens Utiles**

### Environnements
- **Production :** https://coupel.net/ansible-builder
- **Staging :** http://192.168.1.217
- **Docker Host :** 192.168.1.217:2375
- **Registry :** ghcr.io/ccoupel

### Documentation Phases
- [Phase 1 - Développement](../operations/PHASE1_DEVELOPMENT.md)
- [Phase 2 - Intégration](../operations/PHASE2_INTEGRATION.md)
- [Phase 3 - Production](../operations/PHASE3_PRODUCTION.md)

### Historique
- [Réalisations (DONE.md)](DONE.md)
- [Backlog](BACKLOG.md)

---

*Dernière mise à jour : 2026-01-02 - Migration PostgreSQL en production via Helm (Revision 93)*
