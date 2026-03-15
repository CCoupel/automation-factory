# Travail en Cours - Automation Factory

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2026-03-14**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `2.3.0` (ghcr.io/ccoupel/automation-factory-backend:2.3.0)
- **Frontend :** `2.3.5` (ghcr.io/ccoupel/automation-factory-frontend:2.3.5)
- **Database :** PostgreSQL 16 (StatefulSet)
- **URL :** https://coupel.net/automation-factory
- **Tag Git :** `v2.3.0`
- **Helm Revision :** 111

**Staging :**
- **Version :** `2.3.6-rc.1`
- **Phase :** Phase 2 - Intégration (pr7-rc8 déployé et validé)
- **URL :** http://192.168.1.217

**Branche `integration` :**
- **Version :** `2.3.6-rc.1`
- **PR #7 mergée** : feat: Add YAML parser service (9 commits, 14 fichiers, +1843 lignes)

---

## 🔧 **Version 2.3.6 - Intégrée (branche `integration`)**

### Bugfix - Synchronisation Collaborative Variables & Rôles

**Problèmes corrigés :**
- L'ajout de variables ne se propageait pas aux autres participants
- L'ajout de rôles ne se propageait pas aux autres participants

**Modifications :**
- Ajout des types `variable_add`, `variable_delete` dans useCollaborationSync
- Ajout des types `role_add`, `role_delete`, `role_update` dans useCollaborationSync
- Appels de synchronisation dans tous les handlers de variables et rôles
- Handlers dans `applyCollaborationUpdate` pour traiter les nouveaux types

### Feature - YAML Parser Service (PR #7 - Mergée)

**Fonctionnalités :**
- Backend `POST /api/yaml/parse` : parsing YAML Ansible vers structure interne
- Frontend import fichiers .yml/.yaml via dialog
- Import d'archives ZIP avec découverte de playbooks et rôles
- Résolution des `include_tasks` / `import_tasks` dans les archives
- Résolution des `vars_files` depuis le contexte archive
- Résolution des `import_playbook` avec détection de cycles
- Parsing des rôles en playbooks synthétiques (tasks, handlers, defaults, vars, meta)
- Chargement des `group_vars` / `host_vars` dans les métadonnées
- Dialog frontend multi-étapes (upload, sélection, résultat)

**Bugfixes inclus (7) :**
- Liens enfants dans les blocks YAML
- IDs mini-START manquants (START→block[0])
- Récursivité liens blocks
- Taille blocks / positionnement au contenu
- Hauteur sections block non calculée dynamiquement
- Containers sections : hauteur dynamique par section + overflow scroll
- Parité rendu nested blocks vs parent blocks

**Status des tests :**
- ✅ 207 backend tests (pytest)
- ✅ 187 frontend tests (Vitest)

### 🔧 Suivi à faire

- [ ] Tooltip toolbar "Import diagram (.abd)" à mettre à jour pour refléter le support YAML

---

## 📋 **Prochaine Version Majeure - 2.4.0**

### Architecture Event Sourcing

Refonte complète du système collaboratif :
- Backend comme autorité unique (server-authoritative)
- Journal des événements avec persistance
- Sauvegarde automatique (plus de bouton Save)
- Undo/Redo natif
- Timeline et rattrapage automatique

Voir [EVENT_SOURCING_SPEC.md](../core/EVENT_SOURCING_SPEC.md) pour la spécification complète.

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
- 🔥 **[#20 - Event Sourcing v2.4.0](https://github.com/CCoupel/automation-factory/issues/20)** — Next priority

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

*Dernière mise à jour : 2026-03-14 - v2.3.6-rc.1 PR #7 mergée dans integration*
