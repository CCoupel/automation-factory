# Décisions d'Architecture - Automation Factory

Ce document trace les décisions techniques importantes et leurs justifications.

---

## 🏗️ **Stack Technique**

### Backend : FastAPI + Python
**Décision :** FastAPI avec Python 3.11+
**Justification :**
- Performance élevée (async/await natif)
- Documentation automatique (Swagger/OpenAPI)
- Validation automatique (Pydantic)
- Écosystème Python riche pour Ansible

### Frontend : React + TypeScript
**Décision :** React 18 avec TypeScript
**Justification :**
- Composants réutilisables
- État local granulaire
- Type safety (réduction bugs)
- Écosystème Material-UI

### Base de Données : SQLite Production
**Décision :** SQLite pour production (single-pod)
**Justification :**
- Simplicité déploiement
- Performance suffisante (usage read-heavy)
- Pas de complexité cluster
- Backup simplifié

---

## 🚀 **Galaxy API Integration**

### Service SMART vs Échantillonnage
**Décision :** API directe namespaces (Service SMART)
**Justification :**
- **Performance :** 100+ calls → 11 calls (-90%)
- **Complétude :** 2,204 namespaces vs 75
- **Fiabilité :** API officielle vs heuristique
- **Maintenance :** Moins de code complexe

### Architecture 3 Niveaux
**Décision :** Enrichissement populaires + background + on-demand
**Justification :**
- **UX :** Données importantes immédiatement
- **Performance :** Chargement progressif
- **Scalabilité :** Évite surcharge API
- **Flexibilité :** Adaptation usage utilisateur

---

## 🎨 **Frontend Architecture**

### Drag & Drop Natif
**Décision :** HTML5 Drag & Drop API (pas de librairie)
**Justification :**
- **Performance :** Pas de dépendance externe
- **Contrôle :** Gestion fine des événements
- **Simplicité :** API standard navigateurs
- **Bundle size :** Réduction poids application

### State Management : useState
**Décision :** React hooks (pas Redux/Zustand)
**Justification :**
- **Simplicité :** Moins de boilerplate
- **Performance :** État local optimisé
- **Maintenabilité :** Code colocalisé
- **Bundle :** Pas de dépendance externe

### Material-UI (MUI)
**Décision :** MUI comme UI library
**Justification :**
- **Design system :** Cohérence visuelle
- **Composants riches :** Drag & Drop, Accordion
- **Thème :** Customisation avancée
- **Accessibilité :** ARIA intégré

---

## 📦 **Déploiement**

### Kubernetes Single-Pod
**Décision :** 1 replica backend/frontend
**Justification :**
- **SQLite :** Compatible single-instance uniquement
- **Simplicité :** Moins de complexité réseau
- **Coût :** Ressources optimisées
- **Debugging :** Logs centralisés

### GitHub Container Registry
**Décision :** ghcr.io vs Docker Hub
**Justification :**
- **Intégration :** Même plateforme que code
- **Sécurité :** Token GitHub réutilisable
- **Performance :** Géodistribution
- **Gratuit :** Pas de limite pour projets publics

### Architecture de Déploiement Multi-Phase
**Décision :** 3 phases distinctes avec architectures différentes
**Justification :**

#### Phase 1 : Développement Local
- **Containers directs :** Backend (8000) + Frontend (5173)
- **Simplicité :** Test rapide et debugging
- **Isolation :** Services indépendants

#### Phase 2 : Staging/Intégration (nginx reverse proxy)
**Architecture :**
```
nginx (port 80) → Point d'entrée unique
├── / → frontend (Vite dev server, port 5173)
└── /api/* → backend (FastAPI, port 8000)
```

**Justifications :**
- **Réalisme production :** Simule architecture finale
- **Point d'entrée unique :** Gestion CORS simplifiée
- **Images locales :** Build sur serveur staging (pas de push ghcr.io)
- **Frontend Vite :** Développement avec hot-reload
- **Debugging :** Logs accessibles et isolation réseau

#### Phase 3 : Production Kubernetes
- **Ingress Controller :** Routing externe
- **Images registry :** ghcr.io avec tags versionnés
- **SSL/TLS :** Certificats automatiques
- **Monitoring :** Observabilité complète

### Nginx Reverse Proxy (Phase 2)
**Décision :** Configuration nginx inline dans docker-compose
**Justification :**
- **Simplicité :** Pas de fichiers externes à synchroniser
- **Version control :** Configuration dans le code
- **Déploiement atomique :** Tout dans docker-compose.staging.yml
- **Flexibilité :** Adaptation facile par environnement

---

## 🔒 **SystemBlock - Blocs Système Non-Modifiables**

### Décision : Type dérivé avec contraintes de comportement
**Décision :** Créer un `SystemBlock` comme type dérivé de `ModuleBlock` avec des contraintes spécifiques de comportement (drag/drop/edit).

**Justification :**
- **Visibilité :** Les blocs d'assertions doivent être visibles pour comprendre la validation
- **Protection :** L'utilisateur ne doit pas pouvoir modifier les règles auto-générées
- **Cohérence :** Même rendu visuel que les blocs normaux mais avec style distinct

### Propriétés SystemBlock
```typescript
interface SystemBlock extends ModuleBlock {
  isSystem: true
  isBlock: true
  systemType: 'assertions'  // Type de bloc système
  sourceVariable: string    // Variable source pour les assertions
}
```

### Contraintes de Comportement
| Action | Bloc Système | Tâches Internes |
|--------|--------------|-----------------|
| Repositionner le bloc | ✅ Autorisé | - |
| Repositionner les tâches internes | - | ✅ Autorisé |
| Drop externe sur le bloc | ❌ Bloqué | ❌ Bloqué |
| Drag vers l'extérieur | ❌ Bloqué | ❌ Bloqué |
| Création de liens internes | ✅ Autorisé | ✅ Autorisé |
| Liens depuis START | ✅ Autorisé | ✅ Autorisé |
| Édition nom/paramètres | ❌ Bloqué | ❌ Bloqué |
| Suppression | ❌ Bloqué | ❌ Bloqué |

### Style Visuel
- **Thème gris** : `rgba(158, 158, 158, 0.15)` pour le fond
- **Icône cadenas** : `LockIcon` au lieu de `AccountTreeIcon`
- **Opacité réduite** : 0.85 pour distinction visuelle
- **Sections masquées** : Pas de Rescue/Always (uniquement Normal)
- **Tooltip** : "Bloc système - Généré automatiquement"

### Génération Automatique des Liens
Le `assertionsGenerator.ts` génère automatiquement :
1. **Liens entre blocs** : START pre_tasks → Bloc1 → Bloc2 → ...
2. **Liens internes** : Block-START → Tâche1 → Tâche2 → ...

```
__system_link_start_to_var1 : play-1-start-pre-tasks → __system_var_var1
__system_link___system_var_var1_task_0 : __system_var_var1-normal-start → task1
__system_link___system_var_var1_task_1 : task1 → task2
```

---

## 🔧 **Patterns de Code**

### Component Composition
**Décision :** Composants réutilisables vs duplication
**Justification :**
- **TaskAttributeIcons :** 240 lignes économisées
- **ResizeHandles :** 289 lignes économisées  
- **SectionLinks :** 320 lignes économisées
- **Maintenabilité :** Single source of truth

### Types Partagés
**Décision :** Centralisation types/playbook.ts
**Justification :**
- **Cohérence :** Interfaces unifiées
- **Évolution :** Changements centralisés
- **Documentation :** Types auto-documentés
- **Refactoring :** Facilité modifications

---

## 🗄️ **Données**

### Cache Multi-Niveaux
**Décision :** Frontend TTL + Backend Redis + Galaxy API
**Justification :**
- **UX :** Réponse immédiate interface
- **Performance :** Réduction latence réseau
- **Scalabilité :** Moins de charge serveur
- **Coût :** Réduction appels API externes

### JSON vs Relations
**Décision :** JSONB PostgreSQL pour structures flexibles
**Justification :**
- **Flexibilité :** Schema évolutif
- **Performance :** Requêtes JSON optimisées
- **Simplicité :** Pas de JOINs complexes
- **Migration :** Compatible SQLite

### ⚠️ RÈGLE CRITIQUE : Stockage en Base de Données

**Décision :** TOUTES les données utilisateur doivent être stockées en base de données

**Justification :**
- **Persistence :** Les fichiers temporaires (`/tmp`) sont perdus au redémarrage des containers
- **Multi-utilisateur :** Chaque utilisateur doit avoir ses propres données isolées
- **Scalabilité horizontale :** Plusieurs instances backend peuvent coexister
- **Haute disponibilité :** Pas de dépendance à l'état local du container

**Données concernées :**
| Type | Stockage | Table/Champ |
|------|----------|-------------|
| Utilisateurs | DB | `users` |
| Playbooks | DB | `playbooks` |
| Partages | DB | `playbook_shares` |
| Audit log | DB | `playbook_audit_log` |
| Types variables custom | DB | `custom_variable_types` |
| Favoris namespaces | DB | `user_preferences.favorite_namespaces` |
| Favoris collections | DB | `user_preferences.galaxy_settings.favorite_collections` |
| Favoris modules | DB | `user_preferences.galaxy_settings.favorite_modules` |
| Préférences interface | DB | `user_preferences.interface_settings` |

**Exceptions acceptables (côté client uniquement) :**
- Token JWT (`localStorage`) - régénéré au login
- Thème sombre (`localStorage`) - préférence UI mineure
- Cache playbook (`sessionStorage`) - cache temporaire de session

**Interdit :**
- ❌ Fichiers `/tmp` pour données persistantes
- ❌ `localStorage` pour données multi-appareils
- ❌ Variables globales backend pour état utilisateur

---

## 🌐 **Base URL Frontend — Build Once Deploy Everywhere**

### Décision : Vite base './' avec injection runtime
**Décision :** Utiliser `base: './'` dans Vite (chemins relatifs) + injection runtime de `<base href>` et `window.__BASE_PATH__` via `docker-entrypoint.sh`.

**Justification :**
- **BORE-compliant :** Même image Docker fonctionne avec ou sans sous-chemin (staging `/` vs production `/automation-factory`)
- **Pas de rebuild :** Le base path est injecté au démarrage du container, pas au build
- **Compatibilité Traefik stripPrefix :** L'entrypoint injecte dans les DEUX index.html (racine `/usr/share/nginx/html/index.html` ET sous-répertoire `/${BASE_PATH}/index.html`) pour que Traefik serve correctement après strip du prefix

### Fichiers impliqués
| Fichier | Rôle |
|---------|------|
| `frontend/vite.config.ts` | `base: './'` — génère chemins relatifs pour assets et dynamic imports |
| `frontend/docker-entrypoint.sh` | Injecte `<base href>`, `window.__BASE_PATH__`, `window.__API_URL__` dans index.html |
| `frontend/nginx.conf` | Headers anti-cache sur index.html (`Cache-Control: no-cache, no-store, must-revalidate`) |
| `custom-values.yaml` / Helm | Variable `BASE_PATH` passée au container frontend |
| `docker-compose.staging.yml` | Pas de `BASE_PATH` en staging (défaut `/`) |

### Injection runtime (docker-entrypoint.sh)
```
1. Si BASE_PATH est défini et != "/" :
   - Copie les fichiers dans /${BASE_PATH}/
   - Injecte <base href="/${BASE_PATH}/"> dans les DEUX index.html
   - Injecte window.__BASE_PATH__ = "/${BASE_PATH}"
   - Injecte window.__API_URL__ = "/${BASE_PATH}/api"
2. Sinon (staging, pas de sous-chemin) :
   - Injecte uniquement dans index.html racine
   - window.__BASE_PATH__ = "/"
```

### React Router
- `BrowserRouter basename` utilise `window.__BASE_PATH__` pour que le routing fonctionne sous un sous-chemin

---

## 🚦 **Rejected Alternatives**

### ❌ Vue.js / Angular
**Rejeté :** Autres frameworks frontend
**Raison :** Écosystème React plus riche pour drag & drop

### ❌ GraphQL
**Rejeté :** GraphQL vs REST
**Raison :** Complexité inutile pour APIs simples

### ❌ Microservices
**Rejeté :** Architecture distribuée
**Raison :** Complexité excessive pour taille projet

### ❌ NoSQL (MongoDB)
**Rejeté :** Base NoSQL
**Raison :** Relations simples, pas besoin flexibilité schema

### ❌ State Management Libraries
**Rejeté :** Redux, Zustand, Recoil
**Raison :** État local suffisant, éviter over-engineering

---

## 📈 **Évolution Future**

### Migration Potentielles

#### Multi-Pod Backend
**Condition :** Si usage > 1000 utilisateurs simultanés
**Actions :** Migration SQLite → PostgreSQL + Redis session

#### CDN Assets
**Condition :** Si latence géographique problématique
**Actions :** CloudFlare ou AWS CloudFront

#### WebSocket Real-time
**Condition :** Si collaboration multi-utilisateur requise
**Actions :** Socket.io + état partagé temps réel

---

## 🔍 **Métriques de Validation**

### Performance Validée
- **Galaxy API :** <100ms (objectif <2s) ✅
- **Frontend :** 60fps drag & drop ✅
- **Bundle size :** <1MB gzipped ✅
- **Memory :** <100MB utilisation ✅

### Maintenabilité Validée
- **Code duplication :** <5% (vs 30% avant refactoring) ✅
- **Type coverage :** 95%+ TypeScript ✅
- **Component reuse :** 80%+ composants partagés ✅
- **Documentation :** Structure modulaire ✅

---

*Voir aussi :*
- [Project Overview](PROJECT_OVERVIEW.md)
- [Galaxy Integration](../backend/GALAXY_INTEGRATION.md)
- [Frontend Implementation](../frontend/FRONTEND_IMPLEMENTATION.md)