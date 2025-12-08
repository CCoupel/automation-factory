# Vue d'Ensemble du Projet - Ansible Builder

Ce document décrit les objectifs, fonctionnalités et architecture générale du projet Ansible Builder.

---

## 🎯 **Description du Projet**

Ansible Builder est un constructeur graphique de playbook Ansible qui permet aux utilisateurs de créer des playbooks de manière visuelle et intuitive.

### Objectifs Principaux
- **Simplification** : Rendre Ansible accessible via une interface graphique
- **Productivité** : Accélérer la création de playbooks complexes
- **Réutilisation** : Faciliter l'utilisation de modules et collections existantes
- **Visualisation** : Offrir une représentation claire des flux d'exécution

### Mode de Fonctionnement
- **SaaS** : Application web accessible via navigateur
- **Temps réel** : Interface réactive avec drag & drop
- **Intégration Galaxy** : Accès à l'écosystème Ansible complet
- **Export** : Génération de playbooks YAML standard

---

## ⚙️ **Fonctionnalités Principales**

### 🔧 **Construction Graphique**
- **Drag & Drop** : Glisser-déposer des modules depuis la palette
- **Zones organisées** : Interface structurée en zones fonctionnelles
- **Liens visuels** : Création de liens d'exécution entre tâches
- **Blocks Ansible** : Support des structures de contrôle (block/rescue/always)

### 📦 **Intégration Galaxy**
- **2,204 namespaces** découverts automatiquement
- **Navigation hiérarchique** : Namespaces → Collections → Versions → Modules
- **Performance optimisée** : Service SMART avec cache multi-niveaux
- **Enrichissement dynamique** : Chargement des statistiques à la demande

### 🎮 **Interface Utilisateur**
- **Zones redimensionnables** : Adaptation à l'écran utilisateur
- **Onglets PLAY** : Organisation par plays Ansible
- **Sections accordéon** : Variables, Roles, Pre-tasks, Tasks, Post-tasks, Handlers
- **Configuration contextuelle** : Panneau de propriétés intelligent

---

## 🏗️ **Architecture de l'Interface**

### Layout Principal
```
┌─────────────────────────────────────────────────┐
│ Zone Play (Haute 1) - Infos Playbook           │
├─────────────────────────────────────────────────┤
│ Zone Vars (Haute 2) - Variables (Collapsible)  │
├──────────┬──────────────────────────┬───────────┤
│ Zone     │ Zone Centrale           │ Zone      │
│ Modules  │ (Workzone/Playbook)     │ Config    │
│ (Gauche) │ • Onglets PLAY          │ (Droite)  │
│          │ • Sections accordéon     │           │
│          │ • Drag & Drop canvas     │           │
├──────────┴──────────────────────────┴───────────┤
│ Zone System (Basse) - Logs/Export (Collapsible) │
└─────────────────────────────────────────────────┘
```

### Zones Fonctionnelles

**Zone Modules (Gauche)**
- Onglet **Generic** : Éléments Ansible de base (block, include_tasks, etc.)
- Onglet **Modules** : Navigation Galaxy avec 4 niveaux
- **Redimensionnable** et **collapsible**

**Zone Centrale (WorkZone)**
- **Onglets PLAY** : Un onglet par play Ansible
- **Sections accordéon** : Variables, Roles, Pre-tasks, Tasks, Post-tasks, Handlers
- **Canvas drag & drop** : Zone de construction visuelle

**Zone Configuration (Droite)**
- **Propriétés contextuelles** : Configuration du module sélectionné
- **Propriétés PLAY** : Configuration globale si aucune sélection
- **Redimensionnable**

---

## 🔗 **Système de Liens**

### Règles de Liaison
- **Un lien par tâche** : Une tâche ne peut avoir qu'un seul lien entrant et sortant
- **Même section uniquement** : Pas de liens inter-sections (Tasks ↔ Pre-tasks)
- **Drag & Drop** : Créer un lien en déplaçant une tâche sur une autre
- **Validation automatique** : Prévention des cycles et liens invalides

### Types de Liens
- **Normal** : Exécution séquentielle standard
- **Conditionnel** : Avec conditions when/failed_when
- **Block sections** : Gestion rescue/always

---

## 📋 **Structure Playbook**

### Hiérarchie Ansible
```yaml
# Playbook
- play:                    # PLAY (onglet)
    name: "Mon Play"
    hosts: "all"
    vars:                  # Section Variables
      - var1: value1
    roles:                 # Section Roles
      - role.name
    pre_tasks:             # Section Pre-tasks
      - task1
    tasks:                 # Section Tasks (principale)
      - task2
      - block:             # Block avec 3 sections
          - task3          # Normal
        rescue:            # Rescue
          - task4
        always:            # Always
          - task5
    post_tasks:            # Section Post-tasks
      - task6
    handlers:              # Section Handlers
      - handler1
```

### Correspondance Interface
- **Onglet PLAY** = Un play Ansible
- **Section Variables** = vars du play
- **Section Roles** = roles du play
- **Sections Tasks** = pre_tasks, tasks, post_tasks, handlers
- **Blocks** = Conteneurs avec 3 sous-sections (normal/rescue/always)

---

## 🎯 **Cas d'Usage Principaux**

### 1. **Créer un Playbook Simple**
1. Ouvrir Zone Modules → Generic
2. Glisser une tâche dans Tasks
3. Configurer via Zone Configuration
4. Exporter le YAML

### 2. **Utiliser Galaxy Collections**
1. Zone Modules → Onglet Modules
2. Naviguer : Namespace → Collection → Version → Module
3. Glisser le module dans le canvas
4. Configurer les paramètres

### 3. **Gérer les Erreurs**
1. Créer un block dans Tasks
2. Ajouter tâches dans section normal
3. Ajouter gestion erreur dans rescue
4. Ajouter nettoyage dans always

### 4. **Organiser l'Exécution**
1. Utiliser Pre-tasks pour prérequis
2. Tasks pour logique principale
3. Post-tasks pour finalisation
4. Handlers pour réactions

---

## 📊 **Métriques Projet**

### Code Base
- **Frontend** : React/TypeScript (~50 composants)
- **Backend** : FastAPI/Python (~20 services)
- **Documentation** : Organisée en modules spécialisés

### Performance
- **Galaxy API** : <100ms response (>99% amélioration)
- **Interface** : Drag & drop fluide 60fps
- **Cache** : Multi-niveaux (frontend + backend + Redis)

### Données
- **2,204 namespaces** Ansible découverts
- **Enrichissement 3 niveaux** : populaires + background + on-demand
- **Cache intelligent** : TTL optimisé selon usage

---

## 🚀 **Prochaines Évolutions**

### Court Terme
- Formulaires dynamiques pour configuration modules
- Prévisualisation YAML temps réel
- Validation syntaxe et cycles

### Moyen Terme
- Système de templates de playbooks
- Collaboration multi-utilisateurs
- Intégration CI/CD

### Long Terme
- Mode exécution playbooks
- Monitoring et métriques
- Extensions et plugins

---

*Voir aussi :*
- [Spécifications Frontend](../frontend/FRONTEND_SPECS.md)
- [Spécifications Backend](../backend/BACKEND_SPECS.md)
- [Architecture Decisions](ARCHITECTURE_DECISIONS.md)