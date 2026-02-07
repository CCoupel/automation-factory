# Spécifications Frontend - Automation Factory

Ce document décrit les spécifications fonctionnelles et l'interface utilisateur de l'application frontend.

---

## 🎨 **Architecture de l'Interface**

### Layout Principal
L'interface est organisée en zones fonctionnelles redimensionnables et collapsibles :

```
┌─────────────────────────────────────────────────┐
│ Zone Play (Haute 1) - Informations Playbook    │
├─────────────────────────────────────────────────┤
│ Zone Vars (Haute 2) - Variables [Collapsible]  │
├──────────┬──────────────────────────┬───────────┤
│ Zone     │ Zone Centrale           │ Zone      │
│ Modules  │ (WorkZone/Playbook)     │ Config    │
│ [Resize] │ • Onglets PLAY          │ [Resize]  │
│          │ • Sections accordéon     │           │
│          │ • Canvas drag & drop     │           │
├──────────┴──────────────────────────┴───────────┤
│ Zone System (Basse) - Logs/Export [Collapsible] │
└─────────────────────────────────────────────────┘
```

---

## 📋 **Zone Play (Haute 1)**

### Fonction
Centralise les informations relatives au playbook en cours d'édition.

### Contenu
- **Nom du playbook** : Éditable
- **Version** : Affichage version courante
- **Statut sauvegarde** : Indicateur auto-save
- **Actions globales** : Nouveau, Charger, Sauvegarder

### Comportement
- **Fixe** : Ne peut pas être redimensionnée ou collapsée
- **Persistante** : Toujours visible
- **Éditable** : Modifications en temps réel

---

## 🔧 **Zone Vars (Haute 2)**

### Fonction
Gestion centralisée des variables du playbook.

### Contenu
- **Liste des variables** : Affichage sous forme de chips
- **Ajout/Suppression** : Interface de gestion
- **Validation** : Contrôle doublons et syntaxe
- **Types supportés** : String, Number, Boolean, Array, Object

### Comportement
- **Collapsible** : Peut être refermée pour économiser l'espace
- **Redimensionnable** : Hauteur ajustable
- **Dialog d'édition** : Modal pour ajout/modification variables

### Interface
```typescript
interface PlayVariable {
  key: string
  value: string | number | boolean
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
}
```

---

## 📚 **Zone Modules (Gauche)**

### Fonction
Palette de modules et éléments Ansible disponibles.

### Structure
**2 Onglets principaux :**

#### Onglet Generic
- **Éléments Ansible de base** :
  - `block` : Groupement avec gestion erreur
  - `include_tasks` : Inclusion de tâches depuis fichier
  - `import_tasks` : Import statique de tâches

#### Onglet Modules
- **Navigation Galaxy 4 niveaux** :
  1. **Namespaces** (2,204 découverts)
  2. **Collections** (par namespace)
  3. **Versions** (par collection)
  4. **Modules** (par version)

### Fonctionnalités
- **Recherche** : Filtre par nom ou description
- **Navigation breadcrumb** : `namespace.collection (version)`
- **Tooltips riches** : Informations détaillées au survol
- **Clic droit** : Accès direct dernière version
- **Auto-skip** : Navigation automatique si version unique
- **Tri alphabétique** : Tous niveaux
- **Indicateurs visuels** : Compteurs, téléchargements, dates

### Intégration Galaxy
- **Service SMART** : Performance optimisée <100ms
- **Enrichissement 3 niveaux** :
  - Populaires : 10 namespaces enrichis au démarrage
  - Background : Tâche de fond progressive
  - On-demand : À la sélection utilisateur
- **Cache TTL** : Frontend 15min, Backend 30min

### Comportement
- **Redimensionnable** : Largeur ajustable
- **Collapsible** : Peut être masquée
- **Drag source** : Éléments draggables vers canvas

---

## 🎯 **Zone Centrale (WorkZone)**

### Fonction
Zone principale de construction du playbook avec système d'onglets.

### Structure Onglets PLAY
Chaque onglet représente un PLAY Ansible complet :

```yaml
# Structure PLAY correspondante
- play:
    name: "Mon Play"
    hosts: "all"
    vars: []
    roles: []
    pre_tasks: []
    tasks: []
    post_tasks: []
    handlers: []
```

### Sections par PLAY
Chaque onglet PLAY contient des sections accordéon :

#### 1. Variables
- **Indépendante** : Fonctionne sans accordion
- **Chips display** : Variables sous forme de puces
- **Collapsible** : Peut être refermée
- **Redimensionnable** : Hauteur ajustable

#### 2. Roles
- **Indépendante** : Fonctionne sans accordion
- **Chips draggables** : Roles réorganisables
- **Actions** : Ajouter, supprimer, réorganiser
- **Icône** : ExtensionIcon (vert #4caf50)
- **Collapsible** et **redimensionnable**

#### 3. Sections Tasks (Pre-tasks, Tasks, Post-tasks, Handlers)
- **Behavior accordion** : Une seule section ouverte à la fois
- **Espace complet** : Occupe tout l'espace de travail
- **Canvas drag & drop** : Réception des tâches et blocks
- **Tâche START** : Toujours présente, non déplaçable/supprimable

### Navigation Onglets
- **variant="fullWidth"** : Répartition équitable sur largeur disponible
- **Icônes spécialisées** : Identification visuelle des sections
- **Badges compteurs** : Nombre d'éléments par section

---

## 🎮 **Système Drag & Drop**

### Sources de Drag
1. **Zone Modules** → Canvas sections
2. **Canvas** → Canvas (réorganisation)
3. **Roles** → Autres positions roles

### Targets de Drop
1. **Sections Tasks** : Pre-tasks, Tasks, Post-tasks, Handlers
2. **Blocks** : Dans sections normal, rescue, always
3. **Tâches existantes** : Création de liens

### Règles de Drop
- **Validation zone** : Modules seulement dans sections compatibles
- **Prévention cycles** : Pas de liens circulaires
- **Sections isolées** : Pas de liens inter-sections
- **Visual feedback** : Indicateurs drop valid/invalid

### Gestion État
```typescript
// États drag & drop
const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null)
const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
const [dropValidation, setDropValidation] = useState<boolean>(false)
```

---

## 🔗 **Système de Liens**

### Création de Liens
- **Method** : Glisser une tâche sur une autre
- **Visual** : Lignes SVG entre tâches
- **Limitation** : Un lien entrant/sortant par tâche
- **Portée** : Même section uniquement

### Types de Liens
- **Normal** : Exécution séquentielle
- **Conditionnel** : Avec when/failed_when
- **Block flow** : Gestion rescue/always

### Affichage
- **SVG section-scoped** : Rendu par section
- **Hover effects** : Bouton suppression au survol
- **Calcul positions** : Coordonnées automatiques
- **Responsive** : Adaptation au redimensionnement

### Gestion État
```typescript
interface Link {
  id: string
  from: string  // Source task ID
  to: string    // Destination task ID
  type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
}
```

---

## 📋 **Architecture Blocks**

### Structure Block
Chaque block contient 3 sections :
- **Normal (Tasks)** : Exécution normale
- **Rescue** : Gestion des erreurs
- **Always** : Exécution garantie

### Interface Block
```typescript
interface ModuleBlock {
  isBlock?: boolean
  blockSections?: {
    normal: string[]   // IDs des tâches normales
    rescue: string[]   // IDs des tâches rescue  
    always: string[]   // IDs des tâches always
  }
}
```

### Comportement
- **Collapsible sections** : Chaque section peut être réduite
- **Default state** : Tasks ouverte, Rescue/Always fermées
- **Drag & drop** : Réception dans chaque section
- **Visual distinction** : Couleurs différentes par section

---

## ⚙️ **Zone Configuration (Droite)**

### Fonction
Panneau de propriétés contextuel pour l'élément sélectionné.

### Modes d'Affichage

#### Mode Module Sélectionné
- **Propriétés module** : Paramètres Ansible spécifiques
- **Attributs tâche** : when, ignore_errors, become, loop, delegate_to
- **Form validation** : Contrôle syntaxe temps réel
- **Documentation** : Aide contextuelle module

#### Mode Play (aucune sélection)
- **Propriétés PLAY** : hosts, remote_user, gather_facts
- **Configuration globale** : Variables d'environnement
- **Paramètres avancés** : Connection, become, etc.

### Comportement
- **Redimensionnable** : Largeur ajustable
- **Contextuel** : Contenu selon sélection
- **Validation temps réel** : Erreurs/warnings immédiats

---

## 📱 **Zone System (Basse)**

### Fonction
Outils système et informations de développement.

### Contenu
- **Export YAML** : Génération playbook final
- **Logs système** : Messages debug/error
- **Résultats compilation** : Validation syntaxe
- **Métriques performance** : Temps de réponse API

### Comportement
- **Collapsible** : Peut être masquée
- **Redimensionnable** : Hauteur ajustable
- **Tabs internes** : Organisation par type d'information

---

## 🎨 **Thème et Styling**

### Design System
- **UI Library** : Material-UI (MUI)
- **Color Scheme** : 
  - Primary: Blue (#1976d2)
  - Secondary: Green (#4caf50) 
  - Error: Red (#d32f2f)
  - Warning: Orange (#ff9800)

### Responsive Design
- **Breakpoints** : Mobile, Tablet, Desktop
- **Adaptive layout** : Redimensionnement intelligent
- **Touch support** : Interactions tactiles

### Accessibility
- **ARIA labels** : Support lecteurs d'écran
- **Keyboard navigation** : Accessibilité clavier
- **Contrast ratios** : Conformité WCAG

---

## 🔄 **State Management**

### Architecture État
- **React Hooks** : useState pour état local
- **Context API** : État partagé (Galaxy, Auth, Theme)
- **Sets pour tracking** : Performance optimisée

### États Principaux
```typescript
// Modules et structure
const [modules, setModules] = useState<ModuleBlock[]>([])
const [links, setLinks] = useState<Link[]>([])

// UI State
const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set())
const [selectedModule, setSelectedModule] = useState<string | null>(null)

// Drag & Drop
const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null)
```

### Persistance
- **Auto-save** : Sauvegarde automatique avec debounce 3s
- **Local Storage** : Cache état interface
- **Backend sync** : Synchronisation playbooks

---

## 📊 **Performance**

### Métriques Cibles
- **Rendering** : 60fps drag & drop
- **API calls** : <2s response time
- **Memory** : <100MB utilisation
- **Bundle size** : <1MB gzipped

### Optimisations
- **Lazy loading** : Chargement à la demande
- **Virtualization** : Listes longues
- **Memoization** : React.memo pour composants
- **Debouncing** : Événements fréquents

---

*Voir aussi :*
- [Implémentation Frontend](FRONTEND_IMPLEMENTATION.md)
- [Optimisations Frontend](../../frontend/docs/README_OPTIMISATION.md)
- [Architecture Decisions](../core/ARCHITECTURE_DECISIONS.md)