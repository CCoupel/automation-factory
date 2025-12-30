# Historique des Réalisations - Ansible Builder

Ce document trace l'historique des fonctionnalités implémentées et des améliorations réalisées.

---

## ✅ **Version 1.17.0** - *2025-12-30*

### 🔒 Bloc Assertions Système

- **SystemBlock - Blocs non-modifiables**
  - Type dérivé avec `isSystem`, `systemType`, `sourceVariable`
  - Style visuel distinct : thème gris, icône cadenas
  - Sections Rescue/Always masquées (uniquement Normal)
  - Tooltip "Bloc système - Généré automatiquement"

- **Génération automatique assertions**
  - UN BLOC PAR VARIABLE pour organisation visuelle
  - Assertions : required, type (int/bool/list/dict), pattern (regexp/filter)
  - Valeurs par défaut avec set_fact
  - Support types custom avec regexp ou filtres

- **Liens auto-générés**
  - Liens entre blocs : START pre_tasks → Bloc1 → Bloc2 → ...
  - Liens internes : Block-START → Task1 → Task2 → ...
  - Synchronisation avec le state du playbook

- **Contraintes de comportement**
  - Repositionnement bloc et tâches internes : autorisé
  - Drop externe sur bloc : bloqué
  - Drag tâches vers l'extérieur : bloqué
  - Création liens internes : autorisée
  - Édition nom/paramètres : bloquée

### 📊 Métriques
- **Production** : https://coupel.net/ansible-builder
- **Version** : 1.17.0
- **Tag Git** : v1.17.0
- **Smoke tests** : Passés (HTTP 200, 0.1s)

---

## ✅ **Version 1.16.0** - *2025-12-29*

### 🔧 Types de Variables Personnalisables

- **Types de validation personnalisés**
  - Interface admin pour créer/modifier/supprimer des types custom
  - Validation par expression régulière (ex: email, IP, URL)
  - Validation par filtres Ansible (ex: `| from_json`, `| from_yaml`)
  - Types builtin immutables (string, int, bool, list, dict)
  - Activation/désactivation des types personnalisés

- **API Variable Types complète**
  - `GET /variable-types` : Liste types builtin + custom actifs
  - `POST /variable-types/validate` : Validation valeur contre type
  - Endpoints admin pour CRUD des types custom
  - Cache 5 minutes pour optimisation performance

- **Stockage favoris en base de données**
  - Migration favoris namespaces vers base de données
  - Nouveaux favoris collections et modules en base
  - Suppression stockage fichier /tmp (scalabilité)
  - Suppression localStorage pour données multi-appareils

### 📊 Métriques
- **Production** : https://coupel.net/ansible-builder
- **Version** : 1.16.0
- **Tag Git** : v1.16.0
- **Smoke tests** : Passés (pods Running, API OK)

---

## ✅ **Version 1.15.0** - *2025-12-29*

### 📝 Gestion des Variables Améliorée

- **Interface variables enrichie**
  - Support 5 types de variables : string, int, bool, list, dict
  - Icônes par type (TextFields, Numbers, ToggleOn, DataArray, DataObject)
  - Couleurs par type (primary, secondary, success, warning, info)
  - Indicateur requis/optionnel sur chaque variable

- **Dialogue AddVariable complet**
  - Nom de variable (obligatoire, validé format Ansible)
  - Type de variable (obligatoire)
  - Variable requise ? (checkbox)
  - Valeur par défaut (si non requise)
  - Expression régulière de validation

- **Édition des variables**
  - Clic sur chip de variable ouvre le dialogue en mode édition
  - Modification de tous les paramètres (sauf le nom)
  - Mise à jour temps réel via collaboration WebSocket

- **Simplification architecture**
  - Suppression VarsZone globale (variables gérées par Play)
  - Nettoyage du code (~200 lignes supprimées)

### 📊 Métriques
- **Production** : https://coupel.net/ansible-builder
- **Version** : 1.15.0
- **Tag Git** : v1.15.0
- **Smoke tests** : Passés (21ms temps de réponse)

---

## ✅ **Version 1.14.3** - *2025-12-25*

### 🌳 Vue Arborescente Elements (TreeView)

- **Composant ModulesTreeView**
  - TreeView avec MUI X Tree View (@mui/x-tree-view)
  - Chargement paresseux (lazy loading) des collections et modules
  - Recherche/filtre des namespaces avec transitivite
  - Drag & drop des modules vers le playbook

- **Onglets FAVORITES et ALL**
  - Onglet FAVORITES pour namespaces favoris
  - Onglet ALL avec tous les namespaces (54)
  - Selection persistante entre onglets

- **Preloading parallele**
  - Chargement batch parallele (10 namespaces simultanes)
  - 3 barres de progression distinctes (namespaces/collections/modules)
  - Performance 10x amelioree vs chargement sequentiel

- **Recherche recursive avec transitivite**
  - Elements affiches si contiennent la chaine recherchee
  - Ou si un enfant correspond (transitivite)
  - Style gris pour elements affiches par transitivite

- **Icones differenciees par niveau**
  - Folder pour namespaces
  - Widgets pour collections
  - Extension pour modules

### 📊 Metriques
- **Production** : https://coupel.net/ansible-builder
- **Version** : 1.14.3
- **Tag Git** : v1.14.3
- **Smoke tests** : Passes (HTTP 200, API OK)

---

## ✅ **Version 1.14.1** - *2025-12-25*

### 🏗️ Build Once Deploy Everywhere

- **Architecture unifiée staging/production**
  - Frontend staging utilise Dockerfile production (nginx)
  - Plus de Dockerfile.dev ni suffix -vite
  - Même image Docker en staging et production

- **Alignement des noms de services**
  - `ansible-builder-backend` et `ansible-builder-frontend`
  - Configuration docker-compose alignée sur Kubernetes
  - Nginx staging route vers port 80

- **Documentation mise à jour**
  - PHASE2_INTEGRATION.md avec principe "Build Once Deploy Everywhere"
  - PHASE3_PRODUCTION.md avec nouvelles procédures
  - Suppression références Vite/Dockerfile.dev

### 📊 Métriques
- **Production** : https://coupel.net/ansible-builder
- **Version** : 1.14.1
- **Tag Git** : v1.14.1
- **Validation** : Même image (1.14.0-rc.16) déployée en staging et production

---

## ✅ **Version 1.14.0** - *2025-12-25*

### 🔄 Synchronisation Temps Réel des Playbooks

- **Synchronisation granulaire des modifications**
  - Updates typés par champ/élément (module_add, module_move, module_config, etc.)
  - Debounce 300ms pour optimisation réseau
  - Hook `useCollaborationSync` pour envoi typé des modifications
  - Application des updates via `applyCollaborationUpdate`

- **Highlight collaboratif**
  - Surbrillance éléments modifiés par autres utilisateurs
  - Couleurs uniques par utilisateur (hash du username)
  - Animation CSS fluide avec transitions
  - Support tous types d'éléments (modules, links, plays, variables)

- **Préférences utilisateur**
  - Contexte `UserPreferencesContext` avec stockage localStorage
  - Durée de highlight configurable (0.5s → 5s)
  - Interface en modal accessible à tous les utilisateurs
  - Reset des préférences aux valeurs par défaut

- **Configuration Dialog (UX améliorée)**
  - Conversion ConfigurationPage → ConfigurationDialog modal
  - Accessible depuis le menu utilisateur (pas seulement admin)
  - 2 onglets pour admins : "Préférences" et "Namespaces"
  - Pas de navigation = pas de rechargement du playbook
  - Cache sessionStorage pour restauration instantanée

### 📊 Métriques
- **Production** : https://coupel.net/ansible-builder
- **Version** : 1.14.0
- **Tag Git** : v1.14.0
- **Smoke tests** : ✅ Passés (58ms temps de réponse)

---

## ✅ **Version 1.13.0** - *2025-12-22*

### 👥 Collaboration Multi-utilisateur Temps Réel

- **Système de rôles (3 niveaux)**
  - Propriétaire : Gestion complète + droits utilisateurs
  - Éditeur : Modification sans gestion des droits
  - Visualiseur : Lecture seule

- **Partage de playbooks**
  - Partage par username
  - Interface de gestion des collaborateurs (ShareDialog)
  - Table `playbook_shares` avec roles

- **WebSockets temps réel**
  - Synchronisation instantanée des modifications
  - ConnectionManager pour rooms par playbook
  - Messages : join, leave, update, presence

- **UI Collaboration**
  - Avatars des utilisateurs connectés (PresenceIndicator)
  - Highlight des modifications reçues (flash 2s)
  - Séparation playbooks personnels / partagés avec onglets
  - Indicateur de partage sur playbooks personnels (chip "Partagé (N)")
  - Badge Éditeur/Lecteur pour playbooks partagés

- **Gestion sécurisée des playbooks partagés**
  - Suppression avec options : transfert propriété ou supprimer pour tous
  - Option conserver accès éditeur après transfert
  - Endpoint `POST /playbooks/{id}/transfer-ownership`

- **Audit Log**
  - Table `playbook_audit_log`
  - Traçage : create, update, delete, share, unshare, transfer_ownership

### 📊 Métriques
- **Production** : https://coupel.net/ansible-builder
- **Version** : 1.13.0
- **Tag Git** : v1.13.0
- **Smoke tests** : ✅ Passés (23ms temps de réponse)

---

## ✅ **Version 1.12.2** - *2025-12-22*

### 🔍 Ansible Lint Integration & UI Improvements

- **Validation Ansible Lint**
  - Intégration `ansible-playbook --syntax-check` + `ansible-lint`
  - Affichage version Ansible utilisée pour validation
  - Issues catégorisées par sévérité (error/warning/info)
  - Endpoint `/api/playbooks/validate-full-preview`

- **Preview YAML amélioré**
  - Layout 3 colonnes : numéros de lignes | indicateur validation | code
  - Surlignage des lignes référencées par les issues de validation
  - Couleurs selon sévérité (rouge/orange/bleu)

- **Parsing des paramètres corrigé**
  - Extraction correcte du nom depuis balise `<strong>`
  - Types extraits séparément (string, boolean, dict, path, etc.)
  - Aliases et required correctement parsés
  - Normalisation des types API → interne (string→str, integer→int, boolean→bool)

- **Zone Configuration améliorée**
  - Icônes de types devant chaque attribut
  - Boolean → Checkbox
  - List avec choices → Multi-select dropdown
  - List sans choices → Autocomplete avec chips

- **Gestion des versions**
  - Masquage du suffix `-rc.X` en production (ENVIRONMENT=PROD)
  - Affichage version complète en staging (ENVIRONMENT=STAGING)
  - Frontend : version nettoyée via regex
  - Backend : `get_display_version()` masque le RC selon l'environnement

### 📊 Métriques
- **Production** : https://coupel.net/ansible-builder
- **Version affichée** : 1.12.2 (masque -rc.1 en prod)
- **Tag Git** : v1.12.2

---

## ✅ **Version 1.12.0** - *2025-12-20*

### 🔧 Transposition YAML complète et Réactivité UI

- **Transposition YAML corrigée**
  - `moduleToTask()` utilise maintenant `moduleParameters` (corrigé depuis `config`)
  - Attributs PLAY `remote_user` et `connection` transposés vers YAML
  - Champ `tags` connecté et transposé correctement

- **Réactivité UI améliorée (État local + Debounce)**
  - Pattern état local + debounce 300ms pour tous les champs
  - Attributs Task : name, when, loop, tags, delegate_to, ignore_errors, become
  - Attributs PLAY : hosts, remote_user, connection, gather_facts, become
  - Mise à jour UI immédiate, synchronisation parent différée

- **Design unifié**
  - Tous les champs booléens convertis en checkboxes
  - Cohérence PLAY/Task pour ignore_errors et become
  - Suppression des listes déroulantes yes/no

- **Comportement clic WorkZone**
  - Clic zone vide désélectionne le module
  - Affichage automatique config PLAY

### 📊 Métriques
- **Temps réponse production** : 20ms
- **Smoke tests** : ✅ Passés
- **Pods** : Running (backend + frontend + redis)

---

## ✅ **Version 1.11.0** - *2025-12-20*

### 📄 Génération YAML Preview & Validation

- **Génération YAML temps réel**
  - Service `playbook_yaml_service.py` pour conversion JSON → YAML Ansible
  - Service `playbookPreviewService.ts` pour transformation frontend
  - Support complet des sections (pre_tasks, tasks, post_tasks, handlers)
  - Support des blocks imbriqués récursifs (block/rescue/always)
  - Ordre des tâches préservé selon les connexions

- **Validation Playbook en temps réel**
  - Endpoints `/api/playbooks/preview` et `/api/playbooks/validate-preview`
  - Affichage erreurs (rouge) et warnings (orange)
  - Coloration dynamique des onglets selon status

- **Interface utilisateur améliorée**
  - Rafraîchissement après sauvegarde (suppression polling 2s)
  - Onglet Preview : vert (succès) / rouge (erreur)
  - Onglet Validation : vert (valide) / orange (warnings) / rouge (erreurs)
  - Avatar utilisateur : vert (authentifié) / rouge (erreur credentials)
  - Bouton Download YAML fonctionnel

- **Gestion des liens rationalisée**
  - Règle universelle : 1 lien entrant max, 1 lien sortant max par type
  - Chaîne linéaire garantie (A → B → C)
  - Code `createLink()` simplifié et unifié

- **Code rationalisé**
  - Fonction unifiée `convertToAnsibleTask()` pour modules et blocks
  - Fonctions `buildBlockTask()`, `convertTaskIds()` réutilisables
  - Suppression duplication code (~200 lignes)

---

## ✅ **Version 1.10.0** - *2025-12-19*

### 🌐 Intégration Documentation Ansible

- **Web scraping docs.ansible.com**
  - Service `ansible_collections_service.py` pour parsing HTML
  - Extraction namespaces, collections, modules, paramètres
  - 54 namespaces détectés pour Ansible 13

- **Gestion dynamique des versions Ansible**
  - Service `ansible_versions_service.py`
  - Détection automatique versions disponibles
  - Sélecteur de version dans l'interface

- **Cache automatique avec notifications**
  - Scheduler `cache_scheduler_service.py` (sync 24h)
  - SSE Manager pour notifications temps réel
  - Indicateur visuel cache status

- **Refactorisation majeure**
  - API unique `/api/ansible/*`
  - Suppression endpoints legacy `/api/galaxy/*`
  - ~5500 lignes de code supprimées
  - Architecture simplifiée et maintenable

---

## ✅ **Version 1.9.0** - *2025-12-14*

### 📋 Collecte Paramètres Modules

- **Affichage paramètres modules Galaxy**
  - Schémas de paramètres avec types et descriptions
  - Icônes d'aide pour chaque paramètre
  - Validation des valeurs requises

- **Architecture nginx Phase 2**
  - Reverse proxy unifié pour staging
  - Configuration inline docker-compose
  - Simplification déploiement

---

## ✅ **Version 1.8.1** - *2025-12-12*

### 🔧 Interface & UX
- **Boîte About avec versions intégrées**
  - Affichage frontend/backend versions dans dialog About
  - Changelog intégré dans l'interface utilisateur
  - Correction gestion URL prefix pour production
  
- **Configuration Admin pour namespaces standards**
  - Page configuration admin dédiée
  - Gestion des namespaces standards configurables
  - Chargement dynamique des namespaces dans l'interface

### 🏗️ Architecture & Code
- **Interface épurée sans versions dans header**
  - Suppression affichage versions du header principal
  - Centralisation informations dans dialog About
  - Optimisation espace header

---

## ✅ **Version 1.8.0** - *2025-12-08*

### ⭐ Gestion des Favoris Utilisateur
- **Service favoris complet**
  - Stockage persistant des favoris par utilisateur
  - API endpoints pour gestion CRUD favoris
  - Interface utilisateur avec étoiles cliquables
  - Synchronisation temps réel des favoris

- **Intégration Galaxy avec favoris**
  - Affichage prioritaire des namespaces favoris
  - Indicateurs visuels dans l'interface modules
  - Tri automatique favoris en tête de liste

### 🌌 Galaxy API SMART Service (3-Tier Architecture)
- **Niveau 1: Popular Namespaces (10)**
  - Chargement prioritaire au démarrage
  - Namespaces les plus utilisés enrichis immédiatement
  - Cache chaud pour performance <100ms

- **Niveau 2: Background Enrichment**
  - Tâche asynchrone d'enrichissement progressif
  - Traitement de tous les namespaces disponibles
  - Optimisation charge serveur avec rate limiting

- **Niveau 3: On-demand Enrichment**
  - Enrichissement à la sélection utilisateur
  - Données complètes (collections, modules, métadonnées)
  - Cache TTL 30 minutes pour optimisation

### 📊 Performance & Optimisations
- **Réduction drastique des appels API Galaxy**
  - De 100+ appels à 11 appels (-90%)
  - Cache multi-niveaux (Redis + mémoire)
  - Temps de réponse <2s (99th percentile)

- **Cache hit rate Galaxy > 90%**
  - TTL adaptatif selon type de données
  - Invalidation intelligente du cache
  - Monitoring performance intégré

### 🔐 Administration & Configuration
- **Système de configuration admin**
  - Endpoints protégés pour administrateurs
  - Configuration namespaces standards persistante
  - Interface de gestion dédiée

---

## ✅ **Version 1.7.x** - *2025-12-01 à 2025-12-07*

### 🌌 Intégration Galaxy API de Base
- **Navigation Galaxy 4 niveaux**
  - Namespaces → Collections → Versions → Modules
  - Interface breadcrumb pour navigation
  - Tooltips informatifs détaillés

- **Découverte Galaxy complète**
  - 2,204 namespaces découverts et indexés
  - Métadonnées enrichies (descriptions, téléchargements)
  - Tri alphabétique et recherche

### 🎨 Interface & Ergonomie
- **Zone Modules avec onglets**
  - Onglet Generic (éléments Ansible de base)
  - Onglet Modules (navigation Galaxy)
  - Recherche unifiée dans les deux onglets

- **Optimisations UX**
  - Auto-skip navigation si version unique
  - Clic droit pour accès direct dernière version
  - Indicateurs visuels (compteurs, dates)

---

## ✅ **Version 1.6.x** - *2025-11-15 à 2025-11-30*

### 🏗️ Architecture Frontend React
- **Layout principal redimensionnable**
  - Zones collapsibles et redimensionnables
  - Persistance état interface utilisateur
  - Layout 5 zones (Play, Vars, Modules, Work, Config, System)

- **Système Drag & Drop complet**
  - Sources multiples vers canvas
  - Validation zones de drop
  - Visual feedback temps réel
  - Gestion état complexe

### 📋 Gestion Playbooks
- **Structure PLAY Ansible complète**
  - Onglets PLAY avec sections accordéon
  - Pre-tasks, Tasks, Post-tasks, Handlers
  - Variables et Rôles intégrés

- **Système de liens entre tâches**
  - Création liens visuels SVG
  - Validation cycles et contraintes
  - Suppression interactive au survol

---

## ✅ **Version 1.5.x** - *2025-11-01 à 2025-11-14*

### 🔐 Authentification & Sécurité
- **Système JWT complet**
  - Login/logout avec tokens sécurisés
  - Gestion expiration et refresh
  - Protection routes et API

- **Gestion utilisateurs**
  - Rôles user/admin
  - Profils utilisateur
  - Interface de gestion comptes

### 🗄️ Base de Données & Backend
- **Architecture FastAPI**
  - API REST complète
  - SQLAlchemy + SQLite
  - Modèles User/Playbook/Favorites

- **Endpoints API organisés**
  - Authentication (/auth)
  - Playbooks (/playbooks)
  - Admin (/admin)
  - Galaxy (/galaxy)

---

## ✅ **Version 1.4.x et antérieures** - *2025-10-01 à 2025-10-31*

### 🎯 Fonctionnalités Core
- **Éditeur playbook de base**
  - Drag & drop modules génériques
  - Configuration propriétés modules
  - Preview YAML basique

### 🏢 Infrastructure
- **Conteneurisation Docker**
  - Images multi-stage optimisées
  - Docker Compose pour développement
  - Configuration nginx

- **Déploiement Kubernetes**
  - Manifests K8s complets
  - Services et Ingress
  - Gestion secrets et ConfigMaps

---

## 📋 **Documentation & Processus**

### 📚 Documentation Technique - *v1.8.1*
- **Documentation complète organisée**
  - FRONTEND_SPECS.md et FRONTEND_IMPLEMENTATION.md
  - BACKEND_SPECS.md et BACKEND_IMPLEMENTATION.md
  - GALAXY_INTEGRATION.md détaillé
  - Cross-références cohérentes

### 🔄 Processus Développement - *v1.8.0*
- **Phases de déploiement**
  - Phase 1: Développement avec suffixe _n
  - Phase 2: Production sans suffixe
  - Versioning strict X.Y.Z[_n]

- **CI/CD et Quality**
  - Tests automatisés
  - Linting et validation
  - Docker registry GHCR

---

## 📊 **Métriques de Performance Atteintes**

### 🚀 Performance Galaxy API
- **Temps de réponse** : <2s (99th percentile) ✅
- **Cache hit rate** : >90% ✅  
- **Réduction appels API** : -90% (100→11) ✅
- **Temps favoris** : <100ms ✅

### 💾 Scalabilité
- **Utilisateurs concurrent** : 50+ supportés
- **Playbooks par utilisateur** : Illimité
- **Taille cache Redis** : 256MB optimisé
- **Uptime production** : >99.5%

---

*Document maintenu automatiquement. Dernière mise à jour : 2025-12-25*

*Les versions listées correspondent aux dates de déploiement en production.*