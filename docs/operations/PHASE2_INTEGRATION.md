# Phase 2 : Intégration - Automation Factory

Ce document détaille les procédures spécifiques à la **Phase 2 : Intégration** du processus en 3 phases.

---

## 🎯 **Objectifs Phase 2**

### Scope de la Phase
- **Packaging et déploiement staging** sur environnement d'intégration
- **Tests end-to-end automatisés** complets
- **Validation utilisateur** en conditions réelles
- **Utilisation version `X.Y.Z.a`** (candidat de build, a = compteur incrémenté à chaque BUILD)

### Critères d'Entrée
- ✅ **Phase 1 complète** avec tous gates validés
- ✅ **Tests unitaires** passent 100%
- ✅ **Linting** 0 erreurs
- ✅ **Exécution locale** validée

### Critères de Sortie
- ✅ **Images Docker** validées et fonctionnelles
- ✅ **Tests E2E automatisés** passent 100%
- ✅ **Performance** conforme aux cibles staging
- ✅ **Validation utilisateur** signée
- ✅ **Version RC** approuvée pour production

### Principe "Build Once, Run Everywhere" (avec Promotion QUALIF + Rebuild CI PROD)
⚠️ **IMPORTANT** : Les images Docker buildées en Phase 2 (QUALIF) sont **promues sans rebuild** en QUALIF. En PROD, le pipeline CI **rebuild déterministement** depuis le tag git figé (source identique, mais reconstruction garantie).

| Aspect | QUALIF (Staging) | PROD (Kubernetes) |
|--------|---------|------------|
| Backend Dockerfile | `backend/Dockerfile` (production) | `backend/Dockerfile` (production) |
| Frontend Dockerfile | `frontend/Dockerfile` (production) | `frontend/Dockerfile` (production) |
| Image tag | `X.Y.Z.a` (ex: 2.4.4.3) | `X.Y.Z` (ex: 2.4.4) |
| Build mode | Local sur 192.168.1.217, promote | Rebuild déterministe CI depuis tag |
| Serveur frontend | nginx (port 80) | nginx (port 80) |

**Modèle :**
- QUALIF : source compilée une seule fois, manifeste + release.env, promotion sans rebuild (images restent locales)
- PROD : source figée par tag git, CI rebuild depuis cette source, images poussées ghcr.io avec version sans `.a`
- Avantage : validation sur code déterministe identique en QUALIF et PROD

---

## 🛠️ **Environnement d'Intégration**

### Infrastructure Staging
```bash
# Serveur de staging
Host: 192.168.1.217
Ports: 80 (frontend), 8000 (backend)
Database: PostgreSQL ou SQLite
Cache: Redis
```

### URLs de Test
```bash
Frontend: http://192.168.1.217:80
Backend:  http://192.168.1.217:8000
API Docs: http://192.168.1.217:8000/docs
```

---

## 📋 **Procédures Phase 2**

### 0. Mise à jour Documentation (OBLIGATOIRE)

#### Mettre à jour WORK_IN_PROGRESS.md
```markdown
# Ajouter/Mettre à jour dans docs/work/WORK_IN_PROGRESS.md

## 🚧 **Version X.Y.Z - Phase 2 Intégration**

**Status :** 🔄 Phase 2 en cours

### Fonctionnalités en test
- [Feature 1] Description
- [Feature 2] Description

### Environnement Staging
- **URL :** http://192.168.1.217
- **Version :** X.Y.Z.a (ex: 2.4.4.1, 2.4.4.2…)
```

### 1. Packaging Release Candidate

#### Versioning Candidat de Build
```bash
# À chaque BUILD, incrémenter le compteur a (X.Y.Z.0 → X.Y.Z.1 → X.Y.Z.2…)
# Utiliser UNIQUEMENT scripts/version.py (jamais d'édition manuelle)

python3 scripts/version.py bump-build
# Met à jour backend/app/version.py + frontend/package.json + package-lock.json
# Exemple : 2.4.4.0 → 2.4.4.1
```

#### Build Images Docker (Local sur Staging)
```bash
# ⚠️ IMPORTANT: Build local sur 192.168.1.217, PAS de push ghcr.io
# ⚠️ IMPORTANT: Utiliser Dockerfile PRODUCTION pour "build once, deploy everywhere"

# Backend - build local
docker -H tcp://192.168.1.217:2375 build -t automation-factory-backend:X.Y.Z.a \
  -f backend/Dockerfile backend/

# Frontend - build local avec Dockerfile PRODUCTION (nginx, pas Vite)
docker -H tcp://192.168.1.217:2375 build -t automation-factory-frontend:X.Y.Z.a \
  -f frontend/Dockerfile frontend/

# PAS de push - images restent locales sur 192.168.1.217
# La même image sera promue en production après validation
```

#### Mise à jour Docker-Compose
```yaml
# docker-compose.staging.yml
services:
  backend:
    image: automation-factory-backend:X.Y.Z.a
  frontend:
    image: automation-factory-frontend:X.Y.Z.a  # Même image que production (nginx)
  nginx:
    # Configuration nginx reverse proxy inline
    # Route vers frontend:80 (nginx) au lieu de frontend:5173 (Vite)
```

### 2. Déploiement Staging

#### Arrêt Environnement Précédent
```bash
docker --host=tcp://192.168.1.217:2375 compose -f docker-compose.staging.yml down
docker --host=tcp://192.168.1.217:2375 system prune -f
```

#### Déploiement RC
```bash
# Déploiement avec architecture nginx reverse proxy
docker -H tcp://192.168.1.217:2375 compose -f docker-compose.staging.yml up -d

# Vérification démarrage
docker -H tcp://192.168.1.217:2375 compose -f docker-compose.staging.yml logs -f

# Attendre stabilisation (30s)
sleep 30
```

#### Validation Déploiement
```bash
# Health checks via nginx reverse proxy
curl -I http://192.168.1.217/health          # Nginx OK
curl http://192.168.1.217/api/version        # Backend API OK
curl -I http://192.168.1.217/                # Frontend OK (nginx)

# Vérification version candidat (doit avoir .a et is_rc=true)
VERSION=$(curl -s http://192.168.1.217/api/version | jq -r .version)
IS_RC=$(curl -s http://192.168.1.217/api/version | jq '.is_rc')
if [[ $VERSION == *.* ]] && [[ $IS_RC == "true" ]]; then
    echo "✅ Build Candidate deployed: $VERSION (is_rc=$IS_RC)"
else
    echo "❌ Wrong version or is_rc: $VERSION (is_rc=$IS_RC)"
    exit 1
fi
```

### 3. Tests End-to-End Automatisés

#### Suite Tests E2E
```bash
#!/bin/bash
# e2e-tests.sh

echo "=== Tests End-to-End Phase 2 ==="
BASE_URL="http://192.168.1.217"  # Via nginx reverse proxy
EXIT_CODE=0

# Test 1: Services Health (via nginx)
echo "🔍 Testing services health..."
if ! curl -s -f $BASE_URL/health > /dev/null; then
    echo "❌ Nginx health check failed"
    EXIT_CODE=1
fi

if ! curl -s -f $BASE_URL/ > /dev/null; then
    echo "❌ Frontend not accessible"
    EXIT_CODE=1
fi

# Test 2: Authentication Flow
echo "🔍 Testing authentication flow..."
# TODO: Add auth tests when implemented

# Test 3: Nouvelle API Ansible Integration
echo "🔍 Testing new Ansible API..."
# Test versions Ansible
VERSIONS=$(curl -s $BASE_URL/api/ansible/versions | jq '.versions | length')
if [[ $VERSIONS -lt 5 ]]; then
    echo "❌ Too few Ansible versions: $VERSIONS"
    EXIT_CODE=1
fi

# Test collections pour version latest
COLLECTIONS=$(curl -s $BASE_URL/api/ansible/latest/collections | jq '.total_collections')
if [[ $COLLECTIONS -lt 10 ]]; then
    echo "❌ Too few collections: $COLLECTIONS"
    EXIT_CODE=1
fi

# Test 4: Module Schema Retrieval (nouvelle API)
echo "🔍 Testing module schema retrieval..."
SCHEMA=$(curl -s $BASE_URL/api/ansible/latest/namespaces/community/collections/general/modules/copy/schema)
if ! echo $SCHEMA | jq -e '.schema.parameters' > /dev/null; then
    echo "❌ Schema not properly returned"
    EXIT_CODE=1
fi

# Test 5: Error Handling
echo "🔍 Testing error handling..."
HTTP_CODE=$(curl -s -w "%{http_code}" $BASE_URL/api/ansible/latest/namespaces/nonexistent/collections/fake/modules/test/schema -o /dev/null)
if [[ $HTTP_CODE != "404" ]]; then
    echo "❌ Wrong error code: $HTTP_CODE (expected 404)"
    EXIT_CODE=1
fi

# Test 6: Performance
echo "🔍 Testing performance..."
RESPONSE_TIME=$(curl -w "%{time_total}" -s $BASE_URL/api/ansible/versions -o /dev/null)
if [[ $(echo "$RESPONSE_TIME > 5.0" | bc) -eq 1 ]]; then
    echo "❌ Response too slow: ${RESPONSE_TIME}s"
    EXIT_CODE=1
fi

echo "=== E2E Tests Complete ==="
exit $EXIT_CODE
```

#### Tests Performance Staging
```bash
#!/bin/bash
# performance-tests.sh

echo "=== Performance Tests Phase 2 ==="

# Test charge API (nouvelle API Ansible)
echo "🚀 Load testing Ansible API..."
for i in {1..10}; do
    TIME=$(curl -w "%{time_total}" -s http://192.168.1.217/api/ansible/versions -o /dev/null)
    echo "Request $i: ${TIME}s"
done

# Test parallèle
echo "🚀 Concurrent requests test..."
for i in {1..5}; do
    curl -s http://192.168.1.217/api/ansible/latest/collections > /dev/null &
done
wait

echo "✅ Performance tests complete"
```

### 4. Validation Utilisateur

#### Démonstration Fonctionnelle
```markdown
# Checklist Demo Utilisateur

1. **Navigation Interface**
   - [ ] Page d'accueil charge correctement
   - [ ] Version RC affichée
   - [ ] Navigation sans erreurs

2. **Fonctionnalités Core**
   - [ ] Authentification (si applicable)
   - [ ] Création/édition playbooks
   - [ ] Gestion modules

3. **Nouvelles Fonctionnalités**
   - [ ] Module parameter collection
   - [ ] Interface schema dynamique
   - [ ] Gestion erreurs améliorée

4. **Performance Utilisateur**
   - [ ] Pages chargent <3s
   - [ ] Interactions fluides
   - [ ] Pas d'erreurs visibles
```

#### Collecte Feedback
```markdown
# Formulaire Validation Utilisateur

**Version testée**: X.Y.Z.a
**Date test**: YYYY-MM-DD
**Testeur**: [Nom]

## Fonctionnalités Testées
- [ ] ✅ Fonctionnalité 1 - OK
- [ ] ⚠️ Fonctionnalité 2 - Problème mineur
- [ ] ❌ Fonctionnalité 3 - Bloquant

## Problèmes Identifiés
1. [Description problème]
2. [Description problème]

## Approbation
- [ ] ✅ **APPROUVÉ** pour production
- [ ] ❌ **REJETÉ** - corrections nécessaires

**Signature**: _________________
```

### 5. Corrections Release Candidate

#### Gestion des Problèmes
```bash
# Si corrections nécessaires: RC.n → RC.n+1

# 1. Corrections en local (retour Phase 1 partiel)
# 2. Tests unitaires
# 3. Nouveau build RC
echo '__version__ = "X.Y.Z.a+1"' > backend/app/version.py

# 4. Redéploiement local (même Dockerfile pour staging et prod)
docker -H tcp://192.168.1.217:2375 build -t automation-factory-backend:X.Y.Z.a+1 -f backend/Dockerfile backend/
docker -H tcp://192.168.1.217:2375 build -t automation-factory-frontend:X.Y.Z.a+1 -f frontend/Dockerfile frontend/

# 5. Retest complet
```

---

## ✅ **Checklist Validation Phase 2**

### Déploiement Staging
- [ ] **Images RC** buildées localement sur 192.168.1.217
- [ ] **Docker-compose** déployé sans erreurs  
- [ ] **Services démarrent** correctement
- [ ] **Version RC** confirmée via APIs

### Tests Automatisés
- [ ] **E2E tests** passent 100%
- [ ] **Performance tests** conformes
- [ ] **Load tests** supportés
- [ ] **Error handling** validé

### Validation Fonctionnelle
- [ ] **Demo utilisateur** réalisée
- [ ] **Feedback** collecté et traité
- [ ] **Problèmes critiques** corrigés
- [ ] **Approbation utilisateur** obtenue

### Documentation
- [ ] **Changelog** mis à jour
- [ ] **Release notes** préparées
- [ ] **Métriques** collectées
- [ ] **Screenshots** validés

---

## 📊 **Métriques Phase 2**

### Performance Cibles Staging
- **API Response Time**: <3s (vs <1s local)
- **Page Load Time**: <5s
- **Concurrent Users**: 5 simultanés
- **Memory Usage**: <2GB total
- **Error Rate**: <1%

### Métriques Collectées
```bash
# Temps déploiement
time docker -H tcp://192.168.1.217:2375 compose -f docker-compose.staging.yml up -d

# Temps startup (via nginx reverse proxy)
time curl --retry 30 --retry-delay 1 http://192.168.1.217/health

# Performance API (nouvelle API Ansible)
curl -w "@curl-format.txt" http://192.168.1.217/api/ansible/versions

# Mémoire containers
docker --host=tcp://192.168.1.217:2375 stats --no-stream
```

---

## 📝 **Livrables Phase 2**

### Artefacts Techniques
- **Images Docker RC** validées
- **Config staging** finalisée
- **Scripts tests E2E** fonctionnels

### Rapports de Tests
> **Voir [TESTING_STRATEGY.md](TESTING_STRATEGY.md)** pour les templates de rapports et scripts E2E complets.

- **Rapport E2E** avec résultats détaillés
- **Rapport performance** staging
- **Validation utilisateur** signée
- **Métriques** comparatives

**Template Rapport Phase 2:**
```markdown
## Rapport Tests Phase 2 - Version X.Y.Z.a
**Date:** YYYY-MM-DD
**URL Staging:** http://192.168.1.217

### Santé Services
- Nginx: OK / FAIL
- Frontend: OK / FAIL
- Backend: OK / FAIL

### Tests Fonctionnels
- Namespaces: X namespaces
- Collections: X collections
- Modules: X modules
- Schema: OK / FAIL
- Error 404: OK / FAIL

### Performance
- Temps réponse API: Xs (cible <3s)

### Conclusion: PASSE / ECHEC
```

### Documentation
- **Release notes** version RC
- **Guide déploiement** staging
- **Procédures rollback** si nécessaire

---

## 🚨 **Points d'Attention Phase 2**

### ⚠️ **Arrêts Obligatoires**
- **E2E tests échouent** : Même 1 test critique
- **Performance dégradée** : >50% des cibles
- **Services instables** : Redémarrages fréquents
- **Utilisateur rejette** : Problèmes fonctionnels majeurs

### 🔍 **Validations Critiques**
- **Version RC cohérente** : Frontend ET backend
- **Base de données** : Migration/données test OK
- **Intégrations externes** : Galaxy API stable
- **Monitoring** : Métriques collectées

---

## 🔄 **Transition vers Phase 3**

### ⚠️ **IMPORTANT - Validation Utilisateur Obligatoire**

**Claude doit TOUJOURS :**
1. 🔍 **Relire PHASE2_INTEGRATION.md** au début Phase 2
2. ✅ **Compléter checklist** Phase 2 à 100%
3. 🙋 **Demander validation explicite** à l'utilisateur
4. ⏳ **Attendre réponse "go"** avant continuer
5. 🚫 **NE JAMAIS** démarrer Phase 3 automatiquement

### Message de Validation
```markdown
🎯 **Phase 2 Complète - Validation Requise**

**Checklist Phase 2 :** [X/X] ✅
**E2E tests :** [X/X] passés ✅
**Performance :** Conforme aux cibles ✅
**RC déployée :** X.Y.Z.a ✅
**Demo utilisateur :** Réalisée et approuvée ✅

**Êtes-vous prêt pour le passage en Phase 3 (Production) ?**
- ✅ **OUI** - Démarrer déploiement production
- ❌ **NON** - Rester en Phase 2 / Corrections

⚠️ **ATTENTION :** Phase 3 = Déploiement production réel

Merci de confirmer avant que je continue.
```

### Préparation Phase 3 (après validation)
```bash
# Tag RC validée
git tag X.Y.Z.a

# Commit intégration
git commit -m "feat: [description] - Phase 2 complete

- RC X.Y.Z.a validated on staging
- E2E tests: passed
- Performance: within targets  
- User validation: approved
- Ready for production

🤖 Generated with Claude Code
"

# Phase 3 autorisée par utilisateur
echo "RC X.Y.Z.a ready for Phase 3 - USER APPROVED"
```

---

*Document maintenu à jour. Dernière mise à jour : 2025-12-25*

*Voir aussi :*
- [Phase 1 Développement](PHASE1_DEVELOPMENT.md)
- [Phase 3 Production](PHASE3_PRODUCTION.md)
- [Stratégie de Tests](TESTING_STRATEGY.md)
- [Process Développement](../core/DEVELOPMENT_PROCESS.md)