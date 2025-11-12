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
- se presente sous la forme d'un accordeon de
  - Variables:
    - liste les variables du Playsous la forme de blocks en drag & drop depuis la zone modules
    - peux etre refermé et redimmentionné
  - Pre-tasks, Tasks, Post-tasks et Handlers
    - 1 seul section ouverte a la fois
    - occupe tout l'esapce de travail
    - chaque section peux recevoir les taches et les blocks
    - une tache speciale (START) est toujours presentesans pouvoir etre deplacée ni supprimée.


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

#### Position absolue des tâches dans sections

```typescript
const getModuleConnectionPoint = (module: ModuleBlock) => {
  if (module.parentId && module.parentSection) {
    const parent = modules.find(m => m.id === module.parentId)

    // Position de base du parent
    absoluteX = parent.x
    absoluteY = parent.y

    // Ajouter hauteur du header block
    absoluteY += blockHeaderHeight (50px)

    // Ajouter hauteur des sections précédentes (avec accordion)
    for (const section of ['normal', 'rescue', 'always']) {
      if (section === module.parentSection) {
        absoluteY += sectionHeaderHeight (25px)
        break
      }

      absoluteY += sectionHeaderHeight
      if (!isSectionCollapsed(parent.id, section)) {
        absoluteY += minContentHeight (200px)
      }
    }

    // Ajouter position relative dans section + padding
    absoluteX += module.x + 4
    absoluteY += module.y + 4
  }

  return { x: absoluteX + width/2, y: absoluteY + height/2 }
}
```

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

---

## 🔗 Système de Liens

### Types de Liens

- **normal**: Lien séquentiel standard entre tâches
- **rescue**: Lien vers section rescue d'un block
- **always**: Lien vers section always d'un block
- **pre_tasks, tasks, post_tasks, handlers**: Liens depuis un PLAY

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

### Visibilité des Liens

Les liens sont cachés (`return null`) dans les cas suivants:

1. **Block réduit:** Si une des tâches (source ou destination) est dans un block qui a `collapsedBlocks.has(blockId)`
2. **Section réduite:** Si une des tâches est dans une section vérifiée avec `isSectionCollapsed(blockId, section)`

```typescript
// Vérification dans le rendu des liens
if (fromModule.parentId) {
  const fromParent = modules.find(m => m.id === fromModule.parentId)
  if (fromParent && collapsedBlocks.has(fromParent.id)) {
    return null // Block réduit
  }
  if (fromModule.parentSection && isSectionCollapsed(fromModule.parentId, fromModule.parentSection)) {
    return null // Section réduite
  }
}
```

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

**`frontend/src/components/zones/WorkZone.tsx`**
- Composant principal de la zone de travail
- Gère le canvas, drag & drop, liens
- Rendu des blocks et sections PLAY via composant réutilisable
- **Lignes importantes:**
  - ~77-83: Refs DOM pour sections PLAY (playSectionsContainerRef, variablesSectionRef, etc.)
  - ~86-98: État initial des PLAYs avec onglets
  - ~102-126: `getBlockDimensions()` - calcul hauteur dynamique blocks
  - ~139-350: `handleDrop()` canvas - gestion des drops
  - ~391-409: `handleModuleDragStart()` - début du drag
  - ~527-554: `toggleBlockSection()` - comportement accordion blocks
  - ~1237-1343: `getModuleAbsolutePosition()` - calcul positions absolues (blocks + PLAY sections)
  - ~1282-1335: Calcul position tâches dans sections PLAY avec état React + getBoundingClientRect
  - ~1339-1410: `getModuleConnectionPoint()` - calcul points d'accroche des liens
  - ~1615-1700: Rendu des liens SVG avec visibilité conditionnelle (blocks + PLAY sections)
  - ~1790-2240: Rendu des sections PLAY via composant PlaySectionContent (refactorisé)

**`frontend/src/components/zones/PlaySectionContent.tsx`**
- Composant réutilisable pour le rendu des sections PLAY
- Gère le rendu des tâches simples et des blocks avec leurs 3 sections (Tasks, Rescue, Always)
- Élimine la duplication de code entre les 4 sections PLAY (pre_tasks, tasks, post_tasks, handlers)
- **Fonctionnalités:**
  - Rendu conditionnel: blocks avec 3 sections vs tâches simples
  - Drag & drop handlers pour tâches et blocks
  - Attribut `data-task-id` sur chaque Paper pour calcul des liens
  - Gestion du collapse/expand des blocks et sections
  - Couleurs distinctes par section avec numbering
- **Props principales:**
  - `sectionName`: 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
  - `modules`: array des modules à afficher
  - `collapsedBlocks`, `collapsedBlockSections`: Sets pour état collapse
  - Handlers: toggleBlockCollapse, toggleBlockSection, handleModuleDragStart, etc.
- **Réduction de code:** ~1,200 lignes de duplication éliminées, net: ~800 lignes

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
