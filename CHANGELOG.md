# Changelog - Ansible Builder

Ce fichier documente tous les changements notables apportés au projet Ansible Builder.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.3.6] - 2026-03-14

### ✨ Nouvelles fonctionnalités
- **YAML Parser Service:** Nouvel endpoint `POST /api/yaml/parse` pour parsing YAML Ansible
  - Support fichiers YAML simples (.yml/.yaml)
  - Support archives ZIP avec découverte playbooks et rôles
  - Résolution include_tasks, import_tasks, vars_files, import_playbook
  - Parsing rôles en playbooks synthétiques
  - Chargement group_vars / host_vars
- **Frontend YAML Import:** Import fichiers .yml/.yaml via dialog multi-étapes
  - Service yamlImportService.ts
  - Support YAML dans ImportPlaybookDialog

### 🛠️ Corrections
- **Blocks YAML:** Liens enfants correctement créés dans les blocks
- **Mini-START IDs:** Lien START→block[0] manquant corrigé
- **Récursivité blocks:** Liens récursifs dans blocks imbriqués
- **Sizing blocks:** Taille et positionnement adaptés au contenu
- **Hauteur sections:** Calcul dynamique hauteur sections block
- **Sections overflow:** Hauteur dynamique par section + overflow scroll
- **Nested blocks:** Parité rendu nested blocks vs parent blocks
- **Collaboration variables:** Synchronisation variable_add / variable_delete
- **Collaboration rôles:** Synchronisation role_add / role_delete / role_update

### 📊 Métriques
- Tests: pytest 207/207, Vitest 187/187
- 9 commits, 14 fichiers, +1843 lignes

---

## [1.8.1] - 2025-12-12

### ✨ Nouvelles fonctionnalités
- **About Dialog:** Boîte "About" dans le menu utilisateur
  - Affichage des versions Frontend/Backend/Environment
  - Changelog intégré des fonctionnalités récentes
  - Informations utilisateur connecté avec badge admin
- **Configuration Admin:** Page de configuration pour les administrateurs
  - Gestion des namespaces standards configurables
  - Remplacement de la liste hardcodée `['community']`
  - Interface d'ajout/suppression avec validation
  - API backend sécurisée `/api/admin/configuration`
- **Chargement dynamique:** Standard namespaces depuis configuration
  - ModulesZoneCached intègre maintenant les namespaces configurés
  - Fallback gracieux pour utilisateurs non-admin
  - Combinaison namespaces standards + favoris utilisateur

### 🎨 Interface optimisée
- **Menu utilisateur:** Ajout entrée "About" avec icône Info
- **Menu admin:** Entrée "Configuration" visible pour les admins uniquement
- **Versions épurées:** 
  - Suppression versions du header principal (page travail)
  - Conservation versions sur page de login pour info technique
  - Versions détaillées disponibles dans About sur demande

### 🛠️ Corrections
- **API routing:** Fix double `/api` dans appels backend version
- **Import fixes:** Correction `app.schemas.user` → `app.models.user`
- **Docker compose:** Correction port mapping 5173→5180 pour Phase 1

### 🔧 Améliorations techniques
- **Stockage configuration:** File-based storage `/tmp/admin_configuration.json`
- **Sécurité:** Endpoints admin protégés par `get_current_admin`
- **Validation:** Contrôle format namespaces (regex + nettoyage)
- **State management:** Gestion d'état pour configuration + favoris

---

## [1.8.0] - 2025-12-12

### ✨ Nouvelles fonctionnalités
- **Favoris utilisateur:** Système complet de gestion des namespaces favoris
  - API REST `/api/user/favorites` pour GET/POST/DELETE
  - Stockage persistant des favoris par utilisateur
  - Interface avec étoiles cliquables pour marquer/démarquer
- **Onglet FAVORITE:** Remplace l'ancien onglet "Popular"
  - Combine namespaces standards + favoris utilisateur
  - Compteur dynamique du nombre total de favoris
  - Mise à jour en temps réel lors des modifications

### 🔄 Changements
- **UI/UX:** Renommage "Popular" → "FAVORITE" dans ModulesZoneCached
- **Standards:** Réduction des namespaces standards à `['community']` uniquement
  - Précédemment: community, ansible, redhat, kubernetes, google, amazon
  - Maintenant: community seulement (extensible via future page admin)
- **Version management:** Séparation complète frontend/backend
  - Frontend sert sa propre version via `/version`
  - Backend sert sa version via `/api/version`
  - Injection automatique version depuis package.json dans nginx

### 🛠️ Corrections
- **Docker builds:** Ajout directives `build:` dans docker-compose.yml
- **Version display:** Fix injection version frontend dans nginx.conf
- **Cache issues:** Nettoyage complet et rebuild pour versions cohérentes
- **Backend routing:** Inclusion correcte module user_favorites

### 🔧 Améliorations
- **Performance:** Chargement asynchrone des favoris au démarrage
- **State management:** Gestion d'état optimisée pour favoris + cache
- **Error handling:** Meilleure gestion des erreurs API favoris
- **Developer experience:** Build directives explicites évitant les pull errors

### 📚 Documentation
- **Future features:** Page administration pour définir namespaces standards
- **API documentation:** Endpoints favoris documentés
- **Deployment:** Process phase 1 (dev) → phase 2 (prod) clarifié

---

## [1.8.0_2] - 2025-12-08

### 🛠️ Corrections
- **Frontend:** Fix erreur JavaScript `Cannot read properties of undefined (reading 'version')`
- **AppHeader:** Ajout vérification conditionnelle robuste avec optional chaining
- **Versions:** Synchronisation backend 1.8.0_2 et frontend 1.8.0_2

### 🔧 Améliorations
- **UI:** Affichage versions plus fiable après authentification
- **Error handling:** Meilleure gestion des états de chargement des versions

---

## [1.8.0_1] - 2025-12-08

### ✨ Nouvelles fonctionnalités
- **Gestion versions:** Endpoint unifié `/version` retournant versions frontend + backend
- **AppHeader:** Affichage versions en temps réel (coin supérieur droit)
- **Gestion favoris:** Interface utilisateur pour sélection namespaces favoris
- **API Favoris:** Endpoints backend pour persistance favoris utilisateur

### 🔄 Changements
- **UI:** Changement "Popular" → "Favorites" dans ModulesZone
- **Navigation:** Boutons étoiles visibles pour sélection favoris
- **Backend:** API `/api/favorites` avec stockage fichier JSON simple

### 🛠️ Corrections
- **AuthContext:** Fix URLs hardcodées localhost:8000 → URLs relatives
- **Déploiement:** Docker-compose intégré avec nginx et noms containers
- **SQLite:** Support complet avec initialisation auto utilisateur admin

### 🚀 Déploiement
- **Environnement dev:** Docker-compose avec images :dev
- **Proxy:** Nginx intégré utilisant noms containers
- **Base données:** SQLite pour développement (admin@example.com / admin123)

### ⚙️ Configuration
- **Docker:** Build et déploiement via scripts PowerShell
- **Versioning:** Respect procédure X.Y.Z_n pour développement
- **Registry:** Images dev locales (non pushées ghcr.io)

---

## [1.7.0_1] - 2025-12-07

### ✨ Nouvelles fonctionnalités
- **Galaxy SMART:** Enrichissement on-demand des namespaces
- **Performance:** Amélioration 99% des temps de réponse Galaxy API
- **Frontend:** ModulesZoneCached.tsx avec auto-détection enrichissement

### 🔄 Changements
- **Service Galaxy:** Migration vers API directe (galaxy_service_smart.py)
- **Cache:** Système multi-couches (Frontend TTL + Backend + Redis)
- **Découverte:** 2,204 namespaces découverts (vs 75 précédemment)

---

## [1.6.5] - 2025-12-06

### ✨ Nouvelles fonctionnalités
- **Galaxy API:** Intégration complète avec navigation 4 niveaux
- **UI/UX:** Tooltips riches, clic droit, skip version unique
- **Performance:** Algorithme 2 phases pour comptage collections

### 🛠️ Corrections
- **URLs Galaxy:** Fix endpoints API pour comptage précis
- **Collections:** Compteurs exacts par namespace
- **Navigation:** Tri alphabétique tous niveaux

---

## [1.5.0_3] - 2025-12-05

### 🛠️ Corrections
- **bcrypt:** Fix AttributeError avec bcrypt==4.0.1 explicite
- **SQLite:** Support multi-pods avec réplication désactivée
- **URLs:** Fix hardcodées pour reverse proxy

### ⚙️ Configuration
- **Déploiement:** SQLite single-pod pour développement
- **Auth:** Utilisateur admin créé automatiquement au démarrage
- **Network:** NetworkPolicy egress pour API Galaxy externe

---

## [1.4.0_5] - 2025-12-06

### ✨ Nouvelles fonctionnalités
- **Galaxy API:** 4 endpoints (namespaces, collections, versions, modules)
- **Performance:** Cache 2 niveaux (Frontend 15min, Backend 30min)
- **UI:** Navigation hiérarchique complète dans ModulesZone

### 🔧 Améliorations
- **Algorithme:** 2 phases pour optimisation découverte/comptage
- **Response time:** 12.2s → 1.8s (85% amélioration)
- **Drag & Drop:** Modules Galaxy vers canvas playbook

---

## Versions antérieures

### [1.3.9_2] - 2025-12-05
- Fix authentification et déploiement SQLite
- Correction URLs relatives pour reverse proxy
- Support Docker-compose environnement développement

### [1.2.5] - 2025-11-30
- Interface utilisateur React + Material-UI
- Système drag & drop pour construction playbooks
- Architecture backend FastAPI + PostgreSQL

### [1.0.0] - 2025-11-15
- Version initiale du projet
- Proof of concept constructeur playbook Ansible
- Interface basique et API REST

---

## Légende des types de changements

- ✨ **Nouvelles fonctionnalités** - Nouvelles features pour utilisateurs
- 🔄 **Changements** - Modifications comportement existant  
- 🛠️ **Corrections** - Bug fixes
- 🔧 **Améliorations** - Améliorations internes/performance
- 🚀 **Déploiement** - Changements infrastructure/déploiement
- ⚙️ **Configuration** - Modifications configuration/environnement
- 📚 **Documentation** - Mises à jour documentation uniquement
- 🔒 **Sécurité** - Correctifs vulnérabilités

---

## Format des versions

**Développement :** `X.Y.Z_n`
- **X** : Structure base de données (changements schema)
- **Y** : Nouvelle fonctionnalité (features)
- **Z** : Correctifs bugs (bugfixes)  
- **n** : Build incrémental (développement uniquement)

**Production :** `X.Y.Z` (suppression suffixe `_n`)

**Phases :**
- **Phase 1** : Développement local avec versions `_n`
- **Phase 2** : Production avec push ghcr.io et déploiement K8s