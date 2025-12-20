# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Version 1.12.0 - Phase 3 Production**

**Status :** 🔄 Déploiement production en cours
**Objectif :** Transposition complète des éléments de configuration vers le playbook YAML + Amélioration réactivité UI

### Fonctionnalités à déployer
- **moduleParameters** : Paramètres de module transposés vers YAML (corrigé: utilise moduleParameters au lieu de config)
- **remote_user** : Attribut PLAY transposé vers YAML
- **connection** : Attribut PLAY transposé vers YAML
- **tags** : Champ tags connecté et transposé vers YAML
- **Réactivité UI améliorée** : État local + debounce (300ms) pour tous les champs de configuration
- **Design unifié** : Tous les champs booléens utilisent des checkboxes (PLAY et Task)

### Environnement cible
- **URL :** https://coupel.net/ansible-builder
- **Version :** 1.12.0

### Phase 2 - Résultats (RC validée)
| Test | Résultat |
|------|----------|
| TypeScript build | ✅ OK |
| API tests | ✅ OK |
| E2E Staging | ✅ OK |
| Validation utilisateur | ✅ Approuvée |

---

## 🚀 **Status Actuel - 2025-12-20**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `1.11.0` (ghcr.io/ccoupel/ansible-builder-backend:1.11.0)
- **Frontend :** `1.11.0` (ghcr.io/ccoupel/ansible-builder-frontend:1.11.0)
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `v1.11.0`

**Staging (nginx reverse proxy) :**
- **URL :** http://192.168.1.217
- **Version :** 1.12.0-rc.5 ✅ Validée
- **Status :** Prêt pour production

---

## 📋 **Prochaines Priorités**

*Phase 3 en cours - déploiement production*

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
