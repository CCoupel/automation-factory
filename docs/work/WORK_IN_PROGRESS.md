# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2026-01-05**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `2.2.1` (ghcr.io/ccoupel/ansible-builder-backend:2.2.1)
- **Frontend :** `2.2.1` (ghcr.io/ccoupel/ansible-builder-frontend:2.2.1)
- **Database :** PostgreSQL 16 (StatefulSet)
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `v2.2.1`
- **Helm Revision :** 102

**Développement Local :**
- Pas de développement en cours

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

- v2.2.1 Système de Thème déployée en production
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

*Dernière mise à jour : 2026-01-05 - v2.2.1 déployée en production*
