# Guide Claude - Ansible Builder

Ce document est destiné aux futures instances de Claude travaillant sur ce projet. Il contient la vue d'ensemble, l'architecture globale et les liens vers la documentation détaillée.

---
Tu build les images via le docker disponnible au 192.168.1.217. Tu ne build que l'image frontend ou backend si son code a ete modifié
tu deploie les images buildées sur le serveur docker sur le cluster kubernetes
Tu verifie les logs de demarage des containers
Tu test tous les appel d'api a chaque deploiement de nouvelle version du backend

tu push les images vers ghcr.io/ccoupel uniquement lorsque je te le valide en faisant le commit et tu augmente le tag de version 


Les versions dans le repository externe sont de la forme X.Y.Z. 
  X correspond a un etat de la structure de la base, il est augmenté si le schema de la base evolue
  Y correspond a un etat de fonctionnalité, il est augmenté lors de l'implementation d'un nouvelle fonctionnalité
  Z correspond a un version de bugfix

ces X,Y et Z ne sont pas limités a etre entre 0 à 10 mais sont sans limites

Les versions dans le repository interne sont de la forme X.Y.Z_n
  X correspond a un etat de la structure de la base, il est augmenté si le schema de la base evolue
  Y correspond a un etat de fonctionnalité, il est augmenté lors de l'implementation d'un nouvelle fonctionnalité
  Z correspond a un version de bugfix
  n correspond a un increment de build, c'est le seul qui sera incrementé au cours du developpement.
les valeurs de X,Y et Z ne sont modifiée que suite a un push vers le repository externe
ces X,Y et Z ne sont pas limités a etre entre 0 à 10 mais sont sans limites
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

## 📚 Documentation Complémentaire

Ce document fournit une vue d'ensemble du projet. Pour des détails techniques approfondis, consultez:

### Documentation Frontend
**[frontend/CLAUDE_FRONTEND.md](frontend/CLAUDE_FRONTEND.md)** (~1490 lignes)

Contient toute la documentation technique frontend:
- Architecture des Blocks (3 sections: Tasks, Rescue, Always)
- Architecture des Sections PLAY (Variables, Roles, Pre-tasks, Tasks, Post-tasks, Handlers)
- Système de Drag & Drop complet avec règles de propagation
- Système de Liens (validation, affichage, visibilité)
- Architecture de rendu des liens (Section-Scoped SVG)
- Patterns à respecter (Component Composition, Event Handling, Type Safety)
- Refactoring et consolidation du code (composants réutilisables)
- Pièges à éviter (Drag & Drop, State Updates, Visibilité)
- Fichiers importants avec lignes de code clés
- Fonctionnalités implémentées (checklist complète)

### Documentation Backend
**[backend/CLAUDE_BACKEND.md](backend/CLAUDE_BACKEND.md)** (~150 lignes)

Contient toute la documentation technique backend:
- Stack technique détaillée
- Architecture de données (modèles User, Playbook, Collection, Module)
- API Endpoints (auth, playbooks, collections, modules)
- Services (collecte, compilation YAML, authentification)
- Déploiement et configuration Kubernetes
- Sécurité et performance
- Tests et structure du projet

### Documentation des Optimisations
**[frontend/docs/README_OPTIMISATION.md](frontend/docs/README_OPTIMISATION.md)**

Point d'entrée pour les optimisations futures:
- Analyse approfondie du codebase
- 7 opportunités majeures de mutualisation
- Potentiel d'élimination de 700-750 lignes de code dupliqué
- Plan de refactoring en 4 phases avec ROI

Voir aussi:
- [frontend/docs/ANALYSE_OPTIMISATION_CODE.md](frontend/docs/ANALYSE_OPTIMISATION_CODE.md) - Analyse détaillée (199 lignes)
- [frontend/docs/EXEMPLES_REFACTORING.txt](frontend/docs/EXEMPLES_REFACTORING.txt) - Code concret (85 lignes)
- [frontend/docs/CHECKLIST_REFACTORING.txt](frontend/docs/CHECKLIST_REFACTORING.txt) - Guide d'implémentation (253 lignes)

---

## 🔮 Prochaines Étapes

### Backend
- [x] Implémenter les modèles de données (User, Playbook, Module, Collection)
- [x] Créer les endpoints CRUD pour playbooks
- [x] Authentification JWT avec bcrypt fix
- [x] Support SQLite pour développement
- [ ] Service de collecte des modules Ansible Galaxy
- [ ] Service de compilation YAML (transformer les blocks 3 sections)

### Frontend
- [x] Système de persistance des playbooks (auto-save avec debounce 3s)
- [x] Interface de gestion des playbooks (création, liste, suppression, sélection)
- [x] Indicateur visuel de sauvegarde dans AppHeader
- [x] Gestion des variables avec validation des doublons (dialog)
- [x] URLs relatives pour reverse proxy
- [ ] Formulaires dynamiques pour configuration modules
- [ ] Prévisualisation YAML en temps réel
- [ ] Download du playbook généré
- [ ] Validation des liens (éviter cycles)
- [ ] Undo/Redo pour les opérations

### DevOps
- [x] Configuration SQLite pour déploiement single-pod
- [x] Désactivation autoscaling incompatible avec SQLite
- [ ] CI/CD pipeline (GitHub Actions ou GitLab CI)
- [ ] Tests automatisés (pytest backend, vitest frontend)
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Logging centralisé (ELK ou Loki)

---

## 📊 Résumé des Refactorings Réalisés

Le codebase a fait l'objet de plusieurs refactorings majeurs pour améliorer la maintenabilité:

### Composants Réutilisables Créés

1. **TaskAttributeIcons** (~240 lignes économisées)
   - Composant pour afficher les 5 icônes d'attributs de tâche
   - Élimine la duplication dans 10+ emplacements

2. **Architecture des Badges Unifiés** (~85+ lignes économisées)
   - Hiérarchie à 3 niveaux: CountBadge → TabIconBadge / StartTaskWithBadge
   - Single source of truth pour le styling des badges

3. **ResizeHandles** (~289 lignes économisées)
   - Composant pour poignées de redimensionnement 8 directions
   - Approche par configuration (HandleConfig array)

4. **SectionLinks** (~320 lignes économisées)
   - Architecture section-scoped pour le rendu des liens
   - Suppression du SVG global et du scroll tracking

5. **Types Partagés** (~120 lignes économisées)
   - Centralisation dans types/playbook.ts
   - Garantit la cohérence entre composants

6. **PlaySectionContent** (~800 lignes économisées)
   - Composant réutilisable pour sections PLAY
   - Élimine duplication entre les 4 sections

**Total économisé: ~1,854 lignes de code**

---

## 📝 Notes Importantes

### Règles d'Or

1. **State Updates:** Toujours utiliser `setModules(prev => ...)` (forme fonctionnelle) pour éviter les stale closures

2. **Drag & Drop:** Vérifier si on doit traiter l'événement AVANT de bloquer la propagation

3. **Liens:** Les liens ne peuvent être créés qu'entre tâches de la même section (validation stricte)

4. **Positions:** Utiliser les coordonnées de l'état React (`module.x`, `module.y`) pour les calculs de position, pas `getBoundingClientRect()` directement

5. **Composants:** Privilégier la réutilisation et l'extraction de composants pour éviter la duplication

---

---

## 📋 **Procédure de Développement**

**Voir :** [TOOLING/PROCEDURE_DEVELOPPEMENT.md](TOOLING/PROCEDURE_DEVELOPPEMENT.md)

### Résumé des Règles de Versioning :
- **Développement :** X.Y.Z_n (ex: 1.3.8_1, 1.3.8_2...)
- **Production :** X.Y.Z (push vers ghcr.io uniquement sur validation)
- **X** : Schema DB | **Y** : Fonctionnalité | **Z** : Bugfix | **n** : Build

### Actions Obligatoires :
1. **Builder** seulement les images modifiées (backend et/ou frontend)
2. **Déployer** sur Kubernetes avec versions _n
3. **Vérifier** les logs de démarrage
4. **Tester** TOUTES les APIs à chaque déploiement backend
5. **Push ghcr.io** uniquement sur validation explicite avec commit

---

## 🔄 **Changelog - Session 2025-12-05**

### 🎯 **Problème Résolu : URLs localhost:8000**

**Issue :** Le frontend appelait des URLs hardcodées `http://localhost:8000/api/auth/login` au lieu d'URLs relatives.

**Fix Principal :** 
- **Fichier :** `frontend/src/contexts/AuthContext.tsx`
- **Changement :** Remplacé `axios.post('http://localhost:8000/api/auth/login')` par `getHttpClient().post('/auth/login')`
- **Impact :** Plus d'erreurs de connexion, utilise maintenant les URLs relatives correctes

### 🗄️ **Ajout Support SQLite Complet**

**Backend v1.3.8 :** Ajout support SQLite avec initialisation automatique
- **Fichier :** `backend/app/main.py`
- **Nouveautés :**
  - Cycle de vie FastAPI avec initialisation DB automatique
  - Création automatique utilisateur admin (`admin@example.com` / `admin`)
  - Support SQLite et PostgreSQL via variables d'environnement
  - Logs détaillés de démarrage avec émojis

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 Starting Ansible Builder API v1.3.8")
    await init_db()
    await create_default_user()
    yield
```

### 📦 **Images Déployées**

**Backend :** `ghcr.io/ccoupel/ansible-builder-backend:1.3.9-dev2`
- Support SQLite avec initialisation auto
- Utilisateur admin par défaut créé au démarrage (`admin@example.com` / `admin123`)
- Fix bcrypt avec `bcrypt==4.0.1` explicite
- Configuration via variables d'environnement

**Frontend :** `ghcr.io/ccoupel/ansible-builder-frontend:1.5.1`
- AuthContext.tsx corrigé (plus de localhost:8000)
- Support URLs relatives complètes
- Base path `/ansible-builder` supporté

### ⚙️ **Configuration Déploiement**

**Helm Configuration :**
```yaml
backend:
  replicaCount: 1
  image:
    tag: "1.3.9-dev2"
    pullPolicy: Always
  env:
    DATABASE_TYPE: "sqlite"
    SQLITE_DB_PATH: "/tmp/ansible_builder.db"
  autoscaling:
    enabled: false
    minReplicas: 1
    maxReplicas: 1
    
frontend:
  image:
    tag: "1.5.1"
    pullPolicy: Always
```

**PostgreSQL :** Supprimé des dépendances Helm (SQLite par défaut)

### 🚀 **Build & Deploy Process**

**Docker Host :** Utilisé Docker distant `192.168.1.217:2375`
**Registry :** GitHub Container Registry (`ghcr.io`)
**Déploiement :** Helm upgrade réussi (révision 40)

### ✅ **Status Final (v1.3.9_2)**

- **URLs :** ✅ Plus d'erreur localhost:8000
- **Frontend :** ✅ v1.5.1 déployé avec fix AuthContext
- **Backend :** ✅ v1.3.9-dev2 déployé avec SQLite
- **API Endpoints :** ✅ `/version` et `/api/version` accessibles
- **Authentication :** ✅ Fonctionnelle (admin@example.com / admin123)
- **Autoscaling :** ✅ Désactivé (compatible SQLite single-pod)
- **Bcrypt :** ✅ Fix appliqué avec bcrypt==4.0.1

### 📁 **Scripts Créés**

- `TOOLING/build-and-deploy-backend-sqlite.ps1`
- `TOOLING/deploy-with-docker-alternatives.ps1` 
- `TOOLING/simple-deploy.ps1`

---

## 🔧 Correctifs de Session (v1.3.9_2)

### Issues Résolues
1. **bcrypt/passlib AttributeError**
   - ❌ **Erreur :** `module 'bcrypt' has no attribute '__about__'`
   - ✅ **Fix :** Ajout `bcrypt==4.0.1` dans requirements.txt
   - ✅ **Test :** Mot de passe admin changé en "admin123"

2. **SQLite Multi-pods Incompatibility** 
   - ❌ **Problème :** 2+ pods backend avec bases SQLite séparées
   - ✅ **Fix :** `replicaCount: 1` + `autoscaling.enabled: false`
   - ✅ **Résultat :** 1 seul pod backend stable

3. **URLs Relatives Reverse Proxy**
   - ❌ **Problème :** Hardcoded `localhost:8000` dans AuthContext
   - ✅ **Fix :** Utilisation `getHttpClient()` pour URLs relatives
   - ✅ **Test :** Compatible https://coupel.net/ansible-builder

### Configuration Finale Validée
```yaml
backend:
  replicaCount: 1
  image:
    tag: "1.3.9-dev2"
  env:
    DATABASE_TYPE: "sqlite"
    SQLITE_DB_PATH: "/tmp/ansible_builder.db"
  autoscaling:
    enabled: false
```

### Authentification Opérationnelle
- 🌐 **URL :** https://coupel.net/ansible-builder
- 👤 **Credentials :** admin@example.com / admin123  
- 🔒 **Hashing :** bcrypt fonctionnel
- 💾 **Database :** SQLite initialisée automatiquement

**Dernière mise à jour :** 2025-12-05  
**Version courante :** 1.3.9_2
