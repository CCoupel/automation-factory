# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2026-01-09**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `2.3.0` (ghcr.io/ccoupel/ansible-builder-backend:2.3.0)
- **Frontend :** `2.3.1` (ghcr.io/ccoupel/ansible-builder-frontend:2.3.1)
- **Database :** PostgreSQL 16 (StatefulSet)
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `v2.3.0`
- **Helm Revision :** 104

**Développement / Staging :**
- **Version :** `2.3.1`
- **Phase :** Idle (prêt pour prochaine feature)

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

*Dernière mise à jour : 2026-01-09 - v2.3.0 Production deployed*
