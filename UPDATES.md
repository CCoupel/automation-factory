# Mises à Jour de l'Interface - Automation Factory

## Version 0.2.0 - Améliorations UX/UI

### Changements Implémentés ✅

#### 1. Réduction de la Police à 80%
- **Fichier**: `frontend/src/index.css`
- **Modification**: `font-size: 80%` sur `:root`
- **Impact**: Meilleure lisibilité, plus d'espace pour le contenu

#### 2. Modules Nommables
- **Fonctionnalité**: Chaque module droppé possède un nom de tâche éditable
- **Champ ajouté**: `taskName` dans l'interface `ModuleBlock`
- **Interaction**: TextField éditable directement sur le bloc du module

#### 3. Représentation Carrée avec Positionnement Libre
- **Ancienne approche**: Liste verticale fixe
- **Nouvelle approche**: Canvas libre avec positionnement absolu
- **Dimensions**: Blocs de 200px de large, 150px de hauteur minimale
- **Position**: Coordonnées X/Y stockées pour chaque module
- **Drop**: Les modules apparaissent à l'endroit exact du drop

#### 4. Lignes de Connexion Entre Modules
- **Technologie**: SVG avec élément `<line>`
- **Style**: Flèches bleues (#1976d2) reliant les modules séquentiellement
- **Direction**: Du centre du module N au centre du module N+1
- **Flèche**: Marker SVG "arrowhead" pour indiquer le flux

#### 5. Affichage Nom Tâche puis Nom Module
**Structure du bloc module:**
```
┌─────────────────────┐
│ [1]            [×]  │  <- Numéro et bouton delete
├─────────────────────┤
│ Copy config file    │  <- Nom de la tâche (éditable)
├─────────────────────┤
│ ansible.builtin.copy│  <- Collection.Module (bleu)
├─────────────────────┤
│ Copy files to...    │  <- Description
└─────────────────────┘
```

#### 6. Séparation Zone Config en 2 Sections

**Section 1: Task Attributes (Accordion)**
- Icône: 📋 AssignmentIcon
- Couleur: Primary (bleu)
- Attributs:
  - `name`: Nom de la tâche
  - `when`: Condition d'exécution
  - `tags`: Tags pour filtrage
  - `ignore_errors`: Continuer en cas d'erreur
  - `become`: Exécuter avec sudo

**Section 2: Module Attributes (Accordion)**
- Icône: 🧩 ExtensionIcon
- Couleur: Secondary (rose)
- Attributs: **Dynamiques selon le module sélectionné**
- Titre: "Module: collection.name"

#### 7. Zone Config Dynamique

**Configuration par module:**

**Module `copy`:**
- src * (required) - Source file path
- dest * (required) - Destination file path
- owner - File owner
- group - File group
- mode - File permissions (default: 0644)
- backup - Create backup (yes/no)

**Module `service`:**
- name * (required) - Service name
- state * (required) - Service state (started/stopped/restarted/reloaded)
- enabled - Enable on boot (yes/no)

**Module `file`:**
- path * (required) - File or directory path
- state - File state (file/directory/absent/link)
- owner - File owner
- group - File group
- mode - File permissions

**Modules non configurés:**
- Message: "No configuration available for this module yet"

### Communication entre Composants

**État partagé via MainLayout:**
```typescript
interface SelectedModule {
  id: string
  name: string
  collection: string
  taskName: string
}

// MainLayout gère l'état
const [selectedModule, setSelectedModule] = useState<SelectedModule | null>(null)

// WorkZone reçoit et émet
<WorkZone
  onSelectModule={setSelectedModule}
  selectedModuleId={selectedModule?.id || null}
/>

// ConfigZone affiche
<ConfigZone selectedModule={selectedModule} />
```

### Interactions Utilisateur

1. **Drag & Drop depuis ModulesZone**
   - Cliquer-glisser un module
   - Le déposer n'importe où dans la WorkZone
   - Apparaît à la position exacte du drop

2. **Sélection d'un Module**
   - Clic sur un bloc module
   - Border bleu de 2px
   - Elevation augmentée (shadow)
   - ConfigZone se met à jour automatiquement

3. **Edition du Nom de Tâche**
   - Clic dans le TextField du nom
   - Modification en direct
   - Sauvegarde automatique dans l'état

4. **Suppression**
   - Clic sur l'icône 🗑️
   - Module supprimé immédiatement
   - Lignes de connexion recalculées

5. **Configuration**
   - Sélectionner un module
   - Deux accordions s'affichent à droite
   - Remplir les champs selon le besoin
   - Validation inline (champs requis marqués *)

### Améliorations Visuelles

- Police réduite à 80% pour plus de contenu
- Blocs modules compacts et carrés
- Lignes de connexion visuelles
- Border bleu sur sélection
- Icônes différenciées (Task vs Module)
- Couleurs cohérentes (Primary/Secondary)

### Fichiers Modifiés

```
frontend/src/
├── index.css (font-size: 80%)
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx (state management)
│   └── zones/
│       ├── WorkZone.tsx (canvas libre, lignes, sélection)
│       └── ConfigZone.tsx (2 sections, config dynamique)
```

### Compatibilité

✅ Chrome
✅ Edge
✅ Firefox
✅ Safari

### Version 0.3.0 - Améliorations Ergonomiques

#### 1. Réduction du Bandeau de la Zone de Travail ✅
- **Changement**: Padding réduit de `p: 2` à `p: 1`
- **Typography**: Changé de `h6` à `subtitle1` pour moins d'espace
- **Suppression**: Texte d'aide retiré pour compacité
- **Impact**: Plus d'espace vertical pour le canvas de travail

#### 2. Limitation des Connexions ✅
- **Règle**: Une tâche ne peut avoir qu'une seule connexion sortante
- **Comportement**: Lors de la création d'une nouvelle connexion, l'ancienne est automatiquement supprimée
- **Code**: Vérification dans `handleModuleDropOnModule` via `links.some(l => l.from === sourceId)`
- **UX**: Simplifie le flux de travail et évite les graphes complexes

#### 3. Positionnement avec Grille ✅
- **Mode Free**: Positionnement libre (par défaut)
- **Mode Grid**: Alignement automatique sur une grille de 50x50px
- **Toggle**: Boutons dans le header avec icônes GridOff/GridOn
- **Visual**: Lignes de grille visibles en mode Grid (#e0e0e0)
- **Snapping**: Application automatique lors du drop et du repositionnement
- **Fonction**: `snapToGrid(value)` arrondit à la grille la plus proche

**Interface du toggle:**
```typescript
<ToggleButtonGroup value={gridEnabled ? 'grid' : 'free'} exclusive>
  <ToggleButton value="free">
    <GridOffIcon /> // Positionnement libre
  </ToggleButton>
  <ToggleButton value="grid">
    <GridOnIcon /> // Positionnement sur grille 50x50px
  </ToggleButton>
</ToggleButtonGroup>
```

**Visuel de la grille:**
```css
backgroundImage: linear-gradient(#e0e0e0 1px, transparent 1px),
                 linear-gradient(90deg, #e0e0e0 1px, transparent 1px)
backgroundSize: 50px 50px
```

#### 4. Repositionnement des Tâches ✅
- **Fonctionnalité**: Les tâches peuvent être déplacées librement dans la zone de travail
- **Méthode**: Drag & drop natif avec `draggable={true}`
- **Comportement intelligent**:
  - **Drag sur zone vide** → Déplace la tâche
  - **Drag sur une autre tâche** → Crée un lien
- **Snapping**: Respect du mode grille si activé
- **Visual feedback**: Opacité à 0.7 pendant le déplacement
- **Classe CSS**: `.module-block` pour identifier les modules et différencier les zones de drop

#### 5. Bouton de Suppression de Lien au Survol ✅
- **Comportement**: Le bouton × n'apparaît que lors du survol du lien
- **État**: `hoveredLinkId` pour gérer l'affichage conditionnel
- **Events**: `onMouseEnter` et `onMouseLeave` sur la ligne transparente
- **UX**: Interface plus propre, moins de clutter visuel

**Gestion du hover:**
```typescript
const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null)

<line onMouseEnter={() => setHoveredLinkId(link.id)}
      onMouseLeave={() => setHoveredLinkId(null)} />

{hoveredLinkId === link.id && (
  <circle onClick={() => deleteLink(link.id)} />
)}
```

#### 6. Flèche Directionnelle au Milieu du Lien ✅
- **Position**: La tête de flèche est placée au milieu du lien au lieu de la fin
- **Calcul**: Utilise `Math.atan2` pour calculer l'angle de rotation
- **SVG**: Polygon avec transformation `translate` et `rotate`
- **Visuel**: Indique clairement le sens du flux entre les tâches

**Implémentation:**
```typescript
const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)

<polygon
  points="0,-4 8,0 0,4"
  fill="#1976d2"
  transform={`translate(${midX}, ${midY}) rotate(${angle})`}
/>
```

#### 7. Limitation des Connexions (1 sortante + 1 entrante) ✅
- **Règle stricte**: Une tâche ne peut avoir qu'UNE connexion sortante ET qu'UNE connexion entrante
- **Comportement sortant**: Lors de la création d'une nouvelle connexion sortante, l'ancienne est supprimée
- **Comportement entrant**: Lors de la création d'une nouvelle connexion entrante, l'ancienne est supprimée
- **UX**: Évite les graphes complexes, favorise une séquence linéaire de tâches

**Code de validation:**
```typescript
const hasOutgoingLink = links.some(l => l.from === sourceId)
const hasIncomingLink = links.some(l => l.to === targetId)

if (hasOutgoingLink) {
  setLinks(links.filter(l => l.from !== sourceId))
}
if (hasIncomingLink) {
  setLinks(prevLinks => prevLinks.filter(l => l.to !== targetId))
}
```

#### 8. Zones Redimensionnables ✅

**Zone Système (bas) - Redimensionnement Vertical**
- **Fonctionnalité**: La zone système (logs) peut être agrandie/réduite verticalement
- **Méthode**: Drag sur la poignée en haut de la zone
- **Limites**: Hauteur entre 100px et 600px
- **Cursor**: `ns-resize` (nord-sud)

**Zone Modules (gauche) - Redimensionnement Horizontal**
- **Fonctionnalité**: La zone modules peut être élargie/réduite horizontalement
- **Méthode**: Drag sur la poignée à droite de la zone
- **Limites**: Largeur entre 200px et 500px
- **Cursor**: `ew-resize` (est-ouest)

**Zone Configuration (droite) - Redimensionnement Horizontal**
- **Fonctionnalité**: La zone config peut être élargie/réduite horizontalement
- **Méthode**: Drag sur la poignée à gauche de la zone
- **Limites**: Largeur entre 250px et 600px
- **Cursor**: `ew-resize` (est-ouest)

**Visual feedback commun:**
- Poignée transparente au repos
- Poignée bleu clair au survol
- Poignée bleu foncé pendant le drag
- Indicateur visuel (barre grise)

**Implémentation:**
```typescript
const [systemZoneHeight, setSystemZoneHeight] = useState(200)
const [modulesZoneWidth, setModulesZoneWidth] = useState(280)
const [configZoneWidth, setConfigZoneWidth] = useState(320)
const [isResizingSystem, setIsResizingSystem] = useState(false)
const [isResizingModules, setIsResizingModules] = useState(false)
const [isResizingConfig, setIsResizingConfig] = useState(false)

const handleMouseMove = (e: MouseEvent) => {
  if (isResizingSystem) {
    const newHeight = window.innerHeight - e.clientY
    if (newHeight >= 100 && newHeight <= 600) {
      setSystemZoneHeight(newHeight)
    }
  } else if (isResizingModules) {
    const newWidth = e.clientX
    if (newWidth >= 200 && newWidth <= 500) {
      setModulesZoneWidth(newWidth)
    }
  } else if (isResizingConfig) {
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= 250 && newWidth <= 600) {
      setConfigZoneWidth(newWidth)
    }
  }
}
```

### Version 0.4.0 - Gestion Avancée des Blocks

#### 1. Correction du Drop de Module dans un Block ✅
- **Problème résolu**: Les modules depuis la palette ne pouvaient pas être déposés dans un block
- **Solution**: Séparation des classes CSS `.module-block` et `.block-container`
  - `.module-block`: Appliqué au Paper externe du block
  - `.block-container`: Appliqué à la zone de contenu interne
- **Comportement**: Les modules de la palette peuvent maintenant être glissés-déposés dans la zone "Drop tasks here" d'un block
- **Position**: Les tâches sont positionnées de manière absolue à l'intérieur du block parent

#### 2. Couleur Dynamique des Blocks selon Type de Lien Entrant ✅
- **Fonctionnalité**: Les blocks changent de couleur en fonction du type de lien qu'ils reçoivent
- **Fonction**: `getBlockTheme(blockId)` détermine le thème basé sur le lien entrant

**Thèmes de couleur:**
- **Block Normal** (lien normal entrant):
  - Border: `#1976d2` (bleu)
  - Background: `rgba(25, 118, 210, 0.05)`
  - Icône: `#1976d2`

- **Block Rescue** (lien rescue entrant):
  - Border: `#ff9800` (orange)
  - Background: `rgba(255, 152, 0, 0.05)`
  - Icône: `#ff9800`

- **Block Always** (lien always entrant):
  - Border: `#4caf50` (vert)
  - Background: `rgba(76, 175, 80, 0.05)`
  - Icône: `#4caf50`

- **Block par défaut** (sans lien entrant):
  - Border: `#9c27b0` (violet)
  - Background: `rgba(156, 39, 176, 0.05)`
  - Icône: `#9c27b0`

**Éléments colorés dynamiquement:**
- Bordure du block
- Background du block
- Icône AccountTreeIcon
- Nom du block (TextField)
- Bordure du header
- Bordure de la zone "Drop tasks here"

#### 3. Collapse/Expand des Blocks ✅
- **Fonctionnalité**: Les blocks peuvent être réduits/agrandis pour économiser l'espace visuel
- **État**: `collapsedBlocks: Set<string>` stocke les IDs des blocks collapsed
- **Fonction**: `toggleBlockCollapse(blockId)` bascule l'état

**Comportement visuel:**
- **Expanded** (par défaut):
  - Icône: `ExpandLessIcon` (chevron vers le haut)
  - Hauteur: Calculée dynamiquement selon les enfants
  - Contenu visible: Zone de drop + tâches enfants

- **Collapsed**:
  - Icône: `ExpandMoreIcon` (chevron vers le bas)
  - Hauteur: 50px (seulement le header)
  - Contenu masqué: Zone de drop et tâches enfants cachées

**Interaction:**
- Bouton collapse/expand dans le header à droite (avant le bouton delete)
- Click sur le bouton toggle l'état
- Le block conserve sa position et ses enfants
- Les liens restent visibles même quand le block est collapsed

**Implémentation:**
```typescript
const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set())

const toggleBlockCollapse = (blockId: string) => {
  setCollapsedBlocks(prev => {
    const newSet = new Set(prev)
    if (newSet.has(blockId)) {
      newSet.delete(blockId)
    } else {
      newSet.add(blockId)
    }
    return newSet
  })
}

// Dans getBlockDimensions
if (collapsedBlocks.has(block.id)) {
  return { width: 250, height: 50 }
}

// Dans le rendu du block
{!collapsedBlocks.has(module.id) && (
  <Box className="block-container">
    {/* Contenu du block */}
  </Box>
)}
```

### Version 0.5.0 - Généalogie des Tâches et PLAY

#### 1. Thème Gris pour les Tâches/Blocks Orphelins ✅
- **Concept d'orphelin**: Une tâche ou un block sans connexion entrante est considéré comme orphelin
- **Propagation**: Un block/tâche ayant un lien entrant depuis un orphan devient lui-même orphan (récursif)
- **Exception**: Les PLAY ne sont jamais orphelins (ce sont les racines de généalogie)

**Fonction de détection:**
```typescript
const isOrphan = (moduleId: string, visited = new Set<string>()): boolean => {
  const module = modules.find(m => m.id === moduleId)

  // Un PLAY n'est jamais orphelin (racine)
  if (module?.isPlay) return false

  // Éviter les boucles infinies
  if (visited.has(moduleId)) return true
  visited.add(moduleId)

  const incomingLink = links.find(l => l.to === moduleId)

  // Pas de lien entrant = orphelin
  if (!incomingLink) return true

  // Vérifier si la source est orpheline (récursif)
  return isOrphan(incomingLink.from, visited)
}
```

**Thème gris orphelin:**
- **Blocks orphelins**:
  - Border: `#757575` (gris)
  - Background: `rgba(117, 117, 117, 0.05)`
  - Icône: `#757575`

- **Tâches orphelines**:
  - Numéro background: `#757575` (gris)
  - Nom du module: `#757575` (gris)
  - Border: `#757575` (gris)

#### 2. Type de Tâche Générique PLAY ✅
- **Nouveau type**: `isPlay` flag dans l'interface `ModuleBlock`
- **Rôle**: Initier la généalogie des tâches, racine du workflow
- **Icône**: `PlayArrowIcon` (au lieu de `AccountTreeIcon`)
- **Forme dédiée**: Container plus large (300px au lieu de 250px)
- **Couleur**: Thème vert permanent
  - Border: `#2e7d32` (vert foncé)
  - Background: `rgba(46, 125, 50, 0.08)`
  - Icône: `#2e7d32`

**Ajout dans ModulesZone:**
```typescript
const genericElements = [
  { name: 'play', description: 'Define a play in the playbook' },
  { name: 'block', description: 'Group tasks with error handling' },
  // ...
]
```

**Création d'un PLAY:**
```typescript
const isPlay = parsedData.name === 'play'

const newModule: ModuleBlock = {
  id: Date.now().toString(),
  collection: parsedData.collection,
  name: parsedData.name,
  description: parsedData.description,
  taskName: isPlay ? 'New Play' : ...,
  x, y,
  isBlock,
  isPlay,
  children: (isBlock || isPlay) ? [] : undefined,
}
```

**Différences visuelles PLAY vs BLOCK:**
| Caractéristique | PLAY | BLOCK |
|---|---|---|
| Largeur | 300px | 250px |
| Icône | PlayArrowIcon | AccountTreeIcon |
| Couleur | Vert (#2e7d32) | Dynamique selon lien entrant |
| Orphelin | Jamais | Oui si pas de lien entrant |
| Fonction | Racine de généalogie | Gestion d'erreurs |

#### 3. Zone Playbook (anciennement Zone Play) ✅
- **Renommage**: `PlayZone.tsx` → `PlaybookZone.tsx`
- **Titre**: "Play" → "Playbook"
- **Icône**: `PlayArrowIcon` → `DescriptionIcon`

**Nouveaux champs:**
- **Name**: Nom du playbook (état géré: `playbookName`)
- **Version**: Version du playbook (état géré: `playbookVersion`)
- **Inventory**: Inventaire Ansible (existant)
- **Ansible Version**: Version d'Ansible (existant)

**Interface:**
```
┌────────────────────────────────────────────────────────────┐
│ 📄 Playbook │ Name: [my-playbook] │ Version: [1.0.0] │ ... │
└────────────────────────────────────────────────────────────┘
```

**Composant:**
```typescript
const PlaybookZone = () => {
  const [playbookName, setPlaybookName] = useState('my-playbook')
  const [playbookVersion, setPlaybookVersion] = useState('1.0.0')

  return (
    <Box sx={{ bgcolor: 'primary.main', color: 'white' }}>
      <DescriptionIcon />
      <Typography>Playbook</Typography>
      <TextField label="Name" value={playbookName} ... />
      <TextField label="Version" value={playbookVersion} ... />
      {/* ... */}
    </Box>
  )
}
```

### Hiérarchie et Généalogie

**Arbre de généalogie typique:**
```
PLAYBOOK (nom + version)
  └── PLAY 1 (racine, vert, jamais orphelin)
       ├── Task 1 (bleu si connecté)
       ├── Task 2 (bleu si connecté)
       └── BLOCK (rescue)
            ├── Task 3
            └── BLOCK (always)
                 └── Task 4

PLAY 2 (orphelin si pas de connexion → gris)
  └── Task 5 (orphelin → gris)

Task 6 (orphelin, pas de connexion → gris)
```

**Règles de couleur:**
1. **PLAY**: Toujours vert (racine)
2. **Connecté à un PLAY** (directement ou indirectement): Couleur selon type de lien
   - Normal: Bleu
   - Rescue: Orange
   - Always: Vert
3. **Orphelin**: Gris (pas de connexion à un PLAY)

### Prochaines Améliorations Possibles

- [ ] Configuration spécifique des PLAY (hosts, become, vars, etc.)
- [ ] Zoom in/out sur le canvas
- [ ] Connexions personnalisables (conditions, boucles)
- [ ] Sauvegarde automatique des configurations
- [ ] Validation en temps réel des champs requis
- [ ] Export du playbook complet vers YAML
- [ ] Thème sombre/clair
- [ ] Raccourcis clavier (Delete, Ctrl+Z, etc.)
- [ ] Taille de grille paramétrable (25px, 50px, 100px)
- [ ] Nested blocks (blocks dans blocks)
- [ ] Indicateur visuel du nombre de tâches dans un block collapsed
- [ ] Import de playbook YAML existant
- [ ] Validation de la généalogie (avertir si orphelins détectés)

---

**Accès**: http://localhost:5174
**Date**: 2025-11-08
**Version**: 0.5.0
