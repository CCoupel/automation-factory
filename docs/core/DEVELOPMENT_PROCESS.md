# Process de Développement - Automation Factory

Ce document décrit la méthodologie de développement, les phases et les procédures pour Automation Factory.

---

## 📋 **Système de Versioning**

### Format des Versions
**Pattern :** `X.Y.Z_n`

- **X** : État de la structure de base (modifié si schéma DB évolue)
- **Y** : État de fonctionnalité (incrémenté pour nouvelles features)
- **Z** : Version de bugfix (incrémenté pour corrections)
- **n** : Incrément de build (seul modifié pendant développement)

### Règles d'Incrémentation
- **X, Y, Z** : Modifiés uniquement sur push vers repository externe
- **n** : Incrémenté à chaque build en développement
- **Limites** : Aucune limite sur X, Y, Z (pas de contrainte 0-10)
- **Décision** : Incrémentation X/Y/Z sur demande ou conseil Claude

### Exemples
```
Développement : 1.4.0_1 → 1.4.0_2 → 1.4.0_3
Feature      : 1.4.0_3 → 1.5.0 (production)
Bugfix       : 1.5.0   → 1.5.1 (production)
Breaking     : 1.5.1   → 2.0.0 (production)
```

---

## 🏗️ **Principe BORE : Build Once, Run Everywhere (avec promotion sans rebuild)**

### Concept Fondamental (v2.4.4+)

Le principe **BORE** garantit que les sources **compilées une seule fois** peuvent être promues à différents environnements sans reconstruction. Cela élimine les risques de divergence binaire.

### Cycle QUALIF (Promotion sans rebuild)

| Étape | Version | Action |
|-------|---------|--------|
| **BUILD** | `X.Y.Z.a` | Images construites localement sur daemon 192.168.1.217 |
| **PUBLISH QUALIF** | `X.Y.Z.a` | Manifeste + release.env créés, **pas de rebuild** |
| **DEPLOY QUALIF** | `X.Y.Z.a` | Docker Compose déploie les images promotées, tests E2E |

### Cycle PROD (Rebuild déterministe CI)

| Étape | Version | Action |
|-------|---------|--------|
| **PUBLISH PROD** | `X.Y.Z` | Merge + tag vX.Y.Z, **déclenche CI** (rebuild depuis source figée) |
| **BUILD CI** | `X.Y.Z` | Pipeline CI reconstruit depuis le tag, images `:X.Y.Z` poussées ghcr.io |
| **DEPLOY PROD** | `X.Y.Z` | Helm déploie les images certifiées de ghcr.io, monitoring 30 min |

### Architecture Images (Versioning X.Y.Z.a)

```
┌──────────────────────────────────────┐
│  QUALIF (Phase 2, 192.168.1.217)     │
├──────────────────────────────────────┤
│  BUILD: X.Y.Z.a → Images locales     │
│  PUBLISH: Manifeste + release.env    │
│  DEPLOY: Compose, e2e-tests, "go"    │
└──────────────────────────────────────┘
              │ (PROMOTE)
              ▼
┌──────────────────────────────────────┐
│  PROD (Phase 3, CI + Kubernetes)     │
├──────────────────────────────────────┤
│  PUBLISH: Release → Tag → CI rebuild │
│  BUILD CI: ghcr.io/:X.Y.Z            │
│  DEPLOY: Helm, smoke, monitor 30min  │
└──────────────────────────────────────┘
```

### Comparaison Staging vs Production

| Aspect | QUALIF | PROD |
|--------|--------|------|
| **Dockerfile** | `backend/Dockerfile` (production nginx) | `backend/Dockerfile` (production nginx) |
| **Image tag** | `X.Y.Z.a` (ex: 2.4.4.3) | `X.Y.Z` (ex: 2.4.4) |
| **Registry** | Daemon local 192.168.1.217 | ghcr.io/ccoupel (CI) |
| **Publish mode** | Promotion sans rebuild | Rebuild déterministe CI |
| **ENVIRONMENT** | STAGING | PROD |
| **Build counter** | Compteur `.a` présent | Retiré (`.a` → version figée) |

### ⚠️ Ce qui est INTERDIT

```bash
# ❌ INTERDIT : Rebuild en Phase 3
docker build ... # Jamais en Phase 3 !

# ❌ INTERDIT : Dockerfile différent staging/prod
frontend/Dockerfile.dev  # N'existe plus pour staging
frontend/Dockerfile      # Utilisé partout

# ❌ INTERDIT : kubectl set image en production
kubectl set image ...    # Casse la cohérence Helm

# ❌ INTERDIT : Modifications code entre staging et prod
# Le code déployé en prod = exactement celui validé en staging
```

### ✅ Ce qui est OBLIGATOIRE

```bash
# ✅ OBLIGATOIRE : Build unique en Phase 2
docker build -t frontend:X.Y.Z -f frontend/Dockerfile frontend/

# ✅ OBLIGATOIRE : Même image nginx en staging et production
# Staging: frontend:X.Y.Z (nginx, port 80)
# Prod: ghcr.io/.../frontend:X.Y.Z (nginx, port 80)

# ✅ OBLIGATOIRE : Déploiement production via Helm
helm upgrade automation-factory ./helm/automation-factory --values custom-values.yaml

# ✅ OBLIGATOIRE : Différences par variables d'environnement uniquement
ENVIRONMENT=STAGING  # Affiche version RC
ENVIRONMENT=PROD     # Masque suffixe RC
```

---

## 🚀 **Sprint de Développement - 3 Phases**

### Étapes du Sprint

1. **Définition** : Nouvelle fonctionnalité ou définition d'un bug
2. **Classification** : Confirmation feature vs bugfix (impact versioning)
3. **Planification** :
   - 3a) Plan de développement avec impact, risques, gains
   - 3b) Mise à jour documentation avec la demande

### **Phase 1 : Développement** 🛠️
4. **Développement Local Native** :
   - 4a) Implémentation + tests unitaires OBLIGATOIRES
   - 4b) Exécution locale (backend:8000, frontend:5173)
   - 4c) Validation versions via /version et /api/version
   - 4d) Tests API non-régression + nouvelles API
   - 4e) Linting et build validation

### **Phase 2 : Intégration** 🔗  
5. **Packaging et Staging** :
   - 5a) Build images Docker X.Y.Z
   - 5b) Déploiement docker-compose sur 192.168.1.217
   - 5c) Tests end-to-end automatisés
   - 5d) Validation utilisateur sur staging

### **Phase 3 : Production** 🚀
6. **Déploiement Production** :
   - 6a) Tag version finale X.Y.Z
   - 6b) Déploiement Kubernetes production
   - 6c) Smoke tests et monitoring
   - 6d) Documentation finale

---

## 🔄 **Gates et Critères de Passage**

### Gate Phase 1 → Phase 2
**Procédure Claude :**
1. 🔍 **Relire PHASE1_DEVELOPMENT.md** avant début Phase 1
2. ✅ Compléter toutes étapes Phase 1
3. 🙋 **Demander validation utilisateur** pour passage Phase 2
4. ⏳ **Attendre "go" explicite** avant continuer

**Critères techniques :**
- ✅ Tests unitaires passent (100%)
- ✅ Linting 0 erreurs
- ✅ Exécution locale fonctionnelle
- ✅ Versions correctes affichées
- ✅ API tests non-régression OK

### Gate Phase 2 → Phase 3
**Procédure Claude :**
1. 🔍 **Relire PHASE2_INTEGRATION.md** avant début Phase 2
2. ✅ Compléter toutes étapes Phase 2
3. 🙋 **Demander validation utilisateur** pour passage Phase 3
4. ⏳ **Attendre "go" explicite** avant continuer

**Critères techniques :**
- ✅ Tests E2E automatisés passent
- ✅ Validation utilisateur signée
- ✅ Performance conforme aux cibles
- ✅ Version RC validée

### Gate Phase 3 → Fini
**Procédure Claude :**
1. 🔍 **Relire PHASE3_PRODUCTION.md** avant début Phase 3
2. ✅ Compléter toutes étapes Phase 3
3. ℹ️ **Informer utilisateur** déploiement terminé

**Critères techniques :**
- ✅ Smoke tests production OK
- ✅ Métriques stables 30 min
- ✅ 0 erreurs critiques

---

## 🔧 **Phase 1 : Développement**

### Vue d'Ensemble
La Phase 1 se concentre sur le développement local et la validation technique avant toute mise en production.

### Objectifs Clés
- **Développement et test** sur environnement local  
- **Validation technique** complète de l'implémentation
- **Préparation pour validation utilisateur** avec version `X.Y.Z_n`

### Procédures Détaillées
> **📋 Voir guide complet :** [Phase 1 - Développement](../operations/PHASE1_DEVELOPMENT.md)

#### Points Critiques Phase 1
- Tests unitaires 100% passants
- Validation utilisateur **obligatoire** avant Phase 2
- Documentation technique mise à jour
- Performance locale validée

---

## 🚀 **Phase 2 : Intégration et Production**

### Vue d'Ensemble  
La Phase 2 couvre le déploiement en production et la finalisation complète du cycle de développement.

### Objectifs Clés
- **Documentation finale** et changelog mis à jour
- **Déploiement production** avec version stable `X.Y.Z`  
- **Tests complets** environnement réel
- **Validation utilisateur finale** et nettoyage documentation

### Procédures Détaillées
> **📋 Voir guide complet :** [Phase 2 - Production](../operations/PHASE2_PRODUCTION.md)

#### Points Critiques Phase 2
- Suppression suffixe `_n` des versions
- Tests production obligatoires (tous endpoints)
- Rollback automatique si erreurs critiques
- Commit final avec documentation complète

---

## 🏗️ **Infrastructure de Développement**

### Environnements

**Local Development**
- **Host** : 192.168.1.217
- **Ports** : Frontend 5173, Backend 8000
- **Database** : SQLite pour développement
- **Cache** : Redis local ou in-memory

**Production**
- **Registry** : ghcr.io/ccoupel
- **Orchestration** : Kubernetes
- **URL** : https://coupel.net/automation-factory
- **Database** : SQLite single-pod (production)

### Configuration

**Docker Host**
```bash
export DOCKER_HOST=tcp://192.168.1.217:2375
```

**GitHub Registry**
```bash
# Token dans github_token.txt
docker login ghcr.io -u username --password-stdin < github_token.txt
```

**Kubernetes**
```bash
# Kubeconfig dans kubeconfig.txt
export KUBECONFIG=kubeconfig.txt
```

---

## 🧪 **Stratégie de Tests**

### Tests Phase 1 (Développement)
1. **Tests Unitaires** : Composants isolés
2. **Tests API** : Endpoints backend
3. **Tests Intégration** : Frontend ↔ Backend
4. **Tests Manuels** : Interface utilisateur
5. **Performance** : Métriques de base

### Tests Phase 2 (Production)
1. **Tests Déploiement** : Pods démarrent correctement
2. **Tests API Complets** : Tous endpoints via reverse proxy
3. **Tests Performance** : Charge et temps de réponse
4. **Tests Régression** : Fonctionnalités existantes
5. **Tests Acceptation** : Scénarios utilisateur

### Critères de Succès
- **Phase 1** : 100% tests unitaires, API répond, interface charge
- **Phase 2** : 100% endpoints prod, <2s response time, 0 erreur critique

---

## 📊 **Métriques et Suivi**

### Métriques Techniques
- **Build Time** : Durée build frontend/backend
- **Deploy Time** : Temps déploiement Kubernetes
- **API Response** : Temps réponse endpoints
- **Galaxy Performance** : Métriques service SMART

### Métriques Qualité
- **Tests Coverage** : Pourcentage couverture tests
- **Error Rate** : Taux erreur production
- **User Experience** : Fluidité interface, bugs UI

### Rapports
- **Rapport Phase 1** : Tests techniques + performance locale
- **Rapport Phase 2** : Tests production + métriques complètes
- **Rapport Sprint** : Synthèse développement + évolutions

---

## 🔄 **Workflow Git**

### Branching Strategy
- **master** : Branch principale (production)
- **feature/** : Branches fonctionnalités (optionnel)
- **bugfix/** : Branches corrections (optionnel)

### Commit Guidelines
```
feat: Description courte de la feature

Description détaillée avec:
- Impact et changes
- Métriques si applicable
- Tests effectués

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Politique de Push
- **Phase 1** : Pas de push (développement local)
- **Phase 2** : Push après validation complète
- **Documentation** : Mise à jour obligatoire avant commit

---

## ⚠️ **Points d'Attention**

### Développement
- Ne jamais passer en Phase 2 sans validation utilisateur
- Incrémenter systématiquement version _n
- Tester accessibility avant livraison

### Déploiement
- Vérifier compatibilité versions avant déploiement
- Backup configuration avant changements majeurs
- Monitorer logs post-déploiement

### Documentation
- Mise à jour obligatoire à chaque changement
- Versionner la documentation avec le code
- Garder exemples à jour

---

*Voir aussi :*
- [Guide Déploiement](../operations/DEPLOYMENT_GUIDE.md)
- [Stratégie Tests](../operations/TESTING_STRATEGY.md)
- [Travail en Cours](../work/WORK_IN_PROGRESS.md)