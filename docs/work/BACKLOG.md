# Backlog - Ansible Builder

Ce document contient la liste des fonctionnalités et améliorations prévues pour le projet Ansible Builder.

> **📋 Historique des réalisations :** Voir [DONE.md](DONE.md) pour les fonctionnalités déjà implémentées.

---

## 🎯 **Priorités Actuelles**

### ✅ P1 - High Priority (Complété v1.12.2)
- [x] **Génération Playbook Final**
  - [x] Export YAML complet avec validation syntaxe
  - [x] Intégration Ansible-lint pour validation
  - [x] Preview et correction des erreurs de lint
  - [x] Layout 3 colonnes avec indicateurs de validation
  - [x] Icônes de types et contrôles adaptés (checkbox, multi-select)

### 🚧 P2 - En Cours (Version 1.13.0)
- [ ] **Collaboration Multi-utilisateur Temps Réel**
  - [ ] Système de rôles (Propriétaire/Éditeur/Visualiseur)
  - [ ] Partage de playbooks par username
  - [ ] WebSockets pour synchronisation temps réel
  - [ ] Avatars des utilisateurs connectés dans AppHeader
  - [ ] Highlight des modifications reçues
  - [ ] Audit log des modifications

### P3 - Medium Priority (Version 2.0.x)
- [ ] **Gestion des Rôles Ansible**
  - [ ] Collecte et affichage des rôles disponibles
  - [ ] Drag & drop des rôles dans la section roles
  - [ ] Configuration des paramètres de rôles

---

## 🌟 **Fonctionnalités Galaxy & Collections**

### Galaxy Enhanced
- [ ] **Optimisation performances favoris**
  - [ ] Cache prioritaire pour namespaces favoris
  - [ ] Chargement préférentiel des favoris
  - [ ] Réduction temps de réponse <100ms pour favoris
- [ ] **Collections intelligentes**
  - [ ] Désactivation automatique des collections sans modules
  - [ ] Collecte des attributs spécifiques des modules
  - [ ] Métadonnées enrichies (auteur, description, tags)

### Optimisations Collections
- [ ] **Performance**
  - [ ] Lazy loading des modules volumineux
  - [ ] Cache persistant local (IndexedDB)
  - [ ] Compression des données Galaxy

---

## 👥 **Collaboration Multi-utilisateur** (🚧 En cours v1.13.0)

### Gestion des Droits Playbooks
- [ ] **Système de rôles avancé (3 niveaux)**
  - [ ] **Propriétaire** : Gestion complète + droits utilisateurs
  - [ ] **Éditeur** : Modification sans gestion des droits
  - [ ] **Visualiseur** : Lecture seule

- [ ] **Partage et collaboration**
  - [ ] Interface de gestion des droits d'accès
  - [ ] Invitations par username
  - [ ] Audit log des modifications par utilisateur

### Synchronisation temps réel (WebSockets)
- [ ] **Temps réel**
  - [ ] Sync automatique des modifications
  - [ ] Avatars des utilisateurs connectés (AppHeader)
  - [ ] Highlight des changements reçus (flash 2s)
  - [ ] Gestion des conflits d'édition

---

## 🧪 **Test et Validation**

### Environnement de Test
- [ ] **Page Inventaire**
  - [ ] Gestion group_vars et host_vars
  - [ ] Interface de configuration inventaire
  - [ ] Validation syntaxe inventaire

- [ ] **Exécution Playbooks**
  - [ ] Mode step-by-step (debug)
  - [ ] Simulation d'exécution (dry-run)
  - [ ] Logs d'exécution en temps réel

### Validation et Qualité
- [ ] **Tests automatisés**
  - [ ] Validation syntaxe Ansible
  - [ ] Tests de compatibilité versions
  - [ ] Analyse de sécurité playbooks

---

## 🔧 **Améliorations Techniques**

### Tests
- [ ] **Corriger les mocks des tests Ansible Services (v1.10.0)**
  - [ ] `test_ansible_collections_service.py` : Mettre à jour les mocks HTML pour correspondre au format réel de docs.ansible.com
  - [ ] `test_ansible_versions_service.py` : Corriger les mocks async
  - [ ] `test_ansible_endpoints.py` : Aligner les mocks avec le service

### Backend
- [ ] **Database migration SQLite → PostgreSQL**
- [ ] **API Rate limiting**
- [ ] **Monitoring avancé (Prometheus/Grafana)**
- [ ] **Backup automatique playbooks**

### Frontend
- [ ] **Mode hors-ligne (PWA)**
- [ ] **Thème personnalisable**
- [ ] **Raccourcis clavier avancés**
- [ ] **Export/Import playbooks (JSON/YAML)**

### DevOps
- [ ] **CI/CD amélioré**
- [ ] **Tests end-to-end (Playwright)**
- [ ] **Déploiement multi-environnement automatisé**
- [ ] **Monitoring utilisateur (Analytics)**

---

## 📱 **UX/UI Enhancements**

### Interface utilisateur
- [ ] **Responsive mobile complet**
- [ ] **Tour guidé pour nouveaux utilisateurs**
- [ ] **Tooltips contextuels améliorés**
- [ ] **Undo/Redo système**

### Authentification UX
- [ ] **Avatar rouge pour réauthentification**
  - [ ] Indicateur visuel clair quand token expiré
  - [ ] Animation/pulsation pour attirer l'attention
  - [ ] Message contextuel explicatif
  - [ ] Auto-redirect vers login si nécessaire

### Workflow
- [ ] **Templates de playbooks**
- [ ] **Snippets réutilisables**
- [ ] **Bibliothèque de patterns communs**
- [ ] **Import depuis existing playbooks**

---

## 🔮 **Vision Long Terme (v3.0+)**

### Architecture
- [ ] **Microservices séparés**
  - [ ] Galaxy service indépendant
  - [ ] Service d'exécution dédié
  - [ ] Service de validation/lint

### Intégrations
- [ ] **Git integration (GitLab/GitHub)**
- [ ] **CI/CD hooks natives**
- [ ] **Intégration AWX/Ansible Tower**
- [ ] **Plugin Ansible CLI**

### AI/ML Features
- [ ] **Suggestions automatiques de modules**
- [ ] **Détection de patterns anti-patterns**
- [ ] **Auto-completion intelligente**
- [ ] **Optimisation automatique playbooks**

---

## 📝 **Notes de Développement**

### Conventions
- Utiliser les TodoWrite pour tracking des tâches
- Tests obligatoires pour nouvelles fonctionnalités
- Documentation technique mise à jour en parallèle
- Versioning strict selon format `X.Y.Z[_n]`

### Priorisation
- **P1** : Fonctionnalités core manquantes
- **P2** : Améliorations UX/performance 
- **P3** : Features avancées/nice-to-have

---

*Document maintenu à jour. Dernière mise à jour : 2025-12-22*

*Pour ajouter des items au backlog, créer une issue GitHub ou contacter l'équipe de développement.*
