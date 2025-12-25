# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2025-12-25**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `1.14.3` (ghcr.io/ccoupel/ansible-builder-backend:1.14.3) ✅
- **Frontend :** `1.14.3` (ghcr.io/ccoupel/ansible-builder-frontend:1.14.3) ✅
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `v1.14.3`

**Staging (nginx reverse proxy) :**
- **Backend :** `1.14.3-rc.15` (ansible-builder-backend:1.14.3-rc.15)
- **Frontend :** `1.14.3-rc.15` (ansible-builder-frontend:1.14.3-rc.15)
- **URL :** http://192.168.1.217
- **Status :** Synced with production

---

## ✅ **Version 1.14.3 - Deployee en Production (2025-12-25)**

### Vue Arborescente Elements (TreeView)

**Objectif :** Ameliorer l'experience utilisateur en presentant les namespaces/collections/modules sous forme d'arbre expansible au lieu de niveaux de navigation separes.

**Composant cree :**
- `frontend/src/components/zones/modules-zone/ModulesTreeView.tsx` (~450 lignes)

**Fonctionnalites implementees :**
- [x] TreeView avec MUI X Tree View (`@mui/x-tree-view`)
- [x] Chargement paresseux (lazy loading) des collections et modules
- [x] Recherche/filtre des namespaces avec transitivite
- [x] Drag & drop des modules vers le playbook
- [x] Icones differenciees par niveau (Folder/Widgets/Extension)
- [x] Indicateurs de chargement par noeud
- [x] Onglets FAVORITES et ALL
- [x] Preloading parallele (batch 10)
- [x] 3 barres de progression distinctes
- [x] Style gris pour elements transitifs

**Intégration :**
- Nouvel onglet "Tree" ajoute dans ModulesZoneCached
- Coexiste avec les vues "Generic" et "Modules" existantes

**Phase 3 - Production : COMPLETE**

#### Tests valides
- [x] Build TypeScript sans erreurs
- [x] Expansion des namespaces charge les collections
- [x] Expansion des collections charge les modules
- [x] Drag & drop fonctionne depuis TreeView
- [x] Recherche filtre correctement avec transitivite
- [x] Performance avec 54 namespaces (preloading parallele)
- [x] Smoke tests production passes

---

## ✅ **Version 1.14.2 - Déployée en Production (2025-12-25)**

### Rationalisation du Code

**Objectif :** Nettoyer le code obsolète et améliorer la maintenabilité.

**Changements (~950 lignes supprimées) :**

| Commit | Description | Impact |
|--------|-------------|--------|
| `46647df` | Suppression code obsolète | -570 lignes |
| `29c5175` | Extraction composants ModulesZoneCached | -287 lignes |
| `8743b68` | Consolidation types ModuleParameter/ModuleSchema | -30 lignes |
| `62c47ca` | Suppression axiosConfig.ts inutilisé | -59 lignes |

**Détails :**
- Suppression de `ansibleService.ts` (dupliqué avec `ansibleApiService.ts`)
- Suppression des endpoints `/api/collections/*` (remplacés par `/api/ansible/*`)
- Migration du champ `config` déprécié vers `register` dans ModuleBlock
- Extraction de 4 composants réutilisables dans `modules-zone/`
- Consolidation des types dans `types/playbook.ts`
- Suppression de `axiosConfig.ts` non utilisé

---

## ✅ **Version 1.14.1 - Déployée en Production (2025-12-25)**

### Build Once Deploy Everywhere

**Objectif :** Réduire les risques de déploiement en utilisant exactement la même image Docker en staging et en production.

**Changements :**
- Frontend staging utilise maintenant `Dockerfile` (nginx) au lieu de `Dockerfile.dev` (Vite)
- Noms de services alignés sur Kubernetes : `ansible-builder-backend`, `ansible-builder-frontend`
- Plus de suffix `-vite` sur les images frontend
- Configuration nginx staging route vers port 80 au lieu de 5173

**Avantages :**
- Image testée en staging = image déployée en production
- Pas de différence de comportement entre environnements
- Promotion simple : retag de `rc.n` vers version finale

---

## ✅ **Version 1.14.0 - Déployée en Production (2025-12-25)**

### Synchronisation Temps Réel des Playbooks

**Objectif :** Permettre aux collaborateurs de voir les modifications des autres utilisateurs en temps réel.

**Stratégie technique :**
- Granularité fine des updates (par champ/élément)
- Debounce 300ms pour optimisation réseau
- Versioning pour gestion des conflits (optimistic locking)
- Last-write-wins avec notification visuelle

**Types d'updates :**
| Type | Déclencheur | Data |
|------|-------------|------|
| `module_add` | Drag & drop module | `{module, position}` |
| `module_move` | Déplacement module | `{moduleId, x, y}` |
| `module_delete` | Suppression module | `{moduleId}` |
| `module_config` | Config dans ConfigZone | `{moduleId, field, value}` |
| `module_resize` | Redimensionnement module | `{moduleId, width, height}` |
| `link_add` | Connexion modules | `{link}` |
| `link_delete` | Suppression lien | `{linkId}` |
| `play_update` | Modification play | `{playId, field, value}` |
| `variable_update` | Modification variable | `{variable}` |
| `block_collapse` | Collapse block | `{blockId, collapsed}` |
| `section_collapse` | Collapse section | `{key, collapsed}` |

### Fonctionnalités implémentées (rc.1 → rc.15)

#### Synchronisation temps réel (rc.1 → rc.9)
- [x] Hook `useCollaborationSync` pour debounce et envoi typé
- [x] Intégration `sendUpdate` dans WorkZone (modules, liens)
- [x] Intégration `sendUpdate` dans ConfigZone (paramètres)
- [x] Application des updates reçus via `applyCollaborationUpdate`
- [x] Support play_update pour attributs PLAY
- [x] Support module_config pour tous les champs
- [x] Support déplacement tâches dans blocks

#### Highlight collaboratif (rc.10 → rc.11)
- [x] Highlight éléments modifiés par autres utilisateurs
- [x] Couleurs uniques par utilisateur (basé sur hash username)
- [x] Highlight sur tous types d'éléments (modules, links, plays, variables)
- [x] Animation CSS avec transition fluide
- [x] Durée configurable (par défaut 1.5s)

#### Préférences utilisateur (rc.12 → rc.15)
- [x] Contexte `UserPreferencesContext` avec stockage localStorage
- [x] Durée de highlight configurable (0.5s → 5s)
- [x] Interface configuration en modal (au lieu d'une page séparée)
- [x] Reset des préférences aux valeurs par défaut
- [x] Cache sessionStorage pour restauration instantanée après navigation

#### Configuration Dialog (rc.15)
- [x] Conversion ConfigurationPage → ConfigurationDialog (modal)
- [x] Accessible à tous les utilisateurs (pas seulement admin)
- [x] 2 onglets pour admins : "Préférences" et "Namespaces"
- [x] Pas de navigation = pas de rechargement du playbook
- [x] Redirection route `/admin/configuration` vers `/`

### Phase actuelle : Phase 2 - Intégration Staging

#### Backend (Terminé)
- [x] Champ `version` existant sur modèle Playbook (optimistic locking)
- [x] WebSocket endpoint pour broadcaster updates avec version
- [x] Permissions validées (seuls les éditeurs peuvent envoyer)
- [x] Fonction `check_playbook_access_async` pour vérifier accès WebSocket

#### Frontend (Terminé)
- [x] Hook `useCollaborationSync` pour debounce et envoi typé
- [x] Intégration complète WorkZone et ConfigZone
- [x] Highlight visuel des modifications collaboratives
- [x] Préférences utilisateur persistantes
- [x] Configuration en modal (UX améliorée)

#### Tests Phase 2 - Staging (2025-12-24)
- [x] Build Docker backend: `ansible-builder-backend:1.14.0-rc.15`
- [x] Build Docker frontend: `ansible-builder-frontend:1.14.0-rc.15-vite`
- [x] Déploiement containers OK
- [x] Health checks passés
- [x] Version affichée: 1.14.0-rc.15 (STAGING)
- [x] Validation utilisateur finale

#### Phase 3 - Production (2025-12-25)
- [x] Tag images pour production (1.14.0-rc.15 → 1.14.0)
- [x] Push images vers ghcr.io
- [x] Déploiement Kubernetes via helm upgrade
- [x] Smoke tests passés (58ms temps de réponse)
- [x] Version affichée: 1.14.0 (PROD)
- [x] Tag git v1.14.0 créé

**Déploiement Production terminé avec succès**

---

## ✅ **Version 1.13.0 - Déployée en Production (2025-12-22)**

### Collaboration Multi-utilisateur Temps Réel

**Système de rôles (3 niveaux) :**
- Propriétaire : Gestion complète + droits utilisateurs
- Éditeur : Modification sans gestion des droits
- Visualiseur : Lecture seule

**Partage de playbooks :**
- Partage par username (pas d'email)
- Interface de gestion des collaborateurs
- Table `playbook_shares` (playbook_id, user_id, role)

**WebSockets temps réel :**
- Synchronisation instantanée des modifications
- ConnectionManager pour gérer les connexions par playbook
- Messages : join, leave, update, presence

**UI Temps réel :**
- Avatars des utilisateurs connectés dans AppHeader
- Highlight des modifications reçues (flash 2s)
- Indicateur "X utilisateurs connectés"

**Gestion des playbooks partagés :**
- Séparation playbooks personnels / partagés avec onglets
- Indicateur de partage sur les playbooks personnels (chip "Partagé (N)")
- Affichage propriétaire et rôle pour playbooks partagés
- Sécurisation suppression : transfert propriété ou suppression définitive
- Option conserver accès éditeur après transfert

**Audit Log :**
- Table `playbook_audit_log`
- Traçage : create, update, delete, share, unshare, transfer_ownership
- Historique consultable par playbook

### Phase actuelle : Phase 2 - Intégration Staging

#### Implémentation Backend (Terminée)
- [x] Modèles SQLAlchemy : PlaybookShare, PlaybookAuditLog
- [x] Ajout colonne `version` sur Playbook (optimistic locking)
- [x] WebSocketManager pour les rooms par playbook
- [x] Endpoint WebSocket `/ws/playbook/{playbook_id}`
- [x] Endpoints REST collaboration :
  - `POST /playbooks/{id}/shares` - Partager avec un utilisateur
  - `GET /playbooks/{id}/shares` - Liste des partages
  - `PUT /playbooks/{id}/shares/{share_id}` - Modifier rôle
  - `DELETE /playbooks/{id}/shares/{share_id}` - Retirer partage
  - `GET /playbooks/shared-with-me` - Playbooks partagés avec moi
  - `GET /playbooks/{id}/audit-log` - Journal d'audit
- [x] Mise à jour endpoints existants pour accès partagés

#### Implémentation Frontend (Terminée)
- [x] Hook `usePlaybookWebSocket.ts` pour connexions temps réel
- [x] Service `collaborationService.ts` pour API REST
- [x] Contexte `CollaborationContext.tsx` pour état global
- [x] Composant `PresenceIndicator.tsx` - Avatars utilisateurs connectés
- [x] Composant `ShareDialog.tsx` - Dialog de partage
- [x] Intégration dans MainLayout et AppHeader

#### Tests Phase 1 (2025-12-22)
- [x] Backend: 9/9 imports réussis (models, services, schemas, routers)
- [x] Backend: 61 routes enregistrées dont 8 nouvelles (collaboration)
- [x] Frontend: Build TypeScript réussi (11637 modules)
- [x] Frontend: Bundle production généré (782 kB)
- [x] Corrections: `NodeJS.Timeout` → `ReturnType<typeof setTimeout>`

#### Tests Phase 2 - Staging (2025-12-22)
- [x] Build Docker backend: `ansible-builder-backend:1.13.0-rc.4`
- [x] Build Docker frontend: `ansible-builder-frontend:1.13.0-rc.4-vite`
- [x] Configuration nginx: WebSocket `/ws/` proxy ajouté
- [x] Déploiement: 3 containers démarrés (backend, frontend, nginx)
- [x] Health check nginx: HTTP 200 OK
- [x] Backend version: `1.13.0-rc.4` (STAGING, is_rc=true)
- [x] Frontend accessible: HTTP 200 OK
- [x] API shares (non-auth): 403 Forbidden (attendu)
- [x] API shared-with-me (non-auth): 403 Forbidden (attendu)
- [x] WebSocket presence: `{"users":[], "count":0}` (attendu)
- [x] API Ansible versions: 9 versions disponibles
- [x] Logs backend: OK, pas d'erreurs

#### Tests fonctionnels validés (2025-12-22)
- [x] Affichage version: rc.X affiché en staging, masqué en prod
- [x] Suppression playbook non partagé: confirmation simple OK
- [x] Partage playbook: par username, fonctionne
- [x] Liste playbooks: onglets "Mes playbooks" / "Partagés avec moi"
- [x] Indicateur partage: chip "Partagé (N)" avec tooltip des usernames
- [x] Affichage rôle: badge Éditeur/Lecteur pour playbooks partagés
- [x] Suppression playbook partagé: dialog avec options transfert/supprimer
- [x] Transfert propriété: fonctionne avec option conserver accès éditeur
- [x] Cascade delete: plus d'erreur IntegrityError sur audit_log

#### Prochaines étapes
- [x] Tests fonctionnels utilisateur validés
- [x] Validation utilisateur OK
- [x] Phase 3 : Production déployée

---

## ✅ **Version 1.12.2 - Déployée en Production (2025-12-22)**

Voir [DONE.md](DONE.md) pour les détails.

---

## 📋 **Prochaines Priorites**

- v1.14.3 TreeView deployee en production
- Voir [BACKLOG.md](BACKLOG.md) pour la roadmap complete

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

*Derniere mise a jour : 2025-12-25 - v1.14.3 Deployee en Production*
