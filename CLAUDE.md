# Guide Claude - Ansible Builder

Ce document est destiné aux futures instances de Claude travaillant sur ce projet. Il contient l'architecture, les décisions importantes, les patterns à respecter et les pièges à éviter.

---

## 📋 Vue d'Ensemble du Projet

### Description
Ansible Builder est un constructeur graphique de playbook ansible.
- Fonctionnement en mode SaaS avec une interface web
- Le backend collecte les modules disponibles sur le site d'Ansible
- Les modules collectés sont disponibles dans la zone modules de l'interface, organisés par collection
- Les modules peuvent être drag-and-drop dans la partie centrale de l'interface afin de construire le playbook
- Une tâche peut être déplacée librement sur la zone de travail
- Une tâche incluse dans un block peut être déplacée librement à l'intérieur de ce block

**Système de liens:**
- En déplaçant une tâche sur une autre, un lien se crée entre la tâche cible et la tâche déplacée
- Une tâche ne peut avoir qu'un seul lien entrant et un seul lien sortant
- Il n'est pas possible de déplacer une tâche d'une zone vers une tâche d'une autre zone (par exemple on ne peut pas lier une tâche de la zone de travail sur une tâche d'une zone d'un block)

### Architecture de l'Interface

L'interface se compose de plusieurs parties:

**Barre haute 1 (Zone Play):**
- Centralise les informations relatives au playbook (version, nom...)

**Barre haute 2 (Zone Vars):**
- Centralise les variables du playbook
- doit pouvoir etre refermée

**Barre basse (Zone System):**
- Permet de télécharger le playbook résultant
- Affiche les logs
- Affiche les résultats de compilation
- La zone est redimensionnable
- doit pouvoir etre refermée

**Zone gauche (Zone Modules):**
- 2 onglets: Generic et Modules
- La zone est redimensionnable
- Affiche les modules organisés par collection
- doit pouvoir etre refermée


**Zone centrale (Zone de Travail/Playbook):**
- Représente le playbook 
- organisé sous forme d'onglets par PLAY

**Zone interne (Zone de Play):**
- Représente le playbook
- organisé sous forme d'onglets par PLAY
- **Barre de navigation des onglets** : Les onglets des sections (Roles, Pre-Tasks, Tasks, Post-Tasks, Handlers) utilisent `variant="fullWidth"` pour se répartir équitablement sur toute la largeur disponible
- se presente sous la forme d'un accordeon de
  - Variables:
    - liste les variables du Play sous la forme de Chips
    - peut être refermée et redimensionnée
    - fonctionne indépendamment des autres sections (pas d'accordion)
  - Roles:
    - liste les roles Ansible du Play sous la forme de Chips draggables
    - peut être refermée et redimensionnée
    - fonctionne indépendamment des autres sections (pas d'accordion)
    - permet d'ajouter, supprimer et réorganiser les roles par drag & drop
    - icône ExtensionIcon (vert #4caf50) affichée dans les onglets PLAY
  - Pre-tasks, Tasks, Post-tasks et Handlers
    - 1 seul section ouverte a la fois (comportement accordion)
    - occupe tout l'espace de travail
    - chaque section peut recevoir les taches et les blocks
    - une tache speciale (START) est toujours présente sans pouvoir être déplacée ni supprimée


**Zone droite (Zone de Configuration):**
- Représente les éléments de configuration du module sélectionné
- Si aucun élément n'est sélectionné, cette zone fournit la configuration du play lui-même
- La zone est redimensionnable

---

## 🧱 Architecture des Blocks (3 Sections)

### Structure des Blocks

Chaque block Ansible est composé de **3 sections intégrées**:

1. **Tasks** (section normale) - Fond bleu transparent (`rgba(25, 118, 210, 0.08)`)
2. **Rescue** (gestion d'erreurs) - Fond orange transparent (`rgba(255, 152, 0, 0.08)`)
3. **Always** (toujours exécuté) - Fond vert transparent (`rgba(76, 175, 80, 0.08)`)

### Comportement Accordion

**État par défaut:**
- À la création d'un block, seule la section **Tasks** est ouverte
- Les sections Rescue et Always sont fermées par défaut

**Comportement:**
- Une seule section peut être ouverte à la fois (comportement accordion)
- Quand on ouvre une section, les autres se ferment automatiquement
- Chaque section a un header cliquable avec une icône expand/collapse

**Dimensions dynamiques:**
- Le block ajuste automatiquement sa hauteur selon la section ouverte
- Headers de sections: 25px chacun
- Contenu de section ouverte: minimum 200px
- Les sections fermées ne montrent que leur header

**Collapse du block entier:**
- Un block peut être complètement collapsé (réduit) via l'icône dans son header
- Quand collapsé, le block prend la taille d'une tâche normale : **140x60px**
- Cette taille uniforme permet une cohérence visuelle avec les autres éléments
- Au collapse, les sections internes sont cachées (visibilité conditionnelle)
- À l'expansion, le block reprend sa taille calculée selon la section ouverte

**Redimensionnement hybride (manuel + automatique):**
- Les blocks supportent le **redimensionnement manuel** via les poignées de redimensionnement
- Les dimensions manuelles (`block.width`, `block.height`) servent de **taille minimum**
- Le block **s'agrandit automatiquement** si le contenu dépasse la taille manuelle
- Le block **ne se réduit jamais** en dessous de la taille manuelle définie
- Algorithme: `finalSize = Math.max(manualSize, calculatedContentSize)`
- Permet d'éviter le débordement des tâches/blocks imbriqués tout en gardant le contrôle manuel
- Calcul récursif: pour un block imbriqué, `getBlockDimensions()` s'appelle lui-même

### Gestion des Tâches dans les Sections

**Positionnement:**
- Les tâches dans les sections utilisent un positionnement absolu (`position: absolute`)
- Coordonnées relatives à la section parente
- Les tâches peuvent être déplacées librement dans leur section

**Propriétés des tâches:**
- `parentId`: ID du block parent
- `parentSection`: 'normal', 'rescue', ou 'always'
- `x`, `y`: Position relative dans la section

**Visibilité:**
- Les tâches sont cachées quand on réduit (collapse) le block entier
- Les tâches sont cachées quand on réduit leur section spécifique
- Les liens entre tâches sont aussi cachés dans ces cas

### Mini START Tasks

Chaque section de block (normal, rescue, always) possède un **mini START task** qui sert de point de départ pour les liens dans la section.

**Apparence:**
- Dimensions: 60x40px (identique aux PLAY START tasks)
- Position fixe: (20, 10) dans chaque section
- Border radius: '0 50% 50% 0' (demi-cercle à droite, comme les PLAY START)
- Couleur thème selon la section:
  - Normal (Tasks): Bleu (`#1976d2`)
  - Rescue: Orange (`#ff9800`)
  - Always: Vert (`#4caf50`)
- Background: Couleur de section avec opacité 15% (ex: `${getSectionColor(section)}15`)
- Texte: "START" en caption, couleur de la section

**Comportement:**
- **Draggable:** Peut être glissé-déposé pour créer des liens
- **Non-déplaçable:** Reste toujours à la position (20, 10)
- **Création de liens:** Drop sur une tâche/block de la même section crée un lien
- **Validation:** Les liens ne peuvent être créés qu'avec des tâches/blocks de la même section
- **Prévention:** Ne crée pas de liens avec les headers d'accordéon

---

## 🎭 Architecture des Sections PLAY

### Structure des Sections PLAY

Les sections PLAY (Pre-tasks, Tasks, Post-tasks, Handlers) organisent le workflow du playbook Ansible.

**Sections disponibles:**
1. **Variables** - Gère les variables du PLAY
2. **Pre-tasks** - Tâches exécutées avant les rôles
3. **Tasks** - Tâches principales (section ouverte par défaut)
4. **Post-tasks** - Tâches exécutées après les rôles
5. **Handlers** - Gestionnaires d'événements

### PLAY START Tasks

Chaque section PLAY (Pre-tasks, Tasks, Post-tasks, Handlers) possède un **PLAY START task** qui sert de point de départ pour les liens dans la section.

**Apparence:**
- Dimensions: 60x40px (identique aux mini START tasks des blocks)
- Position initiale: (50, 20) dans chaque section
- Border radius: '0 50% 50% 0' (demi-cercle à droite)
- Couleur thème selon la section PLAY (via `getPlaySectionColor()`)
- Background: Couleur de section avec opacité 15%
- Texte: "START" en caption, couleur de la section
- **Simplifié:** Pas de TextField, pas d'icônes d'attributs, juste "START" centré

**Comportement:**
- **Draggable:** Peut être glissé-déposé pour créer des liens
- **Validation:** Les liens ne peuvent être créés qu'avec des tâches de la même section PLAY
- **Identifiant:** `isPlay: true` dans l'interface ModuleBlock

### Attributs de Sections PLAY

Les sections PLAY peuvent avoir leurs propres attributs qui s'appliquent à toutes les tâches de la section.

**Interface:**
```typescript
interface PlaySectionAttributes {
  when?: string
  ignoreErrors?: boolean
  become?: boolean
  loop?: string
  delegateTo?: string
}

interface Play {
  // ... autres propriétés
  sectionAttributes?: {
    pre_tasks?: PlaySectionAttributes
    tasks?: PlaySectionAttributes
    post_tasks?: PlaySectionAttributes
    handlers?: PlaySectionAttributes
  }
}
```

**Affichage sur les Headers d'Accordéon:**
- Icônes d'attributs affichées à droite du nom de la section
- HelpOutlineIcon (bleu) - `when` condition
- ErrorOutlineIcon (orange) - `ignoreErrors`
- SecurityIcon (rouge) - `become`
- LoopIcon (vert) - `loop`
- SendIcon (cyan) - `delegateTo`
- Icônes grises quand l'attribut n'est pas défini, colorées quand actif

**Configuration:**
- Bouton SettingsIcon sur chaque header pour ouvrir la configuration
- Click sur le bouton appelle `onSelectModule()` avec:
  - `id`: 'section-pre_tasks', 'section-tasks', 'section-post_tasks', ou 'section-handlers'
  - `collection`: 'section'
  - `name`: 'Pre-Tasks Section', 'Tasks Section', etc.
  - Attributs actuels de la section

**Mise à jour des Attributs:**
- Gérée par `handleUpdateModuleAttributes()` dans WorkZone
- Détecte les IDs commençant par 'section-'
- Met à jour `sectionAttributes` dans le Play actif
- Rafraîchit automatiquement les icônes sur le header

**Initialisation:**
- Chaque nouveau PLAY initialise `sectionAttributes` avec des objets vides pour chaque section
- Permet d'éviter les vérifications null/undefined dans le code

**Pattern d'ID:**
- Format: `${blockId}-${section}-start`
- Exemple: `"abc123-normal-start"`, `"def456-rescue-start"`
- Permet l'identification via le pattern `id.endsWith('-start')`

**Système de Module Virtuel:**

Les mini START tasks n'existent pas dans le tableau `modules[]`. Pour gérer leur positionnement et les liens, un système de **module virtuel** a été implémenté:

```typescript
const getModuleOrVirtual = (moduleId: string): ModuleBlock | null => {
  // Essayer de trouver dans modules
  const module = modules.find(m => m.id === moduleId)
  if (module) return module

  // Si c'est un mini START task (pattern: blockId-section-start)
  if (moduleId.endsWith('-start')) {
    // Obtenir position depuis le DOM via data-task-id
    const taskElement = document.querySelector(`[data-task-id="${moduleId}"]`)

    // Calculer position absolue relative au conteneur
    // ...

    // Créer un module virtuel
    return {
      id: moduleId,
      collection: 'virtual',
      name: 'mini-start',
      x, y,
      isBlock: false,
      isPlay: false,
    }
  }

  return null
}
```

**Utilisation dans le rendu des liens:**
```typescript
// Au lieu de modules.find()
const fromModule = getModuleOrVirtual(link.from)
const toModule = getModuleOrVirtual(link.to)
```

**Calcul du type de lien:**
```typescript
const getLinkTypeFromSource = (sourceId: string) => {
  // Mini START tasks des sections de blocks
  if (sourceId.endsWith('-start')) {
    if (sourceId.includes('-normal-start')) return 'normal'
    if (sourceId.includes('-rescue-start')) return 'rescue'
    if (sourceId.includes('-always-start')) return 'always'
  }
  // ...
}
```

**Liens depuis PLAY START vers Blocks:**

Les START tasks des sections PLAY (pre_tasks, tasks, post_tasks, handlers) peuvent créer des liens avec des blocks entiers quand ils sont droppés dans une section de block:

- Le PLAY START n'est **pas déplacé** dans la section du block
- Un lien est créé entre le PLAY START et le **block entier** (pas une tâche spécifique)
- Type de lien: selon la section PLAY source ('pre_tasks', 'tasks', 'post_tasks', 'handlers')

```typescript
// Dans handleBlockSectionDrop
if (sourceModule && sourceModule.isPlay) {
  e.preventDefault()
  e.stopPropagation()
  createLink(getLinkTypeFromSource(sourceId), sourceId, blockId)
  return
}
```

---

## 🎯 Système de Drag & Drop

### Règles de Propagation des Événements

**Principe général:** Ne bloquer `preventDefault()` et `stopPropagation()` que quand on traite effectivement l'événement.

#### Handlers `onDragStart`

```typescript
const handleModuleDragStart = (id: string, e: React.DragEvent) => {
  // ... set dataTransfer data ...

  // IMPORTANT: Bloquer la propagation pour éviter que le block parent
  // ne capture le drag d'une tâche enfant
  e.stopPropagation()
}
```

#### Handlers `onDragOver`

**Sections:** Ne PAS bloquer la propagation
```typescript
onDragOver={(e) => {
  e.preventDefault()
  // Ne pas bloquer la propagation pour permettre au canvas de recevoir l'événement
}}
```

**Block Paper:** Ne PAS bloquer la propagation
```typescript
const handleModuleDragOver = (targetId: string, e: React.DragEvent) => {
  e.preventDefault()
  // Ne pas bloquer la propagation
}
```

#### Handlers `onDrop`

**Règle: Vérifier si on doit traiter l'événement AVANT de bloquer la propagation**

**Sections:**
```typescript
onDrop={(e) => {
  const sourceId = e.dataTransfer.getData('existingModule')

  // Si on drop le block parent sur sa propre section, laisser remonter
  if (sourceId === module.id) {
    return // Pas de preventDefault, pas de stopPropagation
  }

  // Traiter les différents cas et bloquer la propagation seulement si on traite
  if (sourceId) {
    const sourceModule = modules.find(m => m.id === sourceId)

    // Même section - repositionnement
    if (sourceModule.parentId === module.id && sourceModule.parentSection === 'normal') {
      e.preventDefault()
      e.stopPropagation()
      // ... repositionner ...
      return
    }

    // Autres cas...
  }
}
```

**Tâches:**
```typescript
onDrop={(e) => {
  const sourceId = e.dataTransfer.getData('existingModule')

  // Si drop sur soi-même, laisser remonter à la section pour repositionnement
  if (sourceId === task.id) {
    return // Pas de preventDefault, pas de stopPropagation
  }

  // Sinon traiter (créer lien, etc.)
  e.preventDefault()
  e.stopPropagation()
  // ...
}
```

**Block/Module handlers:**
```typescript
const handleModuleDropOnModule = (targetId: string, e: React.DragEvent) => {
  const sourceId = e.dataTransfer.getData('existingModule')

  // Si drop sur soi-même, laisser remonter pour déplacement
  if (sourceId === targetId) {
    return // Pas de preventDefault, pas de stopPropagation
  }

  // Bloquer seulement si on crée un lien
  e.preventDefault()
  e.stopPropagation()
  // ...
}
```

### Comportements de Drop

#### Drop d'un module depuis la palette

**Dans une section:**
- Crée une nouvelle tâche dans la section
- Position calculée relative à la section
- Contrainte dans les limites de la section

**Dans la zone de travail:**
- Crée une nouvelle tâche/block à la racine

#### Drop d'une tâche existante

**Sur elle-même:**
- Repositionnement (déplacement)
- L'événement remonte au handler parent approprié

**Sur une autre tâche (même section):**
- Crée un lien entre les deux tâches
- Type de lien: 'normal'

**Sur une autre tâche (section différente ou zone de travail):**
- Si la tâche source a un lien parent → crée un lien avec le block
- Si la tâche source est orpheline → déplace la tâche dans la nouvelle section/zone

**D'une section vers l'extérieur du block:**
- Si la tâche n'a pas de liens → la détache et la déplace dans la zone de travail
- Si la tâche a des liens → bloque le déplacement (reste dans la section)

**D'un block sur lui-même (sur sa section ou header):**
- Repositionne le block
- L'événement remonte au canvas

### Calcul des Positions

#### Position absolue des tâches dans sections de blocks

**Approche récursive** pour gérer les blocks imbriqués et les blocks dans les sections PLAY :

```typescript
const getModuleAbsolutePosition = (module: ModuleBlock) => {
  if (module.parentId && module.parentSection) {
    // Tâche dans une section de block
    // Calculer position = position absolue du block parent + offset de la section + coordonnées de la tâche

    const parentBlock = modules.find(m => m.id === module.parentId)
    if (parentBlock) {
      // Obtenir la position absolue du block parent (récursif si block imbriqué)
      const parentPosition = getModuleAbsolutePosition(parentBlock)

      // Ajouter header du block (50px)
      const blockHeaderHeight = 50
      absoluteY = parentPosition.y + blockHeaderHeight

      // Ajouter hauteur des sections précédentes (avec accordion)
      const sectionHeaderHeight = 25
      const minContentHeight = 200

      const sections = ['normal', 'rescue', 'always'] as const
      for (const section of sections) {
        if (section === module.parentSection) {
          // C'est notre section, ajouter le header et arrêter
          absoluteY += sectionHeaderHeight
          break
        }

        // Section précédente : ajouter header
        absoluteY += sectionHeaderHeight

        // Si la section précédente n'est pas collapsed, ajouter le contenu
        if (!isSectionCollapsed(module.parentId, section)) {
          absoluteY += minContentHeight
        }
      }

      // Position X = position X du block parent
      absoluteX = parentPosition.x

      // Compensation du padding de la section Box (p: 0.5 = 4px en MUI)
      const padding = 4

      // Ajouter les coordonnées de la tâche + padding
      absoluteX += padding + module.x
      absoluteY += padding + module.y
    }
  }

  return { x: absoluteX, y: absoluteY }
}
```

**Points clés:**
- **Récursion** : `getModuleAbsolutePosition(parentBlock)` permet de gérer les blocks imbriqués à n niveaux
- **Padding compensé** : Le padding de 4px de la section Box (`p: 0.5`) est ajouté explicitement
- **Coordonnées React** : Utilise `module.x` et `module.y` de l'état React (mis à jour immédiatement après drop)
- **Accordion géré** : Les sections collapsed ne contribuent que leur header (25px), pas leur contenu (200px)
- **Indépendant du DOM** : Ne dépend pas de `playSectionsContainerRef` ou `getBoundingClientRect()` pour les blocks

#### Position absolue des tâches dans sections PLAY

**Problème initial:**
Les liens n'étaient pas alignés correctement avec les bords des tâches dans les sections PLAY (pre_tasks, tasks, post_tasks, handlers). Le point d'accroche était décalé vers la droite et vers le bas.

**Cause racine:**
L'utilisation de `getBoundingClientRect()` sur l'élément tâche pendant le rendu retournait l'ancienne position DOM avant que React ne mette à jour le DOM après un drop. Les liens étaient donc calculés avec les coordonnées obsolètes.

**Solution adoptée:**
Utiliser les coordonnées de l'état React (`module.x`, `module.y`) qui sont mises à jour immédiatement, combinées avec la position de la section parente.

```typescript
// Calcul de position pour tâches dans sections PLAY
if (module.parentSection && !module.parentId) {
  // 1. Mapper le ref approprié selon la section
  let sectionRef: React.RefObject<HTMLDivElement> | null = null
  switch (module.parentSection) {
    case 'variables': sectionRef = variablesSectionRef; break
    case 'pre_tasks': sectionRef = preTasksSectionRef; break
    case 'tasks': sectionRef = tasksSectionRef; break
    case 'post_tasks': sectionRef = postTasksSectionRef; break
    case 'handlers': sectionRef = handlersSectionRef; break
  }

  // 2. Obtenir position de la section via getBoundingClientRect
  const containerRect = playSectionsContainerRef.current.getBoundingClientRect()
  const sectionRect = sectionRef.current.getBoundingClientRect()

  // 3. Calculer position relative (avec compensation scroll)
  const sectionRelativeTop = sectionRect.top - containerRect.top + containerScrollTop
  const sectionRelativeLeft = sectionRect.left - containerRect.left + containerScrollLeft

  // 4. Position absolue = position section + coordonnées état React
  // IMPORTANT: NE PAS ajouter le padding car module.x/y sont déjà
  // relatifs au bord intérieur (après padding)
  absoluteX = sectionRelativeLeft + module.x
  absoluteY = sectionRelativeTop + module.y

  // 5. Obtenir dimensions réelles via DOM pour calcul correct du bord bas
  const taskElement = document.querySelector(`[data-task-id="${module.id}"]`)
  if (taskElement) {
    const taskRect = taskElement.getBoundingClientRect()
    dims = { width: taskRect.width, height: taskRect.height }
  }
}
```

**Points clés de la solution:**

1. **Utiliser l'état React pour position:** `module.x` et `module.y` sont mis à jour immédiatement dans l'état après un drop, contrairement au DOM qui se met à jour après le re-render

2. **Calculer position de section via getBoundingClientRect:** Pour obtenir la position absolue de la section dans le conteneur

3. **Compensation du scroll:** Ajouter `scrollTop` et `scrollLeft` du conteneur pour gérer le cas où l'utilisateur a scrollé

4. **NE PAS ajouter le padding:** Les coordonnées `module.x` et `module.y` sont déjà relatives au bord intérieur de la section (après padding de 16px = `p: 2` en MUI)

5. **Récupérer dimensions réelles:** Utiliser `getBoundingClientRect()` sur l'élément tâche pour obtenir la hauteur/largeur réelle et corriger le point d'accroche du bord bas

6. **Attribut data-task-id:** Chaque tâche Paper possède `data-task-id={task.id}` pour permettre la sélection DOM via `querySelector()`

**Références DOM nécessaires:**
- `playSectionsContainerRef`: Conteneur principal des sections PLAY
- `variablesSectionRef`, `preTasksSectionRef`, `tasksSectionRef`, `postTasksSectionRef`, `handlersSectionRef`: Refs individuels pour chaque section

**Résultat:**
Les 4 points d'accroche (haut, bas, gauche, droite) sont maintenant parfaitement alignés avec les bords des tâches, même immédiatement après un drag & drop.

#### Position absolue des mini START tasks

**Approche récursive** identique aux tâches normales dans les sections de blocks :

```typescript
const getModuleOrVirtual = (moduleId: string): ModuleBlock | null => {
  // Si c'est un mini START task (pattern: blockId-section-start)
  if (moduleId.endsWith('-start')) {
    const parts = moduleId.split('-')
    if (parts.length >= 3 && parts[parts.length - 1] === 'start') {
      const section = parts[parts.length - 2] as 'normal' | 'rescue' | 'always'
      const blockId = parts.slice(0, -2).join('-')

      // Calculer position = position absolue du block parent + offset de la section + coordonnées hardcodées (20, 10)
      const parentBlock = modules.find(m => m.id === blockId)

      if (parentBlock) {
        // Obtenir la position absolue du block parent (récursif si block imbriqué)
        const parentPosition = getModuleAbsolutePosition(parentBlock)

        // Ajouter header du block (50px)
        const blockHeaderHeight = 50
        let y = parentPosition.y + blockHeaderHeight

        // Ajouter hauteur des sections précédentes (avec accordion)
        const sectionHeaderHeight = 25
        const minContentHeight = 200

        const sections = ['normal', 'rescue', 'always'] as const
        for (const sect of sections) {
          if (sect === section) {
            // C'est notre section, ajouter le header et arrêter
            y += sectionHeaderHeight
            break
          }

          // Section précédente : ajouter header
          y += sectionHeaderHeight

          // Si la section précédente n'est pas collapsed, ajouter le contenu
          if (!isSectionCollapsed(blockId, sect)) {
            y += minContentHeight
          }
        }

        // Position X = position X du block parent
        let x = parentPosition.x

        // Compensation du padding de la section Box (p: 0.5 = 4px en MUI)
        const padding = 4

        // Ajouter les coordonnées hardcodées du mini START + padding
        x += padding + 20
        y += padding + 10

        // Créer un module virtuel
        return {
          id: moduleId,
          collection: 'virtual',
          name: 'mini-start',
          x, y,
          isBlock: false,
          isPlay: false,
        }
      }
    }
  }

  return null
}
```

**Points clés:**
- **Même approche récursive** que pour les tâches normales : utilise `getModuleAbsolutePosition(parentBlock)`
- **Coordonnées hardcodées** : Les mini START sont toujours à (20, 10) dans leur section
- **Module virtuel** : Les mini START n'existent pas dans `modules[]`, créés dynamiquement
- **Pattern d'ID** : `${blockId}-${section}-start` permet l'identification via `endsWith('-start')`

---

## 🔗 Système de Liens

### Types de Liens

- **normal**: Lien séquentiel standard entre tâches
- **rescue**: Lien vers section rescue d'un block
- **always**: Lien vers section always d'un block
- **pre_tasks, tasks, post_tasks, handlers**: Liens depuis un PLAY

### Règles de Validation des Liens

**Principe fondamental:** Les liens ne peuvent être créés qu'entre tâches de la **même section**.

#### Validation pour Mini START Tasks

Les mini START tasks (dans les sections de blocks) peuvent uniquement créer des liens avec des tâches/blocks de **la même section du même block**:

```typescript
// Dans handleModuleDropOnModule (lignes 572-577)
if (targetModule.parentId !== blockId || targetModule.parentSection !== section) {
  console.log('Mini START can only create links with tasks in the same section')
  setDraggedModuleId(null)
  return
}
```

#### Validation pour PLAY START Tasks

Les PLAY START tasks peuvent uniquement créer des liens avec des tâches de **la même section PLAY**:

```typescript
// Dans handleModuleDropOnModule (lignes 595-610)
if (sourceModule.isPlay) {
  if (!targetModule.parentId && targetModule.parentSection) {
    if (sourceModule.parentSection !== targetModule.parentSection) {
      console.log('PLAY START can only create links with tasks in the same PLAY section')
      return
    }
  } else {
    console.log('PLAY START can only create links with tasks in the same PLAY section')
    return
  }
}
```

#### Validation pour Tâches dans Sections de Blocks

Les tâches dans les sections de blocks peuvent uniquement créer des liens avec d'autres tâches du **même block ET de la même section**:

```typescript
// Dans handleModuleDropOnModule (lignes 614-619)
if (sourceModule.parentId && sourceModule.parentSection && targetModule.parentId && targetModule.parentSection) {
  if (sourceModule.parentId !== targetModule.parentId || sourceModule.parentSection !== targetModule.parentSection) {
    console.log('Tasks must be in the same block section to create a link')
    return
  }
}
```

#### Validation pour Tâches dans Sections PLAY

Les tâches dans les sections PLAY peuvent uniquement créer des liens avec d'autres tâches de **la même section PLAY**:

```typescript
// Dans handleModuleDropOnModule (lignes 622-627)
else if (!sourceModule.parentId && sourceModule.parentSection && !targetModule.parentId && targetModule.parentSection) {
  if (sourceModule.parentSection !== targetModule.parentSection) {
    console.log('Tasks must be in the same PLAY section to create a link')
    return
  }
}
```

#### Validation pour Types de Sections Différents

Toute tentative de créer un lien entre des tâches de types de sections différents est rejetée:

```typescript
// Dans handleModuleDropOnModule (lignes 630-633)
else {
  console.log('Tasks must be in the same type of section to create a link')
  return
}
```

**Résumé des règles:**
- ✅ Mini START → Tâche/Block (même section du même block)
- ✅ PLAY START → Tâche (même section PLAY)
- ✅ Tâche block → Tâche block (même block + même section)
- ✅ Tâche PLAY → Tâche PLAY (même section PLAY)
- ❌ Tous les autres cas (sections différentes, types différents)

### Affichage des Liens

**SVG avec zIndex approprié:**
- `zIndex: 2` pour être au-dessus des blocks (zIndex: 1) mais sous les tâches draggées (zIndex: 10)
- `pointerEvents: 'none'` sur le SVG global
- `pointerEvents: 'all'` sur chaque groupe `<g>` de lien

**Zone cliquable invisible:**
- `strokeWidth="20"` pour faciliter la sélection
- `stroke="transparent"`

**Bouton de suppression:**
- Apparaît au survol du lien (`onMouseEnter`)
- Cercle blanc avec croix rouge au milieu du lien
- Cliquable pour supprimer le lien

**Labels de liens:**
- Les liens des sections PLAY (pre_tasks, tasks, post_tasks, handlers) n'affichent **pas de label texte**
- Seuls les liens `rescue` et `always` conservent leurs labels (indiquent des comportements spéciaux)
- Les types de liens restent identifiables par leur couleur et style (dasharray pour handlers)

**Recalcul des points d'accroche lors du collapse/expand:**
- Les dimensions des blocks sont calculées par `getBlockDimensions()` qui tient compte de l'état `collapsedBlocks`
- **Problème résolu:** Les dimensions via `getBoundingClientRect()` écrasaient les dimensions calculées (lisait l'ancien DOM)
- **Solution:** Ne pas utiliser `getBoundingClientRect()` pour obtenir les dimensions des blocks
- Dans `getModuleAbsolutePosition()`:
  - Pour les **tâches normales**: utiliser `getBoundingClientRect()` pour width/height (réelles)
  - Pour les **blocks**: garder les dimensions de `getBlockDimensions()` (tiennent compte de collapsed)
  ```typescript
  // Ne récupérer dimensions DOM que pour tâches normales
  if (!module.isBlock) {
    const taskElement = document.querySelector(`[data-task-id="${module.id}"]`)
    if (taskElement) {
      const taskRect = taskElement.getBoundingClientRect()
      dims = { width: taskRect.width, height: taskRect.height }
    }
  }
  ```
- Garantit que les liens se recalculent immédiatement avec les bonnes dimensions lors du collapse/expand

**Recalcul des liens après changement de section PLAY:**
- **Problème:** Quand on change de section PLAY (accordéon), `getBoundingClientRect()` peut lire l'ancien DOM avant la mise à jour
- **Solution:** Mécanisme de rafraîchissement automatique avec `linkRefreshKey`
- **Implémentation:**
  ```typescript
  // État pour forcer le re-render du SVG des liens
  const [linkRefreshKey, setLinkRefreshKey] = useState(0)

  // useEffect qui détecte les changements de sections PLAY
  useEffect(() => {
    const timer = setTimeout(() => {
      setLinkRefreshKey(prev => prev + 1)
    }, 100) // Délai pour laisser le DOM se mettre à jour
    return () => clearTimeout(timer)
  }, [collapsedPlaySections])

  // SVG avec key pour forcer le re-render
  <svg key={linkRefreshKey} ... >
  ```
- Le délai de 100ms permet au DOM de se mettre à jour complètement après l'animation de l'accordéon
- Les positions des liens sont recalculées avec les nouvelles positions DOM des sections

### Visibilité des Liens

Les liens sont cachés (`return null`) dans les cas suivants:

1. **Block réduit:** Si une des tâches (source ou destination) est dans un block qui a `collapsedBlocks.has(blockId)`
2. **Section réduite:** Si une des tâches est dans une section vérifiée avec `isSectionCollapsed(blockId, section)`
3. **Section PLAY fermée (hiérarchique):** Si une des tâches (ou son block parent à n'importe quel niveau) est dans une section PLAY qui n'est pas actuellement ouverte

```typescript
// Vérification dans le rendu des liens (lignes 2070-2116)
if (fromModule.parentId) {
  const fromParent = modules.find(m => m.id === fromModule.parentId)
  if (fromParent && collapsedBlocks.has(fromParent.id)) {
    return null // Block réduit
  }
  if (fromModule.parentSection && isSectionCollapsed(fromModule.parentId, fromModule.parentSection)) {
    return null // Section réduite
  }
  // Vérifier si le block parent (ou ses ancêtres) est dans une section PLAY fermée
  if (fromParent) {
    const parentPlaySection = getModulePlaySection(fromParent)
    if (parentPlaySection) {
      const playModule = modules.find(m => m.isPlay)
      if (playModule && isPlaySectionCollapsed(playModule.id, parentPlaySection)) {
        return null
      }
    }
  }
}
```

**Helper fonction pour la hiérarchie PLAY (lignes 1142-1158):**

```typescript
// Récupère la section PLAY d'un module en remontant la hiérarchie (récursif)
const getModulePlaySection = (module: ModuleBlock): 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers' | null => {
  // Si le module a directement une parentSection mais pas de parentId, c'est qu'il est directement dans une section PLAY
  if (module.parentSection && !module.parentId) {
    return module.parentSection as any
  }

  // Si le module a un parentId, remonter au parent
  if (module.parentId) {
    const parent = modules.find(m => m.id === module.parentId)
    if (parent) {
      return getModulePlaySection(parent) // Récursion pour remonter la hiérarchie
    }
  }

  return null // Pas dans une section PLAY
}
```

**Points clés:**
- **Approche ciblée:** Ne vérifie que les modules dans des blocks (`parentId` existe)
- **Récursif:** Remonte toute la hiérarchie des parents pour trouver la section PLAY racine
- **Préserve la logique existante:** Ajouté APRÈS les vérifications de blocks/sections réduits
- **Gère les sous-blocks:** Un sous-block dans un block dans une section PLAY voit ses liens cachés quand la section PLAY se ferme
- **N'affecte pas le canvas:** Les modules sans `parentId` (sur le canvas) ne sont pas impactés

### Architecture de Rendu des Liens (Section-Scoped SVG)

**Principe fondamental:** Chaque section (PLAY ou block) possède son propre SVG pour rendre ses liens, avec positionnement relatif à la section.

#### Ancienne Architecture (Obsolète)

L'ancienne approche utilisait un SVG global unique avec calcul de coordonnées absolues via `getBoundingClientRect()`:

```typescript
// ❌ OBSOLÈTE - Ne plus utiliser
const getModuleAbsolutePosition = (module: ModuleBlock) => {
  // Complexe: récupération des positions DOM avec getBoundingClientRect()
  // Problèmes: scroll tracking, coordonnées écran, ~400 lignes de logique
}

// SVG global unique
<svg style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
  {/* Tous les liens de toutes les sections */}
</svg>
```

**Problèmes de l'ancienne approche:**
- ❌ Dépendance aux coordonnées écran (`getBoundingClientRect()`)
- ❌ Nécessitait un scroll tracking avec event listeners
- ❌ Calculs complexes de positions absolues (~400 lignes)
- ❌ Liens ne suivaient pas le scroll correctement
- ❌ Difficult à maintenir et débugger

#### Nouvelle Architecture (Actuelle)

**Composant SectionLinks** (`frontend/src/components/common/SectionLinks.tsx`)

Un composant réutilisable qui rend un SVG positionné relativement dans sa section parente:

```typescript
interface SectionLinksProps {
  links: Link[]
  modules: ModuleBlock[]
  sectionType: 'play' | 'block'
  sectionName: PlaySectionName | BlockSectionName
  parentId?: string  // Pour sections de blocks uniquement
  getLinkStyle: (type: string) => { stroke: string; ... }
  deleteLink: (linkId: string) => void
  hoveredLinkId: string | null
  setHoveredLinkId: (linkId: string | null) => void
  getModuleOrVirtual: (id: string) => ModuleBlock | undefined
  getModuleDimensions: (module: ModuleBlock) => { width: number; height: number }
}
```

**Fonctionnalités:**
- Filtre automatiquement les liens pour ne garder que ceux de la section courante
- Calcule les points de connexion en coordonnées relatives (`module.x`, `module.y`)
- SVG positionné en `position: absolute; top: 0; left: 0` dans la section
- Clipping naturel via `overflow: auto` de la section parente

**Intégration dans les sections PLAY:**

```typescript
// Dans WorkZone.tsx pour chaque section PLAY
<Box ref={tasksSectionRef} sx={{ position: 'relative', overflow: 'auto', p: 2 }}>
  {/* Contenu de la section */}

  {/* SVG des liens pour cette section */}
  <SectionLinks
    links={links}
    modules={modules}
    sectionType="play"
    sectionName="tasks"
    getLinkStyle={getLinkStyle}
    deleteLink={deleteLink}
    hoveredLinkId={hoveredLinkId}
    setHoveredLinkId={setHoveredLinkId}
    getModuleOrVirtual={getModuleOrVirtual}
    getModuleDimensions={getModuleDimensions}
  />
</Box>
```

**Intégration dans les sections de blocks:**

```typescript
// Dans PlaySectionContent.tsx pour chaque section de block
<Box sx={{ position: 'relative', overflow: 'auto', p: 0.5 }}>
  {/* Contenu de la section */}

  {/* SVG des liens pour cette section */}
  <SectionLinks
    links={links}
    modules={modules}
    sectionType="block"
    sectionName="normal"
    parentId={task.id}
    getLinkStyle={getLinkStyle}
    deleteLink={deleteLink}
    hoveredLinkId={hoveredLinkId}
    setHoveredLinkId={setHoveredLinkId}
    getModuleOrVirtual={getModuleOrVirtual}
    getModuleDimensions={getModuleDimensions}
  />
</Box>
```

#### Calcul des Points de Connexion

**Coordonnées relatives directes:**

```typescript
// Dans SectionLinks.tsx
const getConnectionPoint = (module: ModuleBlock, toModule: ModuleBlock) => {
  const fromDims = getModuleDimensions(module)
  const toDims = getModuleDimensions(toModule)

  // Utiliser directement module.x et module.y (coordonnées relatives)
  const fromCenterX = module.x + fromDims.width / 2
  const fromCenterY = module.y + fromDims.height / 2
  const toCenterX = toModule.x + toDims.width / 2
  const toCenterY = toModule.y + toDims.height / 2

  // Calculer l'angle et déterminer les bords à utiliser
  // ...

  return { from: { x: fromX, y: fromY }, to: { x: toX, y: toY } }
}
```

**Helper getModuleDimensions:**

```typescript
// Dans WorkZone.tsx
const getModuleDimensions = (module: ModuleBlock): { width: number; height: number } => {
  if (module.isBlock) {
    return getBlockDimensions(module)  // Tient compte du collapse
  }
  // Module virtuel (mini START task) - 60x40px
  if (module.collection === 'virtual') {
    return { width: 60, height: 40 }
  }
  // Tâche START (PLAY START - isPlay=true) - 60x40px
  if (module.isPlay) {
    return { width: 60, height: 40 }
  }
  // Tâche normale - 140x60px
  return { width: 140, height: 60 }
}
```

**Modules virtuels simplifiés:**

```typescript
// Dans WorkZone.tsx - getModuleOrVirtual simplifié
const getModuleOrVirtual = (moduleId: string): ModuleBlock | undefined => {
  const module = modules.find(m => m.id === moduleId)
  if (module) return module

  if (moduleId.endsWith('-start')) {
    // Parser l'ID pour extraire blockId et section
    // ...

    // Retourner un module virtuel avec coordonnées RELATIVES
    return {
      id: moduleId,
      collection: 'virtual',
      name: 'mini-start',
      description: 'Mini START task',
      taskName: 'START',
      x: 20,  // Position relative dans la section
      y: 10,  // Position relative dans la section
      isBlock: false,
      isPlay: false,
      parentId: blockId,
      parentSection: section,
    }
  }
  return undefined
}
```

#### Avantages de la Nouvelle Architecture

1. **Simplicité:** Utilise directement `module.x` et `module.y` (pas de calculs complexes)
2. **Performance:** Pas de scroll event listeners, pas de `getBoundingClientRect()` pour les liens
3. **Clipping naturel:** Les liens sont automatiquement clippés par `overflow: auto` de la section
4. **Maintenabilité:** ~400 lignes de logique complexe supprimées
5. **Fiabilité:** Pas de décalages liés au timing de mise à jour du DOM
6. **Modularité:** Chaque section gère ses propres liens de manière indépendante

#### Fichiers Modifiés

**Créé:**
- `frontend/src/components/common/SectionLinks.tsx` (320 lignes) - Composant réutilisable

**Modifié:**
- `frontend/src/components/zones/WorkZone.tsx`:
  - Supprimé: `linkRefreshKey`, scroll event listener, `getModuleAbsolutePosition`, `getModuleConnectionPoint`, SVG global (~400 lignes)
  - Ajouté: `getModuleDimensions` helper, intégration SectionLinks dans les 4 sections PLAY
  - Simplifié: `getModuleOrVirtual` retourne maintenant des coordonnées relatives

- `frontend/src/components/zones/PlaySectionContent.tsx`:
  - Ajouté: 6 nouvelles props pour SectionLinks
  - Intégration de SectionLinks dans les 3 sections de blocks (normal, rescue, always)

**Code net:** ~80 lignes ajoutées, ~400 lignes supprimées = **~320 lignes économisées**

#### Règles Importantes

1. **Position relative:** Tous les SVG utilisent `position: absolute; top: 0; left: 0` relatif à leur section
2. **Coordonnées relatives:** Toujours utiliser `module.x` et `module.y` directement
3. **Filtrage de section:** `isModuleInCurrentSection()` garantit que seuls les liens de la section sont rendus
4. **Dimensions correctes:** `getModuleDimensions()` doit retourner les bonnes dimensions pour tous les types (blocks, START, tâches normales)
5. **Pas de padding supplémentaire:** Les coordonnées `module.x/y` sont déjà relatives au bord intérieur de la section

---

## 🎨 Décisions Architecturales Importantes

### Stack Technique Validée

**Backend:**
- **Framework**: FastAPI (Python 3.11+)
- **Base de données**: PostgreSQL (avec support JSONB pour structures flexibles)
- **Cache/Queue**: Redis
- **ORM**: SQLAlchemy (async)
- **Migration**: Alembic
- **Auth**: JWT + OAuth2
- **Intégration Ansible**: ansible-runner, pyyaml

**Frontend:**
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Drag & Drop**: HTML5 Drag & Drop API native (pas de librairie externe)
- **State Management**: useState hooks avec Sets pour tracking
- **HTTP Client**: Axios
- **Routing**: React Router v6

**Infrastructure:**
- **Conteneurisation**: Docker
- **Orchestration**: Kubernetes
- **Reverse Proxy**: Nginx (frontend) + Ingress (K8s)
- **Développement Local**: Docker Compose

---

## ⚙️ State Management

### Variables d'État Clés

```typescript
// Blocks et tâches
const [modules, setModules] = useState<ModuleBlock[]>([])

// Liens entre modules
const [links, setLinks] = useState<Link[]>([])

// Blocks réduits (collapse tout le block)
const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set())

// Sections réduites (collapse section spécifique)
// Format: "blockId:section" ou "*:section" (wildcard)
const [collapsedBlockSections, setCollapsedBlockSections] = useState<Set<string>>(
  new Set(['*:rescue', '*:always']) // Tasks ouverte par défaut
)

// Module en cours de drag
const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null)

// Lien survolé (pour afficher bouton suppression)
const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null)
```

### Interface ModuleBlock

```typescript
interface ModuleBlock {
  id: string
  collection: string
  name: string
  description?: string
  taskName?: string
  x: number
  y: number
  isBlock?: boolean
  isPlay?: boolean

  // Pour tâches dans sections
  parentId?: string
  parentSection?: 'normal' | 'rescue' | 'always'

  // Pour blocks avec sections
  blockSections?: {
    normal: string[]   // IDs des tâches dans Tasks
    rescue: string[]   // IDs des tâches dans Rescue
    always: string[]   // IDs des tâches dans Always
  }
}
```

---

## 📐 Patterns à Respecter

### Frontend

**Component Composition:**
- Petits composants réutilisables
- Éviter les composants de plus de 300 lignes

**Event Handling:**
- Toujours vérifier si on doit traiter l'événement AVANT de bloquer la propagation
- Utiliser `return` après avoir traité pour sortir proprement
- Documenter les cas avec des commentaires clairs

**Type Safety:**
- Pas de `any`, interfaces explicites
- Typer tous les handlers d'événements
- Utiliser les types React natifs (`React.DragEvent`, etc.)

**Performance:**
- React.memo pour composants lourds
- useMemo pour calculs coûteux
- useCallback pour handlers passés aux enfants

**Accessibilité:**
- ARIA labels sur éléments interactifs
- Support navigation clavier
- Contraste suffisant pour les liens

**Code Réutilisabilité:**
- Extraire les composants réutilisables pour éviter la duplication
- Créer des types partagés dans `types/playbook.ts`
- Utiliser des composants communs dans `components/common/`

---

## 🔄 Refactoring et Consolidation du Code

### Objectifs de la Refonte

Le codebase a fait l'objet d'un refactoring majeur pour éliminer la duplication de code et améliorer la maintenabilité:

- **~240 lignes de code éliminées** (icônes d'attributs dupliquées 10+ fois)
- **~120 lignes de types dupliqués** (interfaces définies 3 fois)
- Amélioration de la cohérence visuelle et comportementale
- Facilitation des futures modifications

### Composants Réutilisables Créés

#### **TaskAttributeIcons** (`frontend/src/components/common/TaskAttributeIcons.tsx`)

Composant réutilisable pour afficher les 5 icônes d'attributs de tâche Ansible:

- **HelpOutlineIcon** (bleu #1976d2) - Condition `when`
- **ErrorOutlineIcon** (orange #f57c00) - `ignoreErrors`
- **SecurityIcon** (rouge #d32f2f) - `become` (sudo)
- **LoopIcon** (vert #388e3c) - `loop`
- **SendIcon** (cyan #00bcd4) - `delegateTo`

**Props:**
```typescript
interface TaskAttributeIconsProps {
  attributes: {
    when?: string
    ignoreErrors?: boolean
    become?: boolean
    loop?: string
    delegateTo?: string
  }
  size?: 'small' | 'medium'  // 12px ou 14px
  sx?: any  // Styles MUI additionnels
}
```

**Usage:**
```typescript
// Sur une tâche (size small = 12px)
<TaskAttributeIcons
  attributes={{
    when: task.when,
    ignoreErrors: task.ignoreErrors,
    become: task.become,
    loop: task.loop,
    delegateTo: task.delegateTo
  }}
  size="small"
  sx={{ mt: 0.5 }}
/>

// Sur un header de section PLAY (size medium = 14px)
<TaskAttributeIcons
  attributes={currentPlay.sectionAttributes?.tasks || {}}
  size="medium"
/>
```

**Utilisé dans:**
- PlaySectionContent.tsx (ligne ~681) - Tâches dans sections PLAY
- BlockSectionContent.tsx (lignes ~297, ~749) - Tâches dans blocks
- WorkZone.tsx (lignes ~2344, ~2461, ~2578, ~2695) - Headers de sections PLAY

#### **Architecture des Badges Unifiés**

Le système de badges a été unifié pour éliminer la duplication de code (~85+ lignes économisées) en créant une hiérarchie de composants à 3 niveaux.

**Composants créés:**

1. **CountBadge** (`frontend/src/components/common/CountBadge.tsx`) - Composant de base
   - Props: `count`, `color`, `isActive`, `children`, `sx`
   - Styling unifié: 18×18px, 0.7rem font, bold, white text
   - Gestion automatique de l'opacité: `isActive ? color : color + 'b3'` (70% opacity)
   - Utilisé comme base pour tous les badges de l'application

2. **TabIconBadge** (`frontend/src/components/common/TabIconBadge.tsx`) - Wrapper pour onglets
   - Props: `icon`, `count`, `color`, `isActive`
   - Wraps CountBadge pour afficher des badges sur les onglets PLAY
   - Utilisé pour: Roles, Pre-Tasks, Tasks, Post-Tasks, Handlers tabs
   - Réduit de ~18 lignes à ~8 lignes via l'utilisation de CountBadge

3. **StartTaskWithBadge** (`frontend/src/components/common/StartTaskWithBadge.tsx`) - Wrapper pour START tasks
   - Props: `startId`, `position`, `color`, `badgeCount`, `isDragged`, handlers
   - Wraps CountBadge avec positioning spécifique pour les tâches START
   - Badge positionné à gauche (-10px), verticalement centré, parfaitement rond
   - Utilisé pour: PLAY START tasks et mini START tasks des blocks

**Architecture:**
```
CountBadge (base)
    ├── TabIconBadge (tabs des sections PLAY)
    └── StartTaskWithBadge (tâches START + mini START)
```

**Avant le refactoring:**
- 5 badges dupliqués dans WorkZone.tsx (~70 lignes)
- Badge logic dupliquée dans StartTaskWithBadge (~20 lignes)
- Badge logic dupliquée dans TabIconBadge (~18 lignes)
- Total: ~108 lignes de duplication

**Après le refactoring:**
- CountBadge: 76 lignes (base réutilisable)
- TabIconBadge: 59 lignes (simplifié avec CountBadge)
- StartTaskWithBadge: 127 lignes (simplifié avec CountBadge)
- WorkZone.tsx: utilise TabIconBadge (~30 lignes au lieu de ~70)
- **Gain net: ~85+ lignes éliminées**

**Bénéfices:**
- Single source of truth pour le styling des badges
- Modifications globales en un seul endroit
- Cohérence visuelle garantie
- Code plus lisible et maintenable

#### **Architecture des ResizeHandles Unifiées**

Le système de poignées de redimensionnement a été unifié pour éliminer une duplication massive (~495 lignes) en créant un composant réutilisable unique.

**Problème initial:**
- 8 Box components dupliqués dans PlaySectionContent.tsx (172 lignes)
- 8 Box components dupliqués dans BlockSectionContent.tsx (174 lignes)
- 8 Box components dupliqués dans WorkZone.tsx (174 lignes)
- Total: ~520 lignes de code quasi-identique

**Composant créé:**

**ResizeHandles** (`frontend/src/components/common/ResizeHandles.tsx`) - 206 lignes

Composant réutilisable pour les poignées de redimensionnement 8 directions:

- **4 corner handles** (nw, ne, sw, se) - 16×16px, round (borderRadius: '50%')
- **4 edge handles** (n, s, w, e) - 40×12px ou 12×40px, rectangular (borderRadius: 2)

**Props:**
```typescript
interface ResizeHandlesProps {
  blockId: string
  color: string
  resizingBlock: {
    id: string
    direction: string
  } | null
  onResizeStart: (blockId: string, direction: string, e: React.MouseEvent) => void
}
```

**Approche par configuration:**
- Array de 8 configurations de handles (HandleConfig[])
- `.map()` pour générer les handles dynamiquement
- Styling et comportement centralisés

**Usage:**
```typescript
// Dans PlaySectionContent.tsx
{!collapsedBlocks.has(task.id) && (
  <ResizeHandles
    blockId={task.id}
    color={getPlaySectionColor(sectionName)}
    resizingBlock={resizingBlock}
    onResizeStart={handleResizeStart}
  />
)}

// Dans BlockSectionContent.tsx
{!collapsedBlocks.has(task.id) && (
  <ResizeHandles
    blockId={task.id}
    color={getSectionColor(section)}
    resizingBlock={resizingBlock}
    onResizeStart={handleResizeStart}
  />
)}

// Dans WorkZone.tsx
{!module.isPlay && !collapsedBlocks.has(module.id) && (
  <ResizeHandles
    blockId={module.id}
    color="#1976d2"
    resizingBlock={resizingBlock}
    onResizeStart={handleResizeStart}
  />
)}
```

**Utilisé dans:**
- PlaySectionContent.tsx - Blocks dans sections PLAY
- BlockSectionContent.tsx - Blocks dans sections de blocks
- WorkZone.tsx - Blocks sur le canvas

**Gain net:**
- Code supprimé: ~495 lignes (165 × 3 fichiers)
- Code ajouté: 206 lignes (ResizeHandles.tsx)
- **Gain net: ~289 lignes (58% de réduction)**

**Bénéfices:**
- Single source of truth pour les poignées de redimensionnement
- Modifications globales en un seul endroit (taille, curseur, animation)
- Type safety avec HandleConfig interface
- Réduction significative de la taille du bundle
- Code plus maintenable et testable

### Types Partagés

#### **frontend/src/types/playbook.ts**

Fichier centralisé contenant toutes les interfaces principales:

- `ModuleBlock` - Module, tâche ou block (version consolidée des 3 définitions)
- `Link` - Lien entre modules
- `PlayVariable` - Variable d'un PLAY
- `PlaySectionAttributes` - Attributs d'une section PLAY
- `Play` - Structure d'un PLAY complet

**Type guards utilitaires:**
```typescript
isBlock(module: ModuleBlock): boolean
isPlayStart(module: ModuleBlock): boolean
isTask(module: ModuleBlock): boolean
```

**Type aliases:**
```typescript
PlaySectionName = 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
BlockSectionName = 'normal' | 'rescue' | 'always'
SectionName = PlaySectionName | BlockSectionName
```

**Importation:**
```typescript
import { ModuleBlock, Link, Play, PlayVariable, PlaySectionAttributes } from '../../types/playbook'
```

### Bénéfices du Refactoring

1. **Maintenabilité:** Modification des icônes ou des tooltips en un seul endroit
2. **Cohérence:** Comportement identique partout (toutes les icônes toujours visibles)
3. **Type Safety:** Types partagés garantissent la cohérence entre composants
4. **Lisibilité:** Code plus concis et facile à comprendre
5. **Extensibilité:** Facile d'ajouter de nouveaux attributs ou icônes

### Prochaines Opportunités de Refactoring

D'autres duplications ont été identifiées lors de l'analyse du code (voir [README_OPTIMISATION.md](README_OPTIMISATION.md)) mais n'ont pas encore été implémentées:

- **BlockSectionHeader/Content** (~90 lignes) - Headers de sections de blocks
- **DraggableModuleItem** (~80 lignes) - Items de modules draggables
- **ResizeHandles** (~864 lignes) - Poignées de redimensionnement 8 directions
- **START Task Rendering** (~64 lignes) - Rendu des tâches START

---

## ⚠️ Pièges à Éviter

### Drag & Drop

1. **Ne JAMAIS appeler `preventDefault()` et `stopPropagation()` au début d'un handler `onDrop`**
   - Toujours vérifier d'abord si on doit traiter l'événement
   - Sinon, le déplacement/repositionnement ne fonctionnera pas

2. **Ne PAS bloquer la propagation dans `onDragOver` des sections et du canvas**
   - Le canvas doit recevoir les événements pour gérer les drops externes

3. **Vérifier le `parentId` dans `onDragStart`**
   - Toujours appeler `stopPropagation()` pour éviter que le parent ne capture le drag

4. **Calcul des positions dans les sections**
   - Utiliser les coordonnées relatives à la section, pas au canvas
   - Tenir compte du padding de section (4px pour blocks, 16px pour sections PLAY)
   - Contraindre dans les limites de la section

5. **Calcul de position des liens pour sections PLAY**
   - **NE JAMAIS** utiliser `getBoundingClientRect()` directement sur l'élément tâche pour obtenir sa position après un drop
   - Utiliser les coordonnées de l'état React (`module.x`, `module.y`) qui sont mises à jour immédiatement
   - Utiliser `getBoundingClientRect()` UNIQUEMENT pour obtenir la position de la section parente
   - **NE PAS** ajouter le padding de la section aux coordonnées (déjà incluses dans `module.x/y`)
   - Utiliser `getBoundingClientRect()` sur la tâche UNIQUEMENT pour obtenir les dimensions (width/height)

6. **Duplication de tâches/blocks lors du déplacement depuis sections de blocks**
   - **Problème:** Quand on déplace une tâche/block depuis une section de block vers l'extérieur, l'élément apparaît dupliqué (présent à la fois dans la section source ET à la destination)
   - **Cause racine:** Le canvas principal a `display: 'none'` (ligne 2584 de WorkZone.tsx), donc les drops "hors du block" atterrissent en réalité sur les sections PLAY (pre_tasks, tasks, post_tasks, handlers)
   - **Solution:** `handlePlaySectionDrop` doit retirer la tâche de l'ancien parent block en supprimant son ID du `blockSections[oldSection]` avant de la déplacer
   - **Code correct:**
     ```typescript
     const oldParentId = sourceModule.parentId
     const oldSection = sourceModule.parentSection

     setModules(prev => prev.map(m => {
       // 1. Retirer de l'ancien parent block si existe
       if (oldParentId && m.id === oldParentId && oldSection) {
         const sections = m.blockSections || { normal: [], rescue: [], always: [] }
         return {
           ...m,
           blockSections: {
             ...sections,
             [oldSection]: sections[oldSection].filter(id => id !== sourceId)
           }
         }
       }

       // 2. Mettre à jour la tâche avec la nouvelle section PLAY
       if (m.id === sourceId) {
         return { ...m, parentSection: section, x: relativeX, y: relativeY, parentId: undefined }
       }

       return m
     }))
     ```
   - **Importance de `setModules(prev => ...)`:** Utiliser TOUJOURS la forme fonctionnelle pour éviter les stale closures et garantir l'accès à l'état le plus récent
   - **Opération atomique:** Tout faire en un seul `setModules` pour éviter les race conditions entre plusieurs `setModules` consécutifs

### Visibilité des Éléments

1. **Cacher les liens quand on réduit**
   - Vérifier BOTH `collapsedBlocks` ET `collapsedBlockSections`
   - Vérifier pour les deux extrémités du lien (from ET to)

2. **zIndex approprié**
   - SVG liens: zIndex 2
   - Blocks/tâches normaux: zIndex 1
   - Éléments draggés: zIndex 10

### State Updates

1. **Mise à jour des `blockSections`**
   - Toujours copier l'objet existant avant modification
   - Filtrer les IDs lors du retrait
   - Vérifier l'existence avant l'ajout

2. **Sets pour collapsed state**
   - Utiliser `new Set(prev)` pour copier
   - Format des clés: `"blockId:section"` ou `"*:section"`

3. **Forme fonctionnelle de `setModules`**
   - **TOUJOURS** utiliser `setModules(prev => ...)` au lieu de `setModules(modules.map(...))`
   - La forme fonctionnelle garantit l'accès à l'état le plus récent et évite les stale closures
   - **Problème avec forme directe:**
     ```typescript
     // ❌ MAUVAIS: utilise l'état capturé dans la closure
     const task = modules.find(m => m.id === taskId)
     setModules(modules.map(m => ...))
     ```
   - **Forme correcte:**
     ```typescript
     // ✅ BON: utilise l'état le plus récent via la fonction callback
     setModules(prev => {
       const task = prev.find(m => m.id === taskId)
       return prev.map(m => ...)
     })
     ```
   - Particulièrement critique dans les handlers d'événements drag & drop où plusieurs `setModules` peuvent être appelés rapidement
   - Évite les bugs de duplication et de synchronisation d'état

---

## 🚀 Déploiement

### Développement Local

```bash
cd frontend
npm install
npm run dev
# Frontend: http://localhost:5173
```

### Production (Kubernetes)

```bash
# Créer le namespace
kubectl apply -f k8s/namespace.yaml

# Déployer PostgreSQL
kubectl apply -f k8s/postgresql/

# Déployer Redis
kubectl apply -f k8s/redis/

# Déployer Backend
kubectl apply -f k8s/backend/

# Déployer Frontend + Ingress
kubectl apply -f k8s/frontend/
```

---

## 📝 Fichiers Importants

### Frontend

**`frontend/src/components/common/SectionLinks.tsx`**
- Composant réutilisable pour le rendu des liens SVG dans une section
- Architecture section-scoped : chaque section possède son propre SVG
- **Fonctionnalités clés:**
  - Filtre automatique des liens pour ne garder que ceux de la section courante
  - Calcul des points de connexion en coordonnées relatives (module.x, module.y)
  - SVG positionné en `position: absolute; top: 0; left: 0` dans la section
  - Clipping naturel via `overflow: auto` de la section parente
  - Support des sections PLAY (pre_tasks, tasks, post_tasks, handlers) via `sectionType: 'play'`
  - Support des sections de blocks (normal, rescue, always) via `sectionType: 'block'`
- **Props principales:**
  - `sectionType`: 'play' | 'block'
  - `sectionName`: PlaySectionName | BlockSectionName
  - `parentId?`: ID du block parent (pour sections de blocks)
  - `getModuleDimensions`: fonction pour obtenir les dimensions de n'importe quel module
  - `getModuleOrVirtual`: fonction pour obtenir les modules réels ou virtuels (mini START)
- **Lignes importantes:**
  - ~97-105: `isModuleInCurrentSection()` - filtre les modules selon la section
  - ~111-176: `getConnectionPoint()` - calcul des points de connexion en coordonnées relatives
  - ~181-189: Filtrage des liens pour ne garder que ceux de la section courante
  - ~197-206: SVG avec position absolue et zIndex approprié
- **Impact:** Élimine ~400 lignes de logique complexe de calcul de positions absolues

**`frontend/src/components/zones/WorkZone.tsx`**
- Composant principal de la zone de travail
- Gère le canvas, drag & drop, liens
- Rendu des blocks et sections PLAY via composant réutilisable
- **Architecture de liens:** Utilise SectionLinks (section-scoped SVG) au lieu d'un SVG global
- **Lignes importantes:**
  - ~77-83: Refs DOM pour sections PLAY (playSectionsContainerRef, variablesSectionRef, etc.)
  - ~86-98: État initial des PLAYs avec onglets
  - ~197-292: `getBlockDimensions()` - calcul hybride (manuel + automatique) avec récursion pour blocks imbriqués
  - ~252-266: `getModuleDimensions()` - helper pour obtenir dimensions de tous types de modules (blocks, START 60x40px, tâches 140x60px)
  - ~139-350: `handleDrop()` canvas - gestion des drops
  - ~391-409: `handleModuleDragStart()` - début du drag
  - ~527-554: `toggleBlockSection()` - comportement accordion blocks
  - ~551-636: `handleModuleDropOnModule()` - création de liens avec validation stricte (même section)
  - ~572-577: Validation liens mini START (même block + même section)
  - ~595-610: Validation liens PLAY START (même section PLAY)
  - ~614-619: Validation liens tâches dans sections de blocks (même block + même section)
  - ~622-627: Validation liens tâches dans sections PLAY (même section PLAY)
  - ~630-633: Rejet des liens entre types de sections différents
  - ~628-635: Détection du type de lien pour mini START dans `getLinkTypeFromSource()`
  - ~748-764: Gestion PLAY START → block et prévention du déplacement mini START dans `handleBlockSectionDrop()`
  - ~1142-1158: `getModulePlaySection()` - helper récursif pour trouver la section PLAY d'un module en remontant la hiérarchie
  - ~1179-1310: `handlePlaySectionDrop()` - gestion des drops dans sections PLAY avec nettoyage des blockSections (résout bug de duplication)
  - ~1275-1304: Nettoyage atomique des tâches sortant de sections de blocks (retire de blockSections avant déplacement)
  - ~1353-1385: `getModuleOrVirtual()` - création de modules virtuels pour mini START avec coordonnées RELATIVES (simplifié)
  - ~1790-2240: Rendu des sections PLAY via composant PlaySectionContent (refactorisé)
  - ~2394-2408, ~2511-2525, ~2628-2642, ~2745-2759: Intégration de SectionLinks dans les 4 sections PLAY
  - **Supprimé:** `linkRefreshKey`, scroll event listener, `getModuleAbsolutePosition()`, `getModuleConnectionPoint()`, SVG global (~400 lignes)

**`frontend/src/types/playbook.ts`**
- Fichier centralisé pour tous les types partagés
- Interfaces principales: ModuleBlock, Link, PlayVariable, PlaySectionAttributes, Play
- Type guards: isBlock(), isPlayStart(), isTask()
- Type aliases: PlaySectionName, BlockSectionName, SectionName
- **Avantages:**
  - Élimine ~120 lignes de types dupliqués
  - Garantit la cohérence des types entre composants
  - Source unique de vérité pour les interfaces

**`frontend/src/components/common/TaskAttributeIcons.tsx`**
- Composant réutilisable pour les icônes d'attributs de tâche
- Affiche 5 icônes: when (bleu), ignoreErrors (orange), become (rouge), loop (vert), delegateTo (cyan)
- Props: `attributes` (objet), `size` ('small' | 'medium'), `sx` (styles MUI)
- **Utilisations:**
  - Tâches dans sections PLAY (size: small)
  - Tâches dans blocks (size: small)
  - Headers de sections PLAY (size: medium)
- **Impact:** Élimine ~240 lignes de code dupliqué

**`frontend/src/components/zones/PlaySectionContent.tsx`**
- Composant réutilisable pour le rendu des sections PLAY
- Gère le rendu des tâches simples et des blocks avec leurs 3 sections (Tasks, Rescue, Always)
- Élimine la duplication de code entre les 4 sections PLAY (pre_tasks, tasks, post_tasks, handlers)
- **Utilise TaskAttributeIcons:** Ligne ~681 pour les tâches
- **Utilise SectionLinks:** Intégration dans les 3 sections de blocks (normal, rescue, always)
- **Fonctionnalités:**
  - Rendu conditionnel: blocks avec 3 sections vs tâches simples
  - Drag & drop handlers pour tâches et blocks
  - Attribut `data-task-id` sur chaque Paper pour calcul des liens
  - Gestion du collapse/expand des blocks et sections
  - Couleurs distinctes par section avec numbering
  - Rendu des liens SVG via SectionLinks pour chaque section de block
- **Props principales:**
  - `sectionName`: 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
  - `modules`: array des modules à afficher
  - `collapsedBlocks`, `collapsedBlockSections`: Sets pour état collapse
  - `links`, `getLinkStyle`, `deleteLink`, `hoveredLinkId`, `setHoveredLinkId`: Props pour SectionLinks
  - `getModuleOrVirtual`, `getModuleDimensions`: Helpers pour SectionLinks
  - Handlers: toggleBlockCollapse, toggleBlockSection, handleModuleDragStart, etc.
- **Lignes importantes:**
  - ~80-92: Nouvelles props pour SectionLinks (ajoutées pour architecture section-scoped)
  - ~252-266, ~353-367, ~454-468: Intégration de SectionLinks dans les 3 sections de blocks
- **Réduction de code:** ~1,200 lignes de duplication éliminées, net: ~800 lignes

**`frontend/src/components/zones/BlockSectionContent.tsx`**
- Composant réutilisable pour le rendu récursif des sections de blocks
- Gère le rendu des tâches et blocks imbriqués dans les 3 sections (Tasks, Rescue, Always)
- **Fonctionnalités:**
  - Rendu des mini START tasks (60x40px) avec couleurs thématiques
  - Drag & drop handlers pour création de liens depuis mini START
  - Attribut `data-task-id` sur mini START pour calcul des liens
  - Rendu récursif des blocks imbriqués avec leurs 3 sections
  - Gestion du resize avec 8 directions (nw, ne, sw, se, n, s, e, w)
  - Support du drop dans les blocks imbriqués via propagation récursive de handleBlockSectionDrop
- **Lignes importantes:**
  - ~54: Interface BlockSectionContentProps avec handleBlockSectionDrop
  - ~77: Destructuration de handleBlockSectionDrop dans les props
  - ~105-145: Mini START task dans section vide
  - ~170-210: Mini START task dans section avec tâches
  - ~244-379: Appels récursifs à BlockSectionContent pour blocks imbriqués
  - ~275-279, ~325-329, ~375-379: Handlers onDragOver/onDrop pour drop dans blocks imbriqués

---

## ✅ Fonctionnalités Implémentées

- [x] Architecture 3 sections intégrées (Tasks, Rescue, Always)
- [x] Comportement accordion (une section ouverte à la fois)
- [x] Drag & drop de modules depuis la palette vers sections
- [x] Drag & drop de tâches dans les sections (repositionnement)
- [x] Drag & drop de tâches entre sections
- [x] Drag & drop de tâches depuis section vers zone de travail
- [x] Création de liens par drag & drop
- [x] Affichage dynamique des liens avec calcul de position absolu
- [x] Suppression de liens au survol
- [x] Visibilité conditionnelle des liens (block/section réduit)
- [x] Déplacement de blocks entiers
- [x] Redimensionnement dynamique des blocks selon section ouverte
- [x] Couleurs distinctes pour chaque section
- [x] Headers cliquables pour expand/collapse
- [x] Architecture PLAY avec sections (Variables, Pre-tasks, Tasks, Post-tasks, Handlers)
- [x] Comportement accordion pour sections PLAY (une section ouverte à la fois)
- [x] Alignement précis des liens avec les bords des tâches dans sections PLAY
- [x] Visibilité conditionnelle des liens (sections PLAY réduites)
- [x] Composant réutilisable PlaySectionContent pour sections PLAY (refactoring ~800 lignes)
- [x] Mini START tasks dans les sections de blocks (60x40px, thématisés)
- [x] Système de module virtuel pour gérer les mini START tasks
- [x] Création de liens depuis mini START vers tâches/blocks de la même section
- [x] Validation de scope pour liens mini START (même section uniquement)
- [x] Liens depuis PLAY START vers blocks (sans déplacement du START)
- [x] Prévention du déplacement des mini START tasks
- [x] Composant réutilisable BlockSectionContent avec rendu récursif des blocks imbriqués
- [x] Redimensionnement des blocks avec 8 directions (nw, ne, sw, se, n, s, e, w)
- [x] Calcul de position récursif pour tâches dans sections de blocks (gère blocks imbriqués)
- [x] Compensation du padding (4px) pour alignement précis des liens dans sections de blocks
- [x] Support du drop dans les blocks imbriqués (propagation récursive de handleBlockSectionDrop)
- [x] Validation stricte des liens (même section uniquement pour tous les types de tâches)
- [x] Collapse des blocks avec taille uniforme (140x60px comme une tâche normale)
- [x] Redimensionnement hybride des blocks (manuel + automatique avec calcul récursif)
- [x] Auto-expansion des blocks pour contenir les tâches/blocks imbriqués (évite débordement)
- [x] Correction du bug de duplication lors du déplacement de tâches/blocks depuis sections de blocks vers sections PLAY
- [x] Nettoyage atomique des blockSections lors du déplacement (forme fonctionnelle setModules)
- [x] Utilisation systématique de setModules(prev => ...) pour éviter stale closures
- [x] PLAY START tasks redessinés comme mini START (60x40px au lieu de 100x60px)
- [x] Simplification des PLAY START tasks (juste "START" centré, sans TextField ni icônes)
- [x] Système d'attributs pour les sections PLAY (when, ignoreErrors, become, loop, delegateTo)
- [x] Icônes d'attributs sur les headers d'accordéon des sections PLAY
- [x] Bouton de configuration (SettingsIcon) sur chaque header de section PLAY
- [x] Mise à jour des attributs de section via ConfigZone (handleUpdateModuleAttributes étendu)
- [x] Interface PlaySectionAttributes pour typage des attributs de sections
- [x] Initialisation automatique des sectionAttributes dans les nouveaux PLAYs
- [x] Indicateurs visuels (icônes colorées/grises) selon l'état des attributs de section
- [x] Barre de navigation des onglets PLAY avec répartition équitable sur toute la largeur (variant="fullWidth")
- [x] Refactoring: Types partagés centralisés dans types/playbook.ts (~120 lignes économisées)
- [x] Refactoring: Composant réutilisable TaskAttributeIcons (~240 lignes économisées)
- [x] Refactoring: Élimination de la duplication des icônes d'attributs (10+ occurrences)
- [x] Refactoring: Import des types partagés dans WorkZone, PlaySectionContent, BlockSectionContent
- [x] Refactoring: Architecture unifiée des badges avec hiérarchie à 3 niveaux (~85+ lignes économisées)
- [x] Refactoring: Composant de base CountBadge pour styling unifié (18×18px, bold, white text)
- [x] Refactoring: TabIconBadge et StartTaskWithBadge refactorisés pour utiliser CountBadge
- [x] Refactoring: Architecture unifiée des ResizeHandles avec composant réutilisable (~289 lignes économisées)
- [x] Refactoring: Composant ResizeHandles pour poignées de redimensionnement 8 directions (16×16px corners, 40×12px edges)
- [x] Refactoring: Approche par configuration pour gérer les handles (HandleConfig array + .map())
- [x] Architecture section-scoped pour le rendu des liens (un SVG par section au lieu d'un SVG global)
- [x] Composant réutilisable SectionLinks pour rendu des liens avec coordonnées relatives
- [x] Suppression de l'ancien système de liens avec SVG global (~400 lignes supprimées)
- [x] Suppression du scroll tracking et des event listeners pour les liens
- [x] Simplification de getModuleOrVirtual pour retourner des coordonnées relatives
- [x] Helper getModuleDimensions pour obtenir les dimensions de tous types de modules (blocks, START 60x40px, tâches 140x60px)
- [x] Clipping naturel des liens via overflow: auto des sections (pas de gestion manuelle)
- [x] Section Roles dans les PLAYs pour gérer les roles Ansible
- [x] Type PlaySectionName étendu pour inclure 'roles' (variables | roles | pre_tasks | tasks | post_tasks | handlers)
- [x] Comportement collapse/expand indépendant pour Roles (comme Variables, pas d'accordion)
- [x] Ajout, suppression et réorganisation des roles par drag & drop
- [x] Icône ExtensionIcon (vert #4caf50) pour indiquer les roles configurés dans les onglets PLAY
- [x] Interface utilisateur cohérente avec la gestion des Variables (Chips draggables)
- [x] Fonction togglePlaySection mise à jour pour supporter 'roles'
- [x] Initialisation de l'attribut roles dans PlayAttributes (roles?: string[])

---

## 🔮 Prochaines Étapes

### Backend
- [ ] Implémenter les modèles de données (User, Playbook, Module, Collection)
- [ ] Créer les endpoints CRUD pour playbooks
- [ ] Service de collecte des modules Ansible Galaxy
- [ ] Service de compilation YAML (transformer les blocks 3 sections)
- [ ] Authentification JWT

### Frontend
- [ ] Formulaires dynamiques pour configuration modules
- [ ] Prévisualisation YAML en temps réel
- [ ] Download du playbook généré
- [ ] Validation des liens (éviter cycles)
- [ ] Undo/Redo pour les opérations

### DevOps
- [ ] CI/CD pipeline (GitHub Actions ou GitLab CI)
- [ ] Tests automatisés (pytest backend, vitest frontend)
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Logging centralisé (ELK ou Loki)

---

## 📊 Optimisations Futures

Une analyse approfondie du codebase a identifié **7 opportunités majeures de mutualisation** pouvant éliminer **700-750 lignes de code dupliqué** (réduction de 14% du codebase).

### Documentation d'Analyse

**📄 [README_OPTIMISATION.md](README_OPTIMISATION.md)** - Point d'entrée
- Résumé exécutif des opportunités d'optimisation
- Tableau des 7 duplications identifiées avec gains estimés
- Plan de refactoring en 4 phases
- ROI et recommandations

**📄 [ANALYSE_OPTIMISATION_CODE.md](ANALYSE_OPTIMISATION_CODE.md)** - Analyse détaillée (199 lignes)
- Analyse technique de chaque duplication
- 7 composants réutilisables proposés
- 3 constantes à extraire
- Impact par fichier avec métriques

**📄 [EXEMPLES_REFACTORING.txt](EXEMPLES_REFACTORING.txt)** - Code concret (85 lignes)
- 5 exemples before/after avec code snippets
- Calcul des gains pour chaque cas
- Patterns de réutilisation

**📄 [CHECKLIST_REFACTORING.txt](CHECKLIST_REFACTORING.txt)** - Guide d'implémentation (253 lignes)
- 17 éléments à implémenter avec détails
- Sous-tâches par composant
- Efforts estimés et vérifications

### Principales Optimisations Identifiées

1. **TaskAttributeIcons** (100 lignes) - Icônes d'attributs de tâches dupliquées
2. **BlockSectionHeader/Content** (90 lignes) - Headers de sections de blocks
3. **DraggableModuleItem** (80 lignes) - Items de modules draggables
4. **TaskAttributeFormField** (60 lignes) - Champs de formulaire répétitifs
5. **SelectOptionField** (40 lignes) - Selects avec options standard
6. **START Task Rendering** (64 lignes) - Tâches START des PLAYs
7. **Module List Rendering** (30 lignes) - Listes dans ModulesZone

### Plan d'Exécution Recommandé

**Phase 1 (Semaine 1):** TaskAttributeIcons + constantes (214 lignes, 4-5h)
**Phase 2 (Semaine 2):** BlockSectionHeader/Content (303 lignes, 6-7h)
**Phase 3 (Semaine 3):** DraggableModuleItem + FormFields (268 lignes, 6-7h)
**Phase 4 (Semaine 4):** SelectOptionField + finitions (90 lignes, 4-5h)

**Effort total:** 20-25 heures | **Gain:** 875 lignes | **ROI:** Excellent
