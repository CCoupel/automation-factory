# Travail en Cours - Automation Factory

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2026-03-20**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `2.3.0` (ghcr.io/ccoupel/automation-factory-backend:2.3.0)
- **Frontend :** `2.3.5` (ghcr.io/ccoupel/automation-factory-frontend:2.3.5)
- **Database :** PostgreSQL 16 (StatefulSet)
- **URL :** https://coupel.net/automation-factory
- **Tag Git :** `v2.3.0`
- **Helm Revision :** 111

**Staging :**
- **Version :** `2.4.1-rc.1`
- **Phase :** Phase 2 - Intégration
- **URL :** http://192.168.1.217

**Branche `integration` :**
- **Version :** `2.4.1`
- **Bugfix nginx cache 304 sur login page**

---

## 🔧 **Hotfixes 2.3.1 à 2.3.5**

### Frontend Hotfixes (Backend reste 2.3.0)

| Version | Issue | Fix |
|---------|-------|-----|
| 2.3.1 | Double URL prefix `/api/automation-factory/api/...` | Suppression `${getApiBaseUrl()}` dans services |
| 2.3.2 | WebSocket URL sans base path | Ajout détection base path dans `usePlaybookWebSocket.ts` |
| 2.3.3 | Pas de location /ws dans nginx | Ajout location `/ws` dans `nginx.conf` |
| 2.3.4 | Rewrite rules manquantes (sed Alpine) | Placeholders dans nginx.conf pour compatibilité BusyBox |

---

## ✅ **Version 2.3.0 - DEPLOYED**

### Galaxy Admin Configuration - Complété

**Fonctionnalités livrées :**
- Interface d'administration Galaxy Sources
- Toggle pour activer/désactiver Galaxy publique
- Liste configurable de Galaxy privées (multi-sources)
- Chiffrement Fernet (AES) pour les tokens
- Test de connexion avec indicateurs de statut
- Drag & drop pour réordonner les priorités

**UX Améliorations :**
- Elements zone : Tabs GENERIC/MODULES cachés quand Roles actif
- Nouveaux éléments Generic : import_role, include_role
- Drop d'un rôle dans Tasks → création auto include_role

Voir détails dans [DONE.md](DONE.md#version-230---2026-01-09)

---

## 📋 **Prochaines Priorités**

- 📋 **[→ GitHub Issues](https://github.com/CCoupel/automation-factory/issues)** — Roadmap complète (backlog migré)

---

## 🔗 **Liens Utiles**

### Environnements
- **Production :** https://coupel.net/automation-factory
- **Staging :** http://192.168.1.217
- **Docker Host :** 192.168.1.217:2375
- **Registry :** ghcr.io/ccoupel

### Documentation Phases
- [Phase 1 - Développement](../operations/PHASE1_DEVELOPMENT.md)
- [Phase 2 - Intégration](../operations/PHASE2_INTEGRATION.md)
- [Phase 3 - Production](../operations/PHASE3_PRODUCTION.md)

### Historique & Roadmap
- [Réalisations (DONE.md)](DONE.md)
- [Backlog → GitHub Issues](https://github.com/CCoupel/automation-factory/issues)

---

*Dernière mise à jour : 2026-03-20 - v2.4.1 bugfix nginx cache 304*
