# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement, les versions et l'avancement de la session courante.

---

## 🚀 **Status Actuel - 2025-12-15**

### Versions Déployées
**Production (K8s) :**
- **Backend :** `1.9.0` (ghcr.io/ccoupel/ansible-builder-backend:1.9.0) ✅ **DEPLOYED**
- **Frontend :** `1.9.0` (ghcr.io/ccoupel/ansible-builder-frontend:1.9.0) ✅ **DEPLOYED**
- **URL :** https://coupel.net/ansible-builder
- **Status :** ✅ **v1.9.0 LIVE** - Module Parameter Collection feature

**Staging (nginx reverse proxy) :**
- **Backend :** `1.10.0_12` (ansible-builder-backend:1.10.0_12)
- **Frontend :** `1.10.0_12-vite` (ansible-builder-frontend:1.10.0_12-vite)
- **URL :** http://192.168.1.217
- **Status :** ✅ Phase 2 - Ansible Documentation Integration

**Développement :**
- **Phase 1** : ✅ Build et test local sur 192.168.1.217
- **Phase 2** : ✅ Déploiement staging validé
- **Phase 3** : 🔜 En attente validation utilisateur

---

## ✅ **Version 1.10.0 - En Cours (Phase 2)**

### Fonctionnalité Majeure : Intégration Documentation Ansible
**Status :** ✅ **Implémentation complète - Staging déployé**

#### Objectif
Remplacement de l'architecture Galaxy API par le web scraping direct de la documentation officielle Ansible pour une couverture complète et à jour des collections et modules.

#### Backend v1.10.0_12
- **Service ansible_collections_service.py :** Web scraping de docs.ansible.com
  - Parsing des namespaces depuis la page index collections
  - Parsing des collections par namespace (lazy loading)
  - Parsing des modules par collection
  - Parsing des schémas de paramètres modules
- **Service ansible_versions_service.py :** Détection dynamique des versions
  - Scraping des versions disponibles depuis docs.ansible.com
  - Validation des URLs de documentation
  - Cache 24h avec fallback
- **API Endpoints `/api/ansible/*` :**
  - `GET /versions` - Versions Ansible disponibles
  - `GET /{version}/namespaces` - 54 namespaces détectés
  - `GET /{version}/namespaces/{ns}/collections` - Collections dynamiques
  - `GET /{version}/namespaces/{ns}/collections/{coll}/modules` - Modules
  - `GET /{version}/namespaces/{ns}/collections/{coll}/modules/{mod}/schema` - Schéma paramètres
- **Cache intelligent :**
  - Versions : 24h TTL
  - Collections : 1h TTL
  - Modules : 30min TTL
  - Schémas : 1h TTL

#### Frontend v1.10.0_12
- **ansibleApiService.ts :** Nouveau service API Ansible
  - Interface avec les nouveaux endpoints `/api/ansible/*`
  - Fallback data pour mode hors-ligne
  - Gestion des versions Ansible
- **useAnsibleVersions hook :** Gestion état versions
- **VersionSelector dans AppHeader :** Sélection version Ansible centralisée
- **ModulesZoneCached.tsx :** Corrections DOM nesting
  - Fix `<button>` dans `<button>` (AccordionSummary)
  - Fix `<div>` dans `<p>` (ListItemText secondary)
  - Fallback values pour `total_downloads` et `collection_count`
- **ConfigZone.tsx :** Fix DOM nesting IconButton

#### Corrections Bugs (builds _1 à _12)
- `_2` : Suppression VersionSelector redondant dans ModulesZone
- `_3-_4` : Migration `/api/galaxy/*` → `/api/ansible/*`
- `_5` : Ajout fallback namespaces quand backend vide
- `_6` : Fix propriétés manquantes `collection_count`, `total_downloads`
- `_7` : Séparation correcte namespaces/collections
- `_8` : Ajout interface `AnsibleCollectionObject`
- `_9` : Fix DOM nesting `<button>` dans AccordionSummary
- `_10` : Fix DOM nesting `<div>` dans `<p>` ListItemText
- `_11` : Fallback values pour propriétés undefined
- `_12` : Backend scraping documentation Ansible fonctionnel

#### Résultats
- **54 namespaces** détectés depuis Ansible 13 docs
- **Collections dynamiques** par namespace (ex: community = 24 collections)
- **Parsing HTML robuste** avec regex patterns
- **Architecture scalable** pour futures versions Ansible

---

## ✅ **Version 1.9.0 - Complétée (Production)**

### Fonctionnalité : Collecte Paramètres Modules
**Status :** ✅ **Déployé en production**

#### Points clés
- Galaxy API v3 docs-blob pour schémas modules
- Interface configuration avec help tooltips
- Support tous types paramètres
- Phase 2 nginx reverse proxy architecture

---

## 🔧 **Architecture Documentation Ansible**

### Structure Web Scraping
```
docs.ansible.com/projects/ansible/{version}/collections/
├── index.html → Liste namespaces (amazon/, ansible/, community/, ...)
├── {namespace}/
│   ├── index.html → Liste collections (aws/, general/, ...)
│   └── {collection}/
│       ├── index.html → Liste modules
│       └── {module}_module.html → Documentation + paramètres
```

### Endpoints API
```
/api/ansible/versions                                    → Versions disponibles
/api/ansible/{version}/namespaces                        → 54 namespaces
/api/ansible/{version}/namespaces/{ns}/collections       → Collections namespace
/api/ansible/{version}/namespaces/{ns}/collections/{c}/modules → Modules
/api/ansible/{version}/namespaces/{ns}/collections/{c}/modules/{m}/schema → Paramètres
```

### Cache Strategy
| Donnée | TTL | Raison |
|--------|-----|--------|
| Versions | 24h | Stable, change rarement |
| Namespaces | 1h | Nouveau namespace rare |
| Collections | 1h | Nouvelles collections rares |
| Modules | 30min | Updates plus fréquents |
| Schémas | 1h | Documentation stable |

---

## 📊 **Métriques v1.10.0**

### Couverture Ansible 13
- **Namespaces :** 54 (vs 12 fallback précédent)
- **Collections :** Dynamique par namespace
- **Sources :** docs.ansible.com officiel

### Performance Staging
- **Scraping initial :** ~2-3s par page
- **Cache hit :** <100ms
- **Frontend load :** Immédiat avec fallback

---

## 🏗️ **Architecture Phase 2 - nginx reverse proxy**

```
nginx (port 80) → Point d'entrée unique
├── / → frontend (Vite dev server, port 5173)
└── /api/* → backend (FastAPI, port 8000)
```

**Images :**
```bash
ansible-builder-backend:1.10.0_12
ansible-builder-frontend:1.10.0_12-vite
```

---

## 🎯 **Prochaines Étapes**

### Phase 3 Production (optionnel)
1. Tests complets fonctionnalités
2. Suppression suffixes `_n` des versions
3. Push images vers ghcr.io
4. Déploiement Kubernetes

### Améliorations Futures
1. Cache persistant Redis pour scraping
2. Pre-fetch collections populaires
3. Search full-text modules
4. Historique versions modules

---

## 🔗 **Environnements Actifs**

### URLs
- **Production :** https://coupel.net/ansible-builder (v1.9.0)
- **Staging :** http://192.168.1.217 (v1.10.0_12)

### Configuration
- **Docker Host :** 192.168.1.217:2375
- **Registry :** ghcr.io/ccoupel (pour phase 3)

---

*Document maintenu en temps réel. Dernière mise à jour : 2025-12-15 14:35*

*Phase 2 complète v1.10.0 - Ansible Documentation Integration*
