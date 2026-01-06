# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2026-01-06**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `2.2.1` (ghcr.io/ccoupel/ansible-builder-backend:2.2.1)
- **Frontend :** `2.2.1` (ghcr.io/ccoupel/ansible-builder-frontend:2.2.1)
- **Database :** PostgreSQL 16 (StatefulSet)
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `v2.2.1`
- **Helm Revision :** 102

**Développement / Staging :**
- **Version :** `2.3.0-rc.1`
- **Phase :** Phase 2 - Intégration (en cours)
- **Feature :** Galaxy Admin Configuration

---

## 🚧 **Version 2.3.0 - EN COURS**

### Galaxy Admin Configuration - Phase 2 Intégration

**Objectif :** Permettre aux administrateurs de configurer les sources Galaxy via l'interface web.

**Fonctionnalités :**
- Toggle pour activer/désactiver Galaxy publique
- Liste configurable de Galaxy privées (multi-sources)
- Stockage en base de données avec rechargement à chaud
- Chiffrement Fernet (AES) pour les tokens
- Test de connexion avec indicateurs de statut
- Drag & drop pour réordonner les priorités

**Phase 1 - Développement : ✅ VALIDÉE**
- Tests unitaires : Passés
- Tests API : 8/8 ✅
- Tests Chrome : 13/13 ✅
- Linting : 0 erreurs

**Phase 2 - Intégration : 🚧 EN COURS**
- [ ] Build Docker backend image
- [ ] Build Docker frontend image
- [ ] Deploy to staging (192.168.1.217)
- [ ] Health checks
- [ ] E2E tests
- [ ] User validation

**Fichiers créés (Backend) :**
- `backend/app/utils/encryption.py` - Fernet encryption
- `backend/app/models/galaxy_source.py` - SQLAlchemy model
- `backend/app/schemas/galaxy_source.py` - Pydantic schemas
- `backend/app/services/galaxy_source_service.py` - Service CRUD + cache
- `backend/app/api/endpoints/galaxy_sources.py` - Admin endpoints

**Fichiers créés (Frontend) :**
- `frontend/src/services/galaxySourceService.ts` - API service
- `frontend/src/components/admin/GalaxySourcesTab.tsx` - Admin list
- `frontend/src/components/admin/GalaxySourceDialog.tsx` - Add/Edit dialog

**Fichiers modifiés :**
- `backend/app/main.py` - Init defaults + cache startup
- `backend/app/api/router.py` - Include galaxy_sources router
- `backend/app/services/galaxy_roles_service.py` - Use DB sources
- `frontend/src/components/dialogs/ConfigurationDialog.tsx` - Add tab

---

## ✅ **Version 2.2.1 - DEPLOYED**

### Système de Thème 3 États - Complété

**Fonctionnalités livrées :**
- Modes Light/Dark/System avec détection préférence OS
- Zone des onglets adaptée au thème (dark mode fix)
- Page de login isolée du thème (toujours claire)
- Persistance du choix utilisateur en localStorage

**Architecture :**
- ThemeContext avec 3 états et listeners système
- Couleurs thématiques (background.paper, divider)
- ThemeProvider local pour isoler LoginPage

Voir détails dans [DONE.md](DONE.md#version-221---2026-01-05)

---

## 📋 **Prochaines Priorités**

- v2.3.0 Galaxy Admin Configuration en cours de validation
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

*Dernière mise à jour : 2026-01-06 - v2.3.0-rc.1 Phase 2 en cours*
