# Travail en Cours - Ansible Builder

Ce document trace l'état actuel du développement et les versions déployées.

---

## 🚀 **Status Actuel - 2025-12-22**

### Versions Déployées

**Production (Kubernetes) :**
- **Backend :** `1.12.2` (ghcr.io/ccoupel/ansible-builder-backend:1.12.2) ✅
- **Frontend :** `1.12.2` (ghcr.io/ccoupel/ansible-builder-frontend:1.12.2) ✅
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `v1.12.2`

**Staging (nginx reverse proxy) :**
- **Backend :** `1.13.0-rc.4`
- **Frontend :** `1.13.0-rc.4-vite`
- **URL :** http://192.168.1.217
- **Status :** Phase 2 - Tests validés, prêt pour Phase 3

---

## 🚧 **Version 1.13.0 - En Développement**

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
- [ ] Phase 3 : Production

---

## ✅ **Version 1.12.2 - Déployée en Production (2025-12-22)**

Voir [DONE.md](DONE.md) pour les détails.

---

## 📋 **Prochaines Priorités**

- Finaliser v1.13.0 (Collaboration temps réel)
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

*Dernière mise à jour : 2025-12-22 - v1.13.0-rc.4 validé en staging*
