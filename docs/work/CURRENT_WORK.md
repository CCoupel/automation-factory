# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2025-12-20**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `1.12.0` (ghcr.io/ccoupel/ansible-builder-backend:1.12.0) ✅
- **Frontend :** `1.12.0` (ghcr.io/ccoupel/ansible-builder-frontend:1.12.0) ✅
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `v1.12.0`

**Staging (nginx reverse proxy) :**
- **URL :** http://192.168.1.217
- **Status :** Synchronisé avec production

---

## 📋 **Prochaines Priorités**

*En attente de nouvelles demandes utilisateur*

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

*Dernière mise à jour : 2025-12-20*
