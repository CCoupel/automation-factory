# Strategie de Tests - Automation Factory

Ce document centralise tous les tests a executer pour valider une release. Les tests sont groupes par categorie et lies aux phases de deploiement.

---

## Vue d'Ensemble

| Phase | Tests Frontend | Tests Backend | Tests E2E |
|-------|----------------|---------------|-----------|
| Phase 1 (Dev) | Lint, Build, TypeScript | pytest, flake8 | API locale |
| Phase 2 (Staging) | Validation images | Validation images | E2E complets |
| Phase 3 (Prod) | - | - | Smoke tests |

---

## 1. Tests Frontend

### 1.1 ESLint - Qualite Code

**Commande:**
```bash
cd frontend
npm run lint
```

**Criteres de succes:**
- 0 erreurs
- Warnings acceptables (documentes)

**Quand executer:** Phase 1 (avant chaque commit)

### 1.2 TypeScript - Verification Types

**Commande:**
```bash
cd frontend
npx tsc --noEmit
```

**Criteres de succes:**
- 0 erreurs de compilation
- Tous les types resolus correctement

**Quand executer:** Phase 1 (avant chaque build)

### 1.3 Build Production

**Commande:**
```bash
cd frontend
npm run build
```

**Criteres de succes:**
- Build reussit sans erreurs
- Bundle genere dans `dist/`
- Taille bundle raisonnable (<5MB)

**Quand executer:** Phase 1 et Phase 2

### 1.4 Tests Composants (Futur)

**Status:** A implementer

**Tests prevus:**
- [ ] ModulesTreeView - Navigation et recherche
- [ ] PlaybookCanvas - Drag & Drop modules
- [ ] ConfigZone - Edition parametres
- [ ] Collaboration - WebSocket sync

---

## 2. Tests Backend

### 2.1 pytest - Tests Unitaires

**Commande:**
```bash
cd backend
python -m pytest tests/ -v --cov=app
```

**Fichiers de tests actuels:**
| Fichier | Description | Status |
|---------|-------------|--------|
| `tests/test_ansible_endpoints.py` | Endpoints API Ansible | Actif |
| `tests/test_ansible_versions_service.py` | Service versions | Actif |
| `tests/test_ansible_collections_service.py` | Service collections | Actif (mocking issues) |

**Criteres de succes:**
- Minimum 80% de tests passent
- Coverage >70%
- Aucune regression sur tests critiques

**Quand executer:** Phase 1 (avant chaque commit)

### 2.2 flake8 - Linting Python

**Commande:**
```bash
cd backend
python -m flake8 app/ --max-line-length=120
```

**Criteres de succes:**
- 0 erreurs
- Style PEP8 respecte

**Quand executer:** Phase 1

### 2.3 Tests API Locaux

**Script:**
```bash
#!/bin/bash
# test-api-local.sh
BASE_URL="http://localhost:8000"

echo "=== Tests API Backend Local ==="

# Health check
echo -n "1. Health check... "
curl -sf $BASE_URL/api/health > /dev/null && echo "OK" || echo "FAIL"

# Version
echo -n "2. Version API... "
VERSION=$(curl -s $BASE_URL/api/version | grep -o '"version":"[^"]*"')
echo $VERSION

# Auth status
echo -n "3. Auth status... "
curl -sf $BASE_URL/api/auth/status > /dev/null && echo "OK" || echo "FAIL"

# Ansible namespaces
echo -n "4. Ansible namespaces... "
COUNT=$(curl -s $BASE_URL/api/ansible/13/namespaces | grep -o '"name"' | wc -l)
echo "Found $COUNT namespaces"

# Module schema
echo -n "5. Module schema... "
curl -sf "$BASE_URL/api/ansible/13/namespaces/ansible/collections/builtin/modules/copy/schema" > /dev/null && echo "OK" || echo "FAIL"
```

**Quand executer:** Phase 1 (apres demarrage services)

---

## 3. Tests End-to-End (E2E)

### 3.1 Tests Sante Services (Phase 2)

**Script:**
```bash
#!/bin/bash
# e2e-health.sh
BASE_URL="http://192.168.1.217"

echo "=== E2E Health Checks ==="

# Nginx reverse proxy
echo -n "1. Nginx health... "
curl -sf $BASE_URL/health > /dev/null && echo "OK" || echo "FAIL"

# Frontend accessible
echo -n "2. Frontend... "
curl -sf $BASE_URL/ > /dev/null && echo "OK" || echo "FAIL"

# Backend API
echo -n "3. Backend API... "
curl -sf $BASE_URL/api/version > /dev/null && echo "OK" || echo "FAIL"

# WebSocket endpoint
echo -n "4. WebSocket route... "
curl -sf -I $BASE_URL/ws/ 2>/dev/null | head -1
```

### 3.2 Tests Fonctionnels (Phase 2)

**Script:**
```bash
#!/bin/bash
# e2e-functional.sh
BASE_URL="http://192.168.1.217"
EXIT_CODE=0

echo "=== E2E Functional Tests ==="

# Test 1: Ansible versions
echo -n "1. Ansible versions API... "
VERSIONS=$(curl -s $BASE_URL/api/ansible/versions | grep -o '"versions":\[' | wc -l)
if [[ $VERSIONS -gt 0 ]]; then
    echo "OK"
else
    echo "FAIL"
    EXIT_CODE=1
fi

# Test 2: Namespaces pour Ansible 13
echo -n "2. Namespaces (Ansible 13)... "
NS_COUNT=$(curl -s $BASE_URL/api/ansible/13/namespaces | grep -o '"name"' | wc -l)
if [[ $NS_COUNT -gt 50 ]]; then
    echo "OK ($NS_COUNT namespaces)"
else
    echo "FAIL (only $NS_COUNT namespaces)"
    EXIT_CODE=1
fi

# Test 3: Collections pour namespace ansible
echo -n "3. Collections ansible... "
COLL=$(curl -s $BASE_URL/api/ansible/13/namespaces/ansible/collections | grep -o '"name"' | wc -l)
if [[ $COLL -gt 0 ]]; then
    echo "OK ($COLL collections)"
else
    echo "FAIL"
    EXIT_CODE=1
fi

# Test 4: Modules pour ansible.builtin
echo -n "4. Modules ansible.builtin... "
MODS=$(curl -s $BASE_URL/api/ansible/13/namespaces/ansible/collections/builtin/modules | grep -o '"name"' | wc -l)
if [[ $MODS -gt 50 ]]; then
    echo "OK ($MODS modules)"
else
    echo "FAIL (only $MODS modules)"
    EXIT_CODE=1
fi

# Test 5: Schema module copy
echo -n "5. Schema module copy... "
SCHEMA=$(curl -s "$BASE_URL/api/ansible/13/namespaces/ansible/collections/builtin/modules/copy/schema")
if echo $SCHEMA | grep -q '"parameters"'; then
    echo "OK"
else
    echo "FAIL"
    EXIT_CODE=1
fi

# Test 6: Gestion erreur 404
echo -n "6. Error handling (404)... "
HTTP_CODE=$(curl -s -w "%{http_code}" "$BASE_URL/api/ansible/13/namespaces/fake/collections/test/modules/none/schema" -o /dev/null)
if [[ $HTTP_CODE == "404" ]]; then
    echo "OK"
else
    echo "FAIL (got $HTTP_CODE)"
    EXIT_CODE=1
fi

exit $EXIT_CODE
```

### 3.3 Tests Performance (Phase 2)

**Script:**
```bash
#!/bin/bash
# e2e-performance.sh
BASE_URL="http://192.168.1.217"

echo "=== E2E Performance Tests ==="

# Test temps de reponse API
echo "1. Response times:"
for endpoint in "/api/version" "/api/ansible/versions" "/api/ansible/13/namespaces"; do
    TIME=$(curl -w "%{time_total}" -s "$BASE_URL$endpoint" -o /dev/null)
    echo "   $endpoint: ${TIME}s"
done

# Test charge (10 requetes)
echo ""
echo "2. Load test (10 requests):"
TOTAL=0
for i in {1..10}; do
    TIME=$(curl -w "%{time_total}" -s "$BASE_URL/api/ansible/13/namespaces" -o /dev/null)
    echo "   Request $i: ${TIME}s"
done

# Test concurrent
echo ""
echo "3. Concurrent test (5 parallel):"
for i in {1..5}; do
    curl -s "$BASE_URL/api/ansible/13/namespaces" > /dev/null &
done
wait
echo "   All 5 concurrent requests completed"

echo ""
echo "=== Performance Tests Complete ==="
```

**Criteres de succes:**
- Temps reponse API < 3s
- Pas d'erreurs sous charge
- Requetes concurrentes supportees

### 3.4 Smoke Tests Production (Phase 3)

**Script:**
```bash
#!/bin/bash
# smoke-tests-prod.sh
BASE_URL="https://coupel.net/automation-factory"

echo "=== Smoke Tests Production ==="

# Test 1: Accessibilite
echo -n "1. Site accessible... "
HTTP_CODE=$(curl -s -w "%{http_code}" "$BASE_URL/" -o /dev/null)
if [[ $HTTP_CODE == "200" ]]; then
    echo "OK"
else
    echo "FAIL ($HTTP_CODE)"
    exit 1
fi

# Test 2: Version API
echo -n "2. Version API... "
VERSION=$(curl -s "$BASE_URL/api/version")
echo $VERSION | grep -o '"version":"[^"]*"'

# Test 3: environment = PROD
echo -n "3. Environment... "
if echo $VERSION | grep -q '"environment":"PROD"'; then
    echo "PROD OK"
elif echo $VERSION | grep -q '"is_rc":false'; then
    echo "OK (is_rc: false)"
else
    echo "WARNING - Check environment"
fi

# Test 4: Fonctionnalite basique
echo -n "4. Ansible API... "
curl -sf "$BASE_URL/api/ansible/versions" > /dev/null && echo "OK" || echo "FAIL"

# Test 5: Temps de reponse
echo -n "5. Response time... "
TIME=$(curl -w "%{time_total}" -s "$BASE_URL/" -o /dev/null)
echo "${TIME}s"

echo ""
echo "=== Smoke Tests Complete ==="
```

---

## 4. Rapport de Tests

### Template Rapport Phase 1
```markdown
## Rapport Tests Phase 1 - Version X.Y.Z_n

**Date:** YYYY-MM-DD
**Executeur:** Claude Code

### Frontend
- [ ] ESLint: X erreurs / X warnings
- [ ] TypeScript: X erreurs
- [ ] Build: OK / FAIL

### Backend
- [ ] pytest: X/X tests passes (X% coverage)
- [ ] flake8: X erreurs

### API Locale
- [ ] Health: OK
- [ ] Version: OK (X.Y.Z_n)
- [ ] Ansible namespaces: X namespaces
- [ ] Module schema: OK

### Conclusion
- [ ] PASSE - Pret pour Phase 2
- [ ] ECHEC - Corrections requises
```

### Template Rapport Phase 2
```markdown
## Rapport Tests Phase 2 - Version X.Y.Z-rc.n

**Date:** YYYY-MM-DD
**Executeur:** Claude Code
**URL Staging:** http://192.168.1.217

### Sante Services
- [ ] Nginx: OK
- [ ] Frontend: OK
- [ ] Backend: OK
- [ ] WebSocket: OK

### Tests Fonctionnels
- [ ] Ansible versions: X versions
- [ ] Namespaces: X namespaces
- [ ] Collections: X collections
- [ ] Modules: X modules
- [ ] Schema: OK
- [ ] Error 404: OK

### Performance
- [ ] Temps reponse API: Xs (cible <3s)
- [ ] Load test: OK
- [ ] Concurrent: OK

### Conclusion
- [ ] PASSE - Pret pour Phase 3
- [ ] ECHEC - Corrections requises
```

### Template Rapport Phase 3
```markdown
## Rapport Smoke Tests Production - Version X.Y.Z

**Date:** YYYY-MM-DD
**Executeur:** Claude Code
**URL Production:** https://coupel.net/automation-factory

### Smoke Tests
- [ ] Site accessible: HTTP 200
- [ ] Version API: X.Y.Z
- [ ] Environment: PROD
- [ ] Ansible API: OK
- [ ] Temps reponse: Xs

### Conclusion
- [ ] DEPLOIEMENT REUSSI
- [ ] ROLLBACK REQUIS
```

---

## 5. Maintenance et Evolution

### Tests a Ajouter
1. **Frontend:** Tests composants avec Jest/Vitest
2. **Backend:** Tests integration Galaxy API
3. **E2E:** Tests Playwright/Cypress
4. **Security:** Tests OWASP

### Automatisation
- Integration GitHub Actions pour CI/CD
- Tests automatiques sur PR
- Rapports de coverage

---

*Document maintenu a jour. Derniere mise a jour : 2025-12-25*

*Voir aussi :*
- [Phase 1 Developpement](PHASE1_DEVELOPMENT.md)
- [Phase 2 Integration](PHASE2_INTEGRATION.md)
- [Phase 3 Production](PHASE3_PRODUCTION.md)
