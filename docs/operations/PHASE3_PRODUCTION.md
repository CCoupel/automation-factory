# Phase 3 : Production - Ansible Builder

Ce document détaille les procédures spécifiques à la **Phase 3 : Production** du processus en 3 phases.

---

## 🎯 **Objectifs Phase 3**

### Scope de la Phase
- **Déploiement production** sans risque depuis RC validée
- **Monitoring intensif** post-déploiement
- **Smoke tests** et validation rapide
- **Finalisation documentation** et communication

### Critères d'Entrée
- ✅ **Phase 2 complète** avec RC validée
- ✅ **Tests E2E** passent 100%
- ✅ **Performance staging** conforme
- ✅ **Validation utilisateur** approuvée
- ✅ **Plan rollback** défini

### Critères de Sortie
- ✅ **Version production** X.Y.Z déployée
- ✅ **Smoke tests** passent
- ✅ **Métriques stables** 30 minutes
- ✅ **Documentation finale** publiée
- ✅ **Communication** utilisateurs effectuée

---

## 🛠️ **Environnement Production**

### Infrastructure
```yaml
Plateforme: Kubernetes
Namespace: ansible-builder-prod
Registry: ghcr.io/ccoupel
URL: https://coupel.net/ansible-builder
Database: PostgreSQL production
Cache: Redis cluster
```

### Services
```bash
Frontend: https://coupel.net/ansible-builder
Backend API: https://coupel.net/ansible-builder/api
Documentation: https://coupel.net/ansible-builder/docs
```

---

## 📋 **Procédures Phase 3**

### 0. ⚠️ **OBLIGATOIRE : Préparation**

#### A. Relire Procédure
**Claude doit TOUJOURS :**
1. 🔍 **Relire PHASE3_PRODUCTION.md COMPLÈTEMENT** avant débuter
2. ✅ **Comprendre toutes les étapes** critiques
3. ⚠️ **Identifier points de risque** et rollback
4. 📋 **Suivre checklist** sans exception

#### B. Mettre à jour CURRENT_WORK.md
```markdown
# Mettre à jour dans docs/work/CURRENT_WORK.md

## 🚀 **Version X.Y.Z - Phase 3 Production**

**Status :** 🔄 Déploiement production en cours

### Fonctionnalités à déployer
- [Feature 1] Description
- [Feature 2] Description

### Environnement cible
- **URL :** https://coupel.net/ansible-builder
- **Version :** X.Y.Z
```

### 1. Préparation Production

#### Versioning Final
```bash
# Conversion RC → Version finale
# X.Y.Z-rc.n → X.Y.Z

# Backend
echo '__version__ = "X.Y.Z"' > backend/app/version.py

# Frontend
# Modifier "version": "X.Y.Z" dans package.json
```

#### Build Images Production
```bash
# Build depuis code RC validé (même commit)
docker build -t ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z \
  -f backend/Dockerfile backend/

docker build -t ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z \
  -f frontend/Dockerfile frontend/

# Tag latest
docker tag ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z \
  ghcr.io/ccoupel/ansible-builder-backend:latest

docker tag ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z \
  ghcr.io/ccoupel/ansible-builder-frontend:latest
```

#### Push Registry Production
```bash
# Push versions production
docker push ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z
docker push ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z
docker push ghcr.io/ccoupel/ansible-builder-backend:latest
docker push ghcr.io/ccoupel/ansible-builder-frontend:latest
```

### 2. Backup et Sécurité

#### Backup État Actuel
```bash
# Backup base de données
kubectl exec -n ansible-builder-prod postgres-pod -- \
  pg_dump -U ansible_user ansible_db > backup-pre-X.Y.Z.sql

# Backup configuration
kubectl get configmap -n ansible-builder-prod -o yaml > backup-config-X.Y.Z.yaml

# Tag version précédente
git tag previous-production
```

#### Plan Rollback
```bash
# Préparation commandes rollback
echo "# Rollback commands for X.Y.Z" > rollback-X.Y.Z.sh
echo "helm rollback ansible-builder --namespace ansible-builder-prod" >> rollback-X.Y.Z.sh
echo "kubectl apply -f backup-config-X.Y.Z.yaml" >> rollback-X.Y.Z.sh
chmod +x rollback-X.Y.Z.sh
```

### 3. Déploiement Production

#### Mise à jour Helm Values
```yaml
# custom-values-prod.yaml
image:
  backend:
    repository: ghcr.io/ccoupel/ansible-builder-backend
    tag: X.Y.Z
  frontend:
    repository: ghcr.io/ccoupel/ansible-builder-frontend  
    tag: X.Y.Z

replicas:
  backend: 2
  frontend: 2

resources:
  limits:
    memory: 1Gi
    cpu: 500m
```

#### Déploiement Helm Atomic
```bash
# Déploiement avec rollback automatique si échec
helm upgrade ansible-builder ./helm-chart \
  --namespace ansible-builder-prod \
  --values custom-values-prod.yaml \
  --atomic \
  --timeout 300s

# Vérification statut
kubectl get pods -n ansible-builder-prod
kubectl get services -n ansible-builder-prod
```

#### Vérification Déploiement
```bash
# Attente stabilisation
kubectl wait --for=condition=available --timeout=300s \
  deployment/ansible-builder-backend -n ansible-builder-prod

kubectl wait --for=condition=available --timeout=300s \
  deployment/ansible-builder-frontend -n ansible-builder-prod

# Vérification logs
kubectl logs -l app=ansible-builder-backend -n ansible-builder-prod --tail=20
kubectl logs -l app=ansible-builder-frontend -n ansible-builder-prod --tail=20
```

### 4. Tests Production (Smoke Tests)

#### Tests Automatisés Production
```bash
#!/bin/bash
# smoke-tests-prod.sh

echo "=== Smoke Tests Production ==="
BASE_URL="https://coupel.net/ansible-builder"
API_URL="$BASE_URL/api"
EXIT_CODE=0

# Test 1: Service Accessibility
echo "🔍 Testing service accessibility..."
if ! curl -s -f $BASE_URL > /dev/null; then
    echo "❌ Frontend not accessible"
    EXIT_CODE=1
else
    echo "✅ Frontend accessible"
fi

if ! curl -s -f $API_URL/health > /dev/null; then
    echo "❌ Backend health check failed"
    EXIT_CODE=1
else
    echo "✅ Backend health OK"
fi

# Test 2: Version Verification
echo "🔍 Verifying production version..."
PROD_VERSION=$(curl -s $API_URL/version | jq -r .version)
if [[ $PROD_VERSION == "X.Y.Z" ]]; then
    echo "✅ Production version: $PROD_VERSION"
else
    echo "❌ Wrong version: $PROD_VERSION"
    EXIT_CODE=1
fi

# Test 3: Core Functionality
echo "🔍 Testing core functionality..."
NAMESPACES=$(curl -s $API_URL/galaxy/namespaces | jq '. | length')
if [[ $NAMESPACES -gt 0 ]]; then
    echo "✅ Galaxy API functional: $NAMESPACES namespaces"
else
    echo "❌ Galaxy API failure"
    EXIT_CODE=1
fi

# Test 4: Authentication (if applicable)
echo "🔍 Testing authentication..."
AUTH_STATUS=$(curl -s $API_URL/auth/status | jq -r .status)
if [[ $AUTH_STATUS ]]; then
    echo "✅ Authentication service responsive"
else
    echo "❌ Authentication service issue"
    EXIT_CODE=1
fi

# Test 5: Database Connectivity
echo "🔍 Testing database connectivity..."
# Indirect test via API that requires DB
if curl -s $API_URL/playbooks | grep -q "playbooks"; then
    echo "✅ Database connectivity OK"
else
    echo "❌ Database connectivity issue"
    EXIT_CODE=1
fi

echo "=== Smoke Tests Complete ==="
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "🎉 All smoke tests PASSED"
else
    echo "💥 Smoke tests FAILED - consider rollback"
fi

exit $EXIT_CODE
```

#### Tests Performance Production
```bash
#!/bin/bash
# performance-prod.sh

echo "=== Performance Tests Production ==="

# Test response times
ENDPOINTS=(
    "https://coupel.net/ansible-builder"
    "https://coupel.net/ansible-builder/api/health"
    "https://coupel.net/ansible-builder/api/version"
    "https://coupel.net/ansible-builder/api/galaxy/namespaces"
)

for endpoint in "${ENDPOINTS[@]}"; do
    TIME=$(curl -w "%{time_total}" -s $endpoint -o /dev/null)
    echo "⏱️  $endpoint: ${TIME}s"
    
    # Alert if >5s
    if [[ $(echo "$TIME > 5.0" | bc) -eq 1 ]]; then
        echo "⚠️  WARNING: Slow response on $endpoint"
    fi
done

echo "✅ Performance tests complete"
```

### 5. Monitoring Post-Déploiement

#### Surveillance 30 Minutes
```bash
#!/bin/bash
# monitoring-prod.sh

echo "=== Post-Deployment Monitoring ==="
START_TIME=$(date +%s)
END_TIME=$((START_TIME + 1800))  # 30 minutes

while [[ $(date +%s) -lt $END_TIME ]]; do
    CURRENT_TIME=$(date)
    echo "[$CURRENT_TIME] Monitoring check..."
    
    # Check pod status
    NOT_READY=$(kubectl get pods -n ansible-builder-prod | grep -v Running | grep -v Completed | wc -l)
    if [[ $NOT_READY -gt 1 ]]; then  # 1 line for header
        echo "❌ Pods not ready: $NOT_READY"
    fi
    
    # Check error logs
    ERRORS=$(kubectl logs -l app=ansible-builder-backend -n ansible-builder-prod --since=2m | grep -i error | wc -l)
    if [[ $ERRORS -gt 0 ]]; then
        echo "⚠️  Backend errors in last 2min: $ERRORS"
    fi
    
    # Check response time
    RESPONSE_TIME=$(curl -w "%{time_total}" -s https://coupel.net/ansible-builder/api/health -o /dev/null)
    if [[ $(echo "$RESPONSE_TIME > 10.0" | bc) -eq 1 ]]; then
        echo "⚠️  Slow response: ${RESPONSE_TIME}s"
    fi
    
    sleep 120  # Check every 2 minutes
done

echo "✅ 30-minute monitoring complete"
```

### 6. Finalisation (OBLIGATOIRE)

#### A. Transfert vers DONE.md
```markdown
# Ajouter dans docs/work/DONE.md

## ✅ **Version X.Y.Z** - *YYYY-MM-DD*

### 🎯 [Nom de la fonctionnalité principale]

- **[Feature 1]** : Description détaillée
  - Points techniques importants
  - Impact utilisateur

- **[Feature 2]** : Description détaillée
  - Améliorations apportées

### 📊 Métriques
- **Temps déploiement** : Xm
- **Smoke tests** : ✅ Passés
- **Performance** : Conforme aux SLOs
```

#### B. Nettoyage CURRENT_WORK.md
```markdown
# Mettre à jour docs/work/CURRENT_WORK.md

## 🚀 **Status Actuel - YYYY-MM-DD**

### Versions Déployées
**Production (Kubernetes) :**
- **Backend :** `X.Y.Z` ✅
- **Frontend :** `X.Y.Z` ✅
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `vX.Y.Z`

## 📋 **Prochaines Priorités**
*En attente de nouvelles demandes utilisateur*
```

#### C. Commit et Tag
```bash
# Commit documentation
git add docs/work/CURRENT_WORK.md docs/work/DONE.md
git commit -m "docs: Finalize v X.Y.Z - transfer to DONE.md"
git push

# Tag version production
git tag vX.Y.Z
git push origin vX.Y.Z
```

#### Communication
```markdown
# Template Email/Slack

🚀 **Ansible Builder v X.Y.Z Deployed**

**Nouvelles fonctionnalités:**
- Module parameter collection from Galaxy API
- Dynamic schema-based configuration interface
- Enhanced error handling (404 vs 500)

**Améliorations:**
- Help icons with tooltips for better UX
- Performance optimization for module schemas
- Robust handling of Galaxy API edge cases

**URLs:**
- Production: https://coupel.net/ansible-builder
- Documentation: [Link to docs]

**Support:** [Contact info]
```

#### Tags et Release
```bash
# Tag version production
git tag v X.Y.Z
git push origin v X.Y.Z

# GitHub Release (si applicable)
gh release create v X.Y.Z --title "Ansible Builder v X.Y.Z" --notes-file RELEASE_NOTES.md
```

---

## ✅ **Checklist Validation Phase 3**

### Pré-Déploiement
- [ ] **Images production** buildées et pushées
- [ ] **Backup** état actuel effectué
- [ ] **Plan rollback** testé et disponible
- [ ] **Helm values** mis à jour

### Déploiement
- [ ] **Helm upgrade** réussi (atomic)
- [ ] **Pods** démarrent correctement
- [ ] **Services** exposés et accessibles
- [ ] **Version production** confirmée

### Post-Déploiement
- [ ] **Smoke tests** passent 100%
- [ ] **Performance** conforme (<5s)
- [ ] **Monitoring** 30min sans erreur critique
- [ ] **Logs** propres

### Finalisation
- [ ] **CHANGELOG** mis à jour
- [ ] **DONE.md** enrichi
- [ ] **CURRENT_WORK** nettoyé
- [ ] **Communication** envoyée

---

## 🚨 **Gestion des Incidents**

### Critères de Rollback
- **Service inaccessible** >5 minutes
- **Erreurs critiques** dans logs
- **Performance dégradée** >50%
- **Smoke tests échouent**

### Procédure Rollback
```bash
# Rollback automatique
./rollback-X.Y.Z.sh

# Ou manuel
helm rollback ansible-builder --namespace ansible-builder-prod

# Vérification rollback
kubectl get pods -n ansible-builder-prod
./smoke-tests-prod.sh
```

### Communication Incident
```markdown
🚨 **Incident Ansible Builder**

**Statut**: Rollback en cours
**Impact**: [Description]
**ETA résolution**: [Estimation]
**Actions**: [Actions en cours]

Suivi: [Link to status page]
```

---

## 📊 **Métriques Production**

### SLI/SLO
- **Availability**: 99.9% (8.76h downtime/year)
- **Response Time**: <2s (95th percentile)
- **Error Rate**: <0.1%
- **Throughput**: 100 requests/minute

### Monitoring
```bash
# Dashboard URLs
kubectl port-forward -n monitoring grafana-pod:3000:3000
# Grafana: http://localhost:3000

# Métriques clés
- ansible_builder_requests_total
- ansible_builder_response_time_seconds
- ansible_builder_errors_total
- ansible_builder_pods_ready
```

---

*Document maintenu à jour. Dernière mise à jour : 2025-12-14*

*Voir aussi :*
- [Phase 1 Développement](PHASE1_DEVELOPMENT.md)
- [Phase 2 Intégration](PHASE2_INTEGRATION.md)
- [Process Développement](../core/DEVELOPMENT_PROCESS.md)