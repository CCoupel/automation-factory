# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement, les versions et l'avancement de la session courante.

---

## 🚀 **Status Actuel - 2025-12-20**

### Versions Déployées
**Production (K8s) :**
- **Backend :** `1.10.0` (ghcr.io/ccoupel/ansible-builder-backend:1.10.0)
- **Frontend :** `1.10.0` (ghcr.io/ccoupel/ansible-builder-frontend:1.10.0)
- **URL :** https://coupel.net/ansible-builder
- **Status :** ⏳ **v1.11.0 prête pour déploiement**

**Staging (nginx reverse proxy) :**
- **Backend :** `1.11.0_9` (ansible-builder-backend:1.11.0_9)
- **Frontend :** `1.11.0_9-vite` (ansible-builder-frontend:1.11.0_9-vite)
- **URL :** http://192.168.1.217
- **Status :** ✅ Testé et validé

**Développement :**
- **v1.10.0** : ✅ En production
- **v1.11.0** : ✅ **Phase 2 terminée** - Prêt pour Phase 3 (production)

---

## ✅ **Version 1.11.0 - Prête pour Production**

### Fonctionnalité : Génération YAML Preview & Validation

**Status :** ✅ **Phase 2 terminée** - En attente déploiement production

#### Fonctionnalités Implémentées

1. **Génération YAML temps réel**
   - Conversion structure JSON → YAML Ansible valide
   - Support complet des sections (pre_tasks, tasks, post_tasks, handlers)
   - Support des blocks imbriqués (block/rescue/always)
   - Ordre des tâches selon les connexions

2. **Validation Playbook**
   - Validation syntaxique en temps réel
   - Affichage erreurs (rouge) et warnings (orange)
   - Coloration des onglets selon status

3. **Interface utilisateur améliorée**
   - Rafraîchissement après sauvegarde (plus de polling 2s)
   - Onglet Preview : vert (succès) / rouge (erreur)
   - Onglet Validation : vert (valide) / orange (warnings) / rouge (erreurs)
   - Avatar utilisateur : vert (authentifié) / rouge (erreur credentials)
   - Bouton Download YAML

4. **Gestion des liens rationalisée**
   - Règle universelle : 1 lien entrant max, 1 lien sortant max par type
   - Chaîne linéaire garantie (A → B → C)
   - Ordre des tâches préservé dans le YAML

5. **Code rationalisé**
   - Fonction unifiée `convertToAnsibleTask()` pour modules et blocks
   - Récursivité pour blocks imbriqués
   - Suppression code dupliqué

#### Architecture Backend
```
services/
├── playbook_yaml_service.py     # Génération YAML Ansible
└── ...
```

#### Architecture Frontend
```
services/
├── playbookPreviewService.ts    # Preview et validation API
│   ├── convertToAnsibleTask()   # Conversion unifiée
│   ├── buildBlockTask()         # Blocks avec sections
│   ├── convertTaskIds()         # Liste de tâches
│   └── getTasksForSection()     # Traversée liens
└── ...
```

#### Endpoints API
```
POST /api/playbooks/preview           # Preview temps réel
POST /api/playbooks/validate-preview  # Validation temps réel
GET  /api/playbooks/{id}/yaml         # YAML playbook sauvegardé
POST /api/playbooks/{id}/validate     # Validation playbook sauvegardé
```

---

## ✅ **Version 1.10.0 - En Production**

### Fonctionnalité : Intégration Documentation Ansible
**Status :** ✅ **Déployé en production**

#### Points clés
- Web scraping docs.ansible.com pour données modules
- API unique `/api/ansible/*`
- Cache automatique 24h avec notifications SSE
- Refactorisation majeure (~5500 lignes supprimées)

---

## 🔗 **Environnements Actifs**

### URLs
- **Production :** https://coupel.net/ansible-builder (v1.10.0)
- **Staging :** http://192.168.1.217 (v1.11.0_9)

### Configuration
- **Docker Host :** 192.168.1.217:2375
- **Registry :** ghcr.io/ccoupel

---

*Document maintenu en temps réel. Dernière mise à jour : 2025-12-20*

*v1.11.0 prête pour déploiement production*
