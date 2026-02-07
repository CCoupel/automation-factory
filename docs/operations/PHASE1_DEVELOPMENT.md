# Phase 1 : Développement - Automation Factory

Ce document détaille les procédures spécifiques à la **Phase 1 : Développement** du processus en 3 phases.

---

## 🎯 **Objectifs Phase 1**

### Scope de la Phase
- **Développement et test en local natif** (pas Docker)
- **Validation technique rigoureuse** de l'implémentation
- **Tests unitaires et linting obligatoires**
- **Utilisation version `X.Y.Z_n`** avec suffixe de build

### Critères d'Entrée
- **Nouvelle demande utilisateur** reçue et analysée
- **Classification confirmée** (feature vs bugfix)  
- **Plan de développement** établi avec impacts et risques
- **WORK_IN_PROGRESS.md mis à jour** avec nouvelle tâche

### Critères de Sortie
- ✅ **Exécution locale fonctionnelle** (backend:8000, frontend:5173)
- ✅ **Versions confirmées** via /version et /api/version
- ✅ **Tests unitaires passent** (100% backend minimum)
- ✅ **Linting conforme** (0 erreurs)
- ✅ **API tests non-régression** validés
- ✅ **Nouvelles API** testées et fonctionnelles

---

## 🛠️ **Environnement de Développement**

### Infrastructure Locale
```bash
# Backend Python natif
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend Node natif  
cd frontend
npm install
npm run dev  # Port 5173
```

### URLs de Test
```bash
Frontend: http://localhost:5173
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

---

## 📋 **Procédures Phase 1**

### 1. Initialisation Documentation

#### Mise à jour CURRENT_WORK.md
```markdown
# Ajouter nouvelle section work in progress
## 🚧 **Version X.Y.Z_n** - *En cours*

### Nouvelle Fonctionnalité
- **Type**: Feature/Bugfix  
- **Description**: [Description détaillée]
- **Impact**: [Estimation impact]
- **Risques**: [Risques identifiés]
- **Tests prévus**: [Plan de test]
```

#### Mise à jour des versions
```bash
# Backend
echo '__version__ = "X.Y.Z_n"' > backend/app/version.py

# Frontend
# Modifier "version": "X.Y.Z_n" dans package.json
```

### 2. Développement

#### Implémentation
- **Code source** avec tests unitaires intégrés
- **Documentation code** (docstrings)
- **Gestion d'erreurs** appropriée

#### Tests Unitaires OBLIGATOIRES
```bash
# Backend
cd backend
python -m pytest tests/ -v --cov=app

# Minimum requis:
# - Nouveaux endpoints testés
# - Cas d'erreur couverts  
# - Coverage > 80%
```

#### Linting OBLIGATOIRE
```bash
# Backend
python -m flake8 app/ --max-line-length=120

# Frontend
npm run lint

# Critère: 0 erreurs acceptées
```

### 3. Exécution Locale Native

#### Lancement Services
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

#### Validation Démarrage
- ✅ Backend démarre sans erreur
- ✅ Frontend démarre sans erreur
- ✅ Hot reload fonctionnel
- ✅ Pas d'erreurs console

### 4. Validation Versions

#### Vérification Versions Affichées
```bash
# Frontend - Page d'accueil
curl -s http://localhost:5173 | grep -o "X.Y.Z_n"

# Backend - API Version
curl -s http://localhost:8000/api/version
# Attendu: {"version":"X.Y.Z_n","name":"Automation Factory API"}
```

#### Screenshots Traçabilité
- Capture écran page d'accueil avec version
- Capture écran API /version
- Sauvegarde dans docs/work/screenshots/

### 5. Tests API Non-Régression

#### Script Test Automatisé
```bash
#!/bin/bash
# test-api-regression.sh

echo "=== Test API Non-Régression ==="
BASE_URL="http://localhost:8000"
EXIT_CODE=0

# Test Health
echo -n "Testing /api/health... "
if curl -s $BASE_URL/api/health | grep -q "ok"; then
    echo "✅ OK"
else
    echo "❌ FAIL"
    EXIT_CODE=1
fi

# Test Version
echo -n "Testing /api/version... "
VERSION=$(curl -s $BASE_URL/api/version | jq -r .version)
if [[ $VERSION == *"_"* ]]; then
    echo "✅ Version: $VERSION"
else
    echo "❌ FAIL - Wrong version format"
    EXIT_CODE=1
fi

# Test Auth Status
echo -n "Testing /api/auth/status... "
if curl -s $BASE_URL/api/auth/status | grep -q "user"; then
    echo "✅ OK"
else
    echo "❌ FAIL"
    EXIT_CODE=1
fi

# Test Galaxy Namespaces
echo -n "Testing /api/galaxy/namespaces... "
COUNT=$(curl -s $BASE_URL/api/galaxy/namespaces | jq '. | length')
if [[ $COUNT -gt 0 ]]; then
    echo "✅ Found $COUNT namespaces"
else
    echo "❌ FAIL"
    EXIT_CODE=1
fi

# Test Playbooks
echo -n "Testing /api/playbooks... "
if curl -s $BASE_URL/api/playbooks | grep -q "playbooks"; then
    echo "✅ OK"
else
    echo "❌ FAIL"
    EXIT_CODE=1
fi

exit $EXIT_CODE
```

### 6. Tests Nouvelles API

#### Exemples pour Module Schemas
```bash
# Test module avec documentation
echo "Testing docker_container schema..."
curl -s "http://localhost:8000/api/galaxy/modules/community.docker.docker_container/schema" \
  | jq .parameters | head -5

# Test module sans documentation (erreur 404)
echo "Testing api_gateway schema..."
HTTP_CODE=$(curl -s -w "%{http_code}" "http://localhost:8000/api/galaxy/modules/community.aws.api_gateway/schema")
if [[ $HTTP_CODE == "404" ]]; then
    echo "✅ Correct 404 error"
else
    echo "❌ Wrong HTTP code: $HTTP_CODE"
fi

# Test performance
echo "Testing response time..."
TIME=$(curl -w "@curl-format.txt" -s "http://localhost:8000/api/galaxy/modules/community.docker.docker_container/schema" -o /dev/null)
echo "Response time: ${TIME}s (target: <2s)"
```

### 7. Build Validation

#### Frontend Build
```bash
cd frontend
npm run build

# Vérifications:
# - Build réussit sans erreurs
# - Warnings acceptables
# - Taille bundle raisonnable
```

#### TypeScript Check
```bash
npm run tsc --noEmit
# Aucune erreur TypeScript acceptée
```

---

## ✅ **Checklist Validation Phase 1**

### Tests Techniques OBLIGATOIRES
- [ ] **Backend démarre** : Port 8000 sans erreur
- [ ] **Frontend démarre** : Port 5173 sans erreur
- [ ] **Version frontend** : Page affiche X.Y.Z_n
- [ ] **Version backend** : API retourne X.Y.Z_n
- [ ] **Tests unitaires** : 100% passent (minimum backend)
- [ ] **Linting backend** : 0 erreurs flake8
- [ ] **Linting frontend** : 0 erreurs ESLint
- [ ] **Build frontend** : npm run build réussit

### Tests API OBLIGATOIRES
- [ ] **Non-régression** : Script tests-api-regression.sh passe
- [ ] **Health API** : /api/health OK
- [ ] **Auth API** : /api/auth/status OK
- [ ] **Galaxy API** : /api/galaxy/namespaces OK
- [ ] **Playbooks API** : /api/playbooks OK
- [ ] **Nouvelles API** : Tous les nouveaux endpoints testés

### Tests Fonctionnels
- [ ] **Hot reload** : Modifications code reflétées
- [ ] **Console clean** : Pas d'erreurs navigateur
- [ ] **Logs clean** : Pas d'erreurs backend
- [ ] **Performance** : Réponses <2s local

### Tests Chrome/Navigateur OBLIGATOIRES

> **Important** : Ces tests doivent être effectués manuellement dans Chrome avec les DevTools ouverts (F12) pour surveiller les erreurs console et réseau.

#### Prérequis
```bash
# Terminal 1 : Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 : Frontend
cd frontend && npm run dev
```

#### Tests Authentification
- [ ] **Login admin** : admin@example.com / admin123 → Succès
- [ ] **Login user** : Création compte utilisateur → Succès
- [ ] **Logout** : Déconnexion propre
- [ ] **Token refresh** : Session maintenue après refresh page

#### Tests Interface Principale
- [ ] **Page d'accueil** : Charge sans erreur
- [ ] **Version affichée** : Footer affiche X.Y.Z_n
- [ ] **Navigation** : Tous les menus fonctionnent
- [ ] **Responsive** : Interface adaptée mobile (DevTools toggle)

#### Tests Galaxy Sources (Admin)
- [ ] **Accès Configuration** : Icône ⚙️ → Dialog s'ouvre
- [ ] **Onglet Galaxy Sources** : Visible pour admin uniquement
- [ ] **Liste sources** : Galaxy Public créée par défaut au startup
- [ ] **Indicateurs visuels** : Icône Public/Private, status test, token chip
- [ ] **Add Source** :
  - [ ] Dialog s'ouvre avec champs vides
  - [ ] Validation nom requis
  - [ ] Validation URL requise
  - [ ] Token requis pour type Private
  - [ ] Test Connection avant sauvegarde
  - [ ] Création réussie → Liste mise à jour
- [ ] **Edit Source** :
  - [ ] Dialog pré-rempli (sauf token)
  - [ ] Modification nom/URL
  - [ ] Token placeholder "****" si existant
  - [ ] Sauvegarde réussie
- [ ] **Toggle Active** :
  - [ ] Switch activer/désactiver
  - [ ] Impossible désactiver dernière source active (erreur)
- [ ] **Test Connection** :
  - [ ] Spinner pendant test
  - [ ] Icône ✅ ou ❌ après test
  - [ ] Tooltip avec date dernier test
- [ ] **Delete Source** :
  - [ ] Confirmation dialog
  - [ ] Impossible supprimer source publique
  - [ ] Suppression source privée OK
- [ ] **Drag & Drop Reorder** :
  - [ ] Curseur grab sur hover
  - [ ] Réordonnancement visuel
  - [ ] Ordre persisté après refresh

#### Tests Playbooks (Fonctionnalités existantes)
- [ ] **Créer playbook** : Nouveau playbook vide
- [ ] **Drag & drop modules** : Ajouter modules depuis Galaxy
- [ ] **Édition variables** : Modifier variables fonctionne
- [ ] **Sauvegarde** : Playbook sauvegardé en DB
- [ ] **Export YAML** : Téléchargement fichier .yml

#### Tests Console DevTools
- [ ] **Aucune erreur JS** : Console propre (warnings OK)
- [ ] **Network requests** : Toutes requêtes 2xx/3xx
- [ ] **Pas de 401/403** : Authentification correcte
- [ ] **Pas de 500** : Pas d'erreur serveur

---

## 📊 **Livrables Phase 1**

### Code et Tests
- **Code source** avec modifications
- **Tests unitaires** pour nouveau code
- **Documentation** code mise à jour

### Rapports de Tests
> **Voir [TESTING_STRATEGY.md](TESTING_STRATEGY.md)** pour les templates de rapports et scripts de tests.

- **Rapport tests unitaires** (coverage + résultats)
- **Rapport tests API** (script + résultats)
- **Screenshots** versions confirmées
- **Métriques** performance locale

**Template Rapport Phase 1:**
```markdown
## Rapport Tests Phase 1 - Version X.Y.Z_n
**Date:** YYYY-MM-DD

### Frontend
- ESLint: X erreurs / X warnings
- TypeScript: X erreurs
- Build: OK / FAIL

### Backend
- pytest: X/X tests passés (X% coverage)
- flake8: X erreurs

### Conclusion: PASSE / ECHEC
```

### Validation
- **Checklist** complète signée
- **TodoWrite** avec toutes étapes complétées

---

## 🚨 **Points d'Attention Phase 1**

### ⚠️ **Arrêts Obligatoires**
- **Tests unitaires échouent** : Même 1 test en échec
- **Erreurs linting** : Aucune erreur acceptée
- **Services ne démarrent pas** : Problème de dépendances
- **Versions incorrectes** : Doivent afficher X.Y.Z_n
- **API régression** : Changement comportement existant

### 🔍 **Validations Critiques**
- **Exécution native** : Pas via Docker
- **Versions cohérentes** : Frontend ET backend
- **Performance locale** : <2s response time
- **Error handling** : Codes HTTP appropriés

---

## 🔄 **Transition vers Phase 2**

### ⚠️ **IMPORTANT - Validation Utilisateur Obligatoire**

**Claude doit TOUJOURS :**
1. ✅ **Compléter checklist** Phase 1 à 100%
2. 🙋 **Demander validation explicite** à l'utilisateur
3. ⏳ **Attendre réponse "go"** avant continuer
4. 🚫 **NE JAMAIS** démarrer Phase 2 automatiquement

### Message de Validation
```markdown
🎯 **Phase 1 Complète - Validation Requise**

**Checklist Phase 1 :** [X/X] ✅
**Tests unitaires :** [X/X] passés ✅  
**Linting :** 0 erreurs ✅
**Version validée :** X.Y.Z_n ✅
**API tests :** Non-régression + nouvelles API ✅

**Êtes-vous prêt pour le passage en Phase 2 (Intégration) ?**
- ✅ **OUI** - Démarrer Phase 2
- ❌ **NON** - Rester en Phase 1

Merci de confirmer avant que je continue.
```

### Préparation Phase 2 (après validation)
```bash
# Commit local
git add .
git commit -m "feat: [description] - Phase 1 complete

- Feature implemented and tested locally
- Unit tests: [X/X] passed
- API regression tests: passed
- Version X.Y.Z_n validated
- User validation: approved

🤖 Generated with Claude Code
"

# Phase 2 autorisée par utilisateur
```

---

*Document maintenu à jour. Dernière mise à jour : 2026-01-06*

*Voir aussi :*
- [Phase 2 Intégration](PHASE2_INTEGRATION.md)
- [Phase 3 Production](PHASE3_PRODUCTION.md)
- [Stratégie de Tests](TESTING_STRATEGY.md)
- [Process Développement](../core/DEVELOPMENT_PROCESS.md)