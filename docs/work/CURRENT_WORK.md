# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2025-12-21**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `1.12.0` (ghcr.io/ccoupel/ansible-builder-backend:1.12.0) ✅
- **Frontend :** `1.12.0` (ghcr.io/ccoupel/ansible-builder-frontend:1.12.0) ✅
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `v1.12.0`

**Staging (nginx reverse proxy) :**
- **Backend :** `1.12.2-rc.1`
- **Frontend :** `1.12.2-rc.1-vite`
- **URL :** http://192.168.1.217
- **Status :** En test - Nouvelles fonctionnalités

---

## 🔧 **Version en Développement - 1.12.2-rc.1**

### Fonctionnalités implémentées

**Ansible Lint Integration :**
- Validation `ansible-playbook --syntax-check` + `ansible-lint`
- Affichage version Ansible utilisée pour validation
- Issues catégorisées par sévérité (error/warning/info)
- Endpoint `/api/playbooks/validate-full-preview`

**Preview YAML amélioré :**
- Layout 3 colonnes : numéros de lignes | indicateur validation | code
- Surlignage des lignes référencées par les issues de validation
- Couleurs selon sévérité (rouge/orange/bleu)

**Parsing des paramètres corrigé :**
- Extraction correcte du nom (balise `<strong>`)
- Types extraits séparément (string, boolean, dict, path, etc.)
- Aliases et required correctement parsés
- Normalisation des types API → interne (string→str, integer→int, boolean→bool)

**Zone Configuration améliorée :**
- Icônes de types devant chaque attribut
- Boolean → Checkbox
- List avec choices → Multi-select dropdown
- List sans choices → Autocomplete avec chips

---

## 📋 **Prochaines Priorités**

- Phase 3 : Déploiement en production de la version 1.12.2

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

*Dernière mise à jour : 2025-12-21*
