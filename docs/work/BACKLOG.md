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

### ✅ P2 - Complété (Version 1.13.0)
- [x] **Collaboration Multi-utilisateur Temps Réel**
  - [x] Système de rôles (Propriétaire/Éditeur/Visualiseur)
  - [x] Partage de playbooks par username
  - [x] WebSockets pour synchronisation temps réel
  - [x] Avatars des utilisateurs connectés dans AppHeader
  - [x] Highlight des modifications reçues
  - [x] Audit log des modifications

### ✅ P3 - Complété (Version 1.14.x)
- [x] **Synchronisation Temps Réel des Modifications** (v1.14.0)
  - [x] Granularité fine des updates (par champ/élément)
  - [x] Gestion des conflits (optimistic locking)
  - [x] Highlight collaboratif avec couleurs par utilisateur
- [x] **Rationalisation du Code** (v1.14.2)
  - [x] Suppression code obsolète (~570 lignes)
  - [x] Extraction composants ModulesZoneCached
  - [x] Consolidation types TypeScript
- [x] **Vue Arborescente Elements** (v1.14.3)
  - [x] TreeView pour namespaces/collections/modules
  - [x] Chargement paresseux des données
  - [x] Drag & drop modules vers playbook

### ✅ P4 - Complété (Version 1.15.x - 1.18.0)
- [x] **Variables Typées & Validation** (v1.15.0 - v1.17.0)
  - [x] Définition du type de donnée (string, int, bool, list, dict)
  - [x] Attribut mandatory (obligatoire/optionnel)
  - [x] Valeur par défaut configurable
  - [x] Génération automatique d'assertions `ansible.builtin.assert`
  - [x] Validation des variables d'entrée du playbook
  - [x] Types personnalisables par admin (v1.16.0)
  - [x] Bloc assertions système visible et verrouillé (v1.17.0)
- [x] **Rationalisation du Code** (v1.18.0)
  - [x] Service centralisé contrôle d'accès playbooks
  - [x] Service unifié gestion des favoris
  - [x] Gestion d'erreurs API standardisée
  - [x] Composants réutilisables (DraggableListItem)
  - [x] Élimination ~800 lignes de code dupliqué

### P5 - Next Priority (Version 2.0.x)
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

## 👥 **Collaboration Multi-utilisateur** (✅ Complété v1.13.0)

### ✅ Gestion des Droits Playbooks (Complété)
- [x] **Système de rôles avancé (3 niveaux)**
  - [x] **Propriétaire** : Gestion complète + droits utilisateurs
  - [x] **Éditeur** : Modification sans gestion des droits
  - [x] **Visualiseur** : Lecture seule

- [x] **Partage et collaboration**
  - [x] Interface de gestion des droits d'accès
  - [x] Invitations par username
  - [x] Audit log des modifications par utilisateur

### ✅ Synchronisation temps réel (Complété v1.14.0)
- [x] **Temps réel**
  - [x] Sync automatique des modifications
  - [x] Avatars des utilisateurs connectés (AppHeader)
  - [x] Highlight des changements reçus
  - [x] Gestion des conflits d'édition (optimistic locking)

### 🆕 Collaboration Avancée (Version 2.1.x)
- [ ] **Messagerie temps réel**
  - [ ] Chat individuel (clic sur avatar collaborateur)
  - [ ] Chat groupe (clic sur avatar multi-users)
  - [ ] Session only (pas de persistance backend)
  - [ ] Badge notifications messages non lus

- [ ] **Verrouillage Playbook (Lock/Unlock)**
  - [ ] Bouton lock pour verrouiller un playbook
  - [ ] Indicateur visuel playbook verrouillé (🔒)
  - [ ] Seul le propriétaire/éditeur qui verrouille peut déverrouiller
  - [ ] Notification aux autres collaborateurs
  - [ ] Timeout automatique optionnel

---

## 🔍 **Import & Reverse Engineering** (Version 2.2.x)

### Import Playbooks Existants
- [ ] **Parser YAML → Structure visuelle**
  - [ ] Import fichier YAML existant
  - [ ] Détection automatique des modules et paramètres
  - [ ] Reconstruction des liens entre tâches
  - [ ] Gestion des includes/imports
- [ ] **Import depuis Git**
  - [ ] Cloner un repository Git
  - [ ] Parser et importer les playbooks détectés
  - [ ] Support GitHub/GitLab

### Import/Export Diagramme
- [ ] **Export diagramme**
  - [ ] Génération flowchart Mermaid
  - [ ] Génération diagramme PlantUML
  - [ ] Visualisation structure playbook
- [ ] **Import diagramme**
  - [ ] Parser diagramme Mermaid → playbook
  - [ ] Parser diagramme PlantUML → playbook
  - [ ] Création structure depuis flowchart

---

## 🔐 **Sécurité & Vault** (Version 2.3.x)

### Ansible Vault Integration
- [ ] **Chiffrement variables sensibles**
  - [ ] Indicateur visuel variables chiffrées (🔒)
  - [ ] Édition variables vault avec mot de passe
  - [ ] Génération vault password file
  - [ ] Support multi-vault (différents mots de passe)

### Détection de Secrets
- [ ] **Scan automatique**
  - [ ] Détection patterns sensibles (passwords, API keys, tokens)
  - [ ] Alertes avant export si secrets non chiffrés
  - [ ] Suggestions de vault pour variables détectées
  - [ ] Règles personnalisables

### Administration Sécurité
- [ ] **Gestion sessions utilisateurs**
  - [ ] Visibilité activité par admin
  - [ ] Liste sessions actives par utilisateur
  - [ ] Révocation sessions à distance
  - [ ] Logs de connexion

---

## 📝 **Annotations & Historique** (Version 2.4.x)

### Commentaires Collaboratifs
- [ ] **Commentaires sur tâches/modules**
  - [ ] Threads de discussion par élément
  - [ ] Mentions @username
  - [ ] Résolution de commentaires
  - [ ] Notifications sur réponses

### Versioning Playbooks
- [ ] **Historique des modifications**
  - [ ] Timeline des changements par playbook
  - [ ] Diff viewer entre versions
  - [ ] Auteur et date de chaque modification
- [ ] **Restauration version**
  - [ ] Revenir à une version précédente
  - [ ] Prévisualisation avant restauration
  - [ ] Création branche depuis version ancienne
- [ ] **Comparaison playbooks**
  - [ ] Diff entre deux playbooks différents
  - [ ] Mise en évidence des différences
  - [ ] Merge de modifications

---

## 🖥️ **Inventaire & Connexions** (Version 2.5.x)

### Éditeur d'Inventaire Visuel
- [ ] **Gestion des hosts**
  - [ ] Interface graphique création groups/hosts
  - [ ] Arborescence visuelle des groupes
  - [ ] Variables par groupe (group_vars)
  - [ ] Variables par host (host_vars)
- [ ] **Import/Export inventaire**
  - [ ] Import fichier inventory INI/YAML
  - [ ] Export vers formats standards

### Test de Connexion
- [ ] **Validation connectivité**
  - [ ] Ping SSH vers hosts configurés
  - [ ] Vérification facts Ansible
  - [ ] Diagnostic erreurs connexion
  - [ ] Test credentials

### Inventaire Dynamique
- [ ] **Sources cloud**
  - [ ] Intégration AWS EC2
  - [ ] Intégration Azure VMs
  - [ ] Intégration GCP Compute
- [ ] **Découverte automatique**
  - [ ] Scan réseau local
  - [ ] Sync avec CMDB

---

## 🔔 **Notifications & Monitoring** (Version 2.6.x)

### Centre de Notifications
- [ ] **Notifications collaboration**
  - [ ] Playbooks partagés avec moi
  - [ ] Modifications sur playbooks partagés
  - [ ] Commentaires et mentions
- [ ] **Notifications système**
  - [ ] Alertes validation/erreurs
  - [ ] Maintenance planifiée
  - [ ] Changelog in-app (nouveautés application)
- [ ] **Préférences**
  - [ ] Configuration par type de notification
  - [ ] Mode ne pas déranger

### Dashboard Admin
- [ ] **Monitoring système**
  - [ ] Utilisateurs actifs en temps réel
  - [ ] Playbooks créés par période
  - [ ] Performance API
  - [ ] Utilisation cache Redis
- [ ] **Statistiques**
  - [ ] Modules Galaxy les plus utilisés
  - [ ] Tendances d'utilisation
  - [ ] Rapports exportables

---

## 🔗 **Intégrations Git** (Version 2.7.x)

### Synchronisation Repository
- [ ] **Push/Pull playbooks**
  - [ ] Connexion à GitHub/GitLab
  - [ ] Push playbook vers repo
  - [ ] Pull playbook depuis repo
  - [ ] Gestion branches
- [ ] **Workflow Git**
  - [ ] Commit messages automatiques
  - [ ] Support .gitignore
  - [ ] Résolution conflits

---

## 🌐 **Site Marketing** (Version 2.8.x)

### Landing Page
- [ ] **Site vitrine Ansible Builder**
  - [ ] Page d'accueil avec présentation du produit
  - [ ] Fonctionnalités clés avec captures d'écran/GIFs
  - [ ] Démonstration interactive ou vidéo
  - [ ] Témoignages utilisateurs
  - [ ] Comparatif avec solutions concurrentes

### Contenu Marketing
- [ ] **Documentation publique**
  - [ ] Guide de démarrage rapide
  - [ ] FAQ
  - [ ] Cas d'usage par secteur/métier
- [ ] **Ressources**
  - [ ] Blog technique
  - [ ] Tutoriels vidéo
  - [ ] Changelog public

### Conversion
- [ ] **Call-to-action**
  - [ ] Formulaire d'inscription / demande de démo
  - [ ] Lien direct vers l'application
  - [ ] Newsletter
- [ ] **SEO & Analytics**
  - [ ] Optimisation référencement
  - [ ] Tracking visiteurs
  - [ ] A/B testing pages

---

## 🧪 **Test et Validation**

### Environnement de Test
- [ ] **Page Inventaire** (voir section Inventaire & Connexions)

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
- [ ] **Explication playbook par IA** (description naturelle de ce que fait un playbook)

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

*Document maintenu à jour. Dernière mise à jour : 2025-12-31*

*Pour ajouter des items au backlog, créer une issue GitHub ou contacter l'équipe de développement.*
