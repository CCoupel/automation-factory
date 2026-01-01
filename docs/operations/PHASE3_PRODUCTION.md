# Phase 3 : Production - Ansible Builder

Ce document détaille les procédures spécifiques à la **Phase 3 : Production** du processus en 3 phases.

---

## 🎯 **Objectifs Phase 3**

### Scope de la Phase
- **Déploiement production** des images validées en staging
- **Aucun rebuild** - Les images staging sont pushées vers ghcr.io
- **Monitoring intensif** post-déploiement
- **Smoke tests** et validation rapide
- **Finalisation documentation** et communication

### Principe Clé : Build Once Deploy Everywhere
```
⚠️ IMPORTANT : Les images de production sont IDENTIQUES aux images de staging
- Pas de rebuild en Phase 3
- Staging et Production utilisent le même Dockerfile (nginx pour frontend)
- Tag et push des images staging vers ghcr.io
- Variable ENVIRONMENT contrôle l'affichage de version (STAGING → PROD)
- Noms de services identiques : ansible-builder-backend, ansible-builder-frontend
```

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
- ✅ **Tag Git** créé

---

## 🛠️ **Environnement Production**

### Infrastructure
```yaml
Plateforme: Kubernetes
Namespace: ansible-builder
Registry: ghcr.io/ccoupel
URL: https://coupel.net/ansible-builder
```

### Variable ENVIRONMENT
```yaml
Staging:  ENVIRONMENT=STAGING  → Affiche "1.12.1-rc.1" (is_rc: true)
Production: ENVIRONMENT=PROD    → Affiche "1.12.1" (is_rc: false)
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

#### B. Vérifier Version Staging
```bash
# Vérifier la version en staging
curl -s http://192.168.1.217/api/version

# Doit retourner :
# {
#   "version": "X.Y.Z-rc.n",
#   "internal_version": "X.Y.Z-rc.n",
#   "environment": "STAGING",
#   "is_rc": true
# }
```

### 1. Tag et Push des Images Staging → Production

#### ⚠️ PAS DE REBUILD - Réutilisation des images staging

```bash
# Identifier les images staging validées
docker -H tcp://192.168.1.217:2375 images | grep ansible-builder

# Tag des images staging pour ghcr.io
# Format: ansible-builder-*:X.Y.Z-rc.n → ghcr.io/ccoupel/ansible-builder-*:X.Y.Z
# NOTE: Plus de suffix -vite, même image nginx pour staging et production
docker -H tcp://192.168.1.217:2375 tag \
  ansible-builder-backend:X.Y.Z-rc.n \
  ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z

docker -H tcp://192.168.1.217:2375 tag \
  ansible-builder-frontend:X.Y.Z-rc.n \
  ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z

# Tag latest
docker -H tcp://192.168.1.217:2375 tag \
  ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z \
  ghcr.io/ccoupel/ansible-builder-backend:latest

docker -H tcp://192.168.1.217:2375 tag \
  ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z \
  ghcr.io/ccoupel/ansible-builder-frontend:latest
```

#### Push vers Registry Production
```bash
# Push versions production (images identiques au staging)
docker -H tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z
docker -H tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z
docker -H tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-backend:latest
docker -H tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-frontend:latest
```

### 2. Mise à jour Configuration Kubernetes

#### Mise à jour custom-values.yaml
```yaml
# custom-values.yaml - Mettre à jour les tags
backend:
  image:
    repository: ghcr.io/ccoupel/ansible-builder-backend
    tag: "X.Y.Z"
frontend:
  image:
    tag: "X.Y.Z"
```

### 3. Déploiement Production via Helm

#### ⚠️ OBLIGATOIRE : Utiliser Helm pour le déploiement

L'application est gérée via Helm chart. **TOUJOURS** utiliser `helm upgrade` pour maintenir la cohérence de la release Helm.

```bash
# Déploiement production via Helm (OBLIGATOIRE)
KUBECONFIG=kubeconfig.txt helm upgrade ansible-builder ./helm/ansible-builder \
  --namespace ansible-builder \
  --values custom-values.yaml \
  --timeout 300s
```

**Résultat attendu :**
```
Release "ansible-builder" has been upgraded. Happy Helming!
NAME: ansible-builder
NAMESPACE: ansible-builder
STATUS: deployed
REVISION: XX
```

#### Vérification Pods
```bash
# Vérifier que les pods sont Running
KUBECONFIG=kubeconfig.txt kubectl get pods -n ansible-builder

# Vérifier la release Helm
KUBECONFIG=kubeconfig.txt helm list -n ansible-builder
```

#### ❌ NE PAS UTILISER kubectl set image
```bash
# ⚠️ INTERDIT - Casse la cohérence Helm
# kubectl set image deployment/ansible-builder-backend ...
# kubectl set image deployment/ansible-builder-frontend ...
```

### 4. Smoke Tests Production

> **Voir [TESTING_STRATEGY.md](TESTING_STRATEGY.md)** pour les scripts de smoke tests complets.

```bash
# Test 1: Accessibilité
echo "=== Smoke Tests Production ==="
curl -s -I https://coupel.net/ansible-builder/ | head -1

# Test 2: Version API (doit afficher X.Y.Z sans -rc.n)
curl -s https://coupel.net/ansible-builder/api/version

# Vérifier :
# - "version": "X.Y.Z" (sans -rc.n)
# - "environment": "PROD" (ou absent = défaut PROD)
# - "is_rc": false

# Test 3: Fonctionnalité
curl -s https://coupel.net/ansible-builder/api/ansible/versions | head -c 100

# Test 4: Temps de réponse
curl -w "Response time: %{time_total}s\n" -s -o /dev/null https://coupel.net/ansible-builder/
```

**Template Rapport Smoke Tests:**
```markdown
## Rapport Smoke Tests Production - Version X.Y.Z
**Date:** YYYY-MM-DD
**URL:** https://coupel.net/ansible-builder

### Smoke Tests
- Site accessible: HTTP 200 / FAIL
- Version API: X.Y.Z
- Environment: PROD
- Ansible API: OK / FAIL
- Temps réponse: Xs

### Conclusion: DEPLOIEMENT REUSSI / ROLLBACK REQUIS
```

### 5. Finalisation

#### A. Mise à jour Documentation

**DONE.md** - Ajouter :
```markdown
## ✅ **Version X.Y.Z** - *YYYY-MM-DD*

### 🎯 [Titre fonctionnalité]
- Feature 1
- Feature 2

### 📊 Métriques
- Smoke tests : ✅ Passés
- Performance : Conforme
```

**WORK_IN_PROGRESS.md** - Mettre à jour :
```markdown
## 🚀 **Status Actuel**

**Production (Kubernetes) :**
- **Backend :** `X.Y.Z` ✅
- **Frontend :** `X.Y.Z` ✅
- **URL :** https://coupel.net/ansible-builder
- **Tag Git :** `vX.Y.Z`
```

#### B. Commit, Tag et Push
```bash
# Commit documentation
git add docs/work/WORK_IN_PROGRESS.md docs/work/DONE.md custom-values.yaml
git commit -m "docs: Finalize vX.Y.Z - transfer to DONE.md"
git push

# Tag version production
git tag vX.Y.Z
git push --tags
```

---

## ✅ **Checklist Validation Phase 3**

### Pré-Déploiement
- [ ] **Version staging** validée et testée
- [ ] **Images staging** identifiées (X.Y.Z-rc.n)

### Tag et Push
- [ ] **Images taggées** pour ghcr.io (X.Y.Z)
- [ ] **Push ghcr.io** réussi (backend + frontend)
- [ ] **Tag latest** mis à jour

### Déploiement
- [ ] **custom-values.yaml** mis à jour avec nouveaux tags
- [ ] **helm upgrade** réussi (OBLIGATOIRE - pas kubectl set image)
- [ ] **Release Helm** nouvelle revision créée
- [ ] **Pods** Running

### Validation
- [ ] **Smoke tests** passent
- [ ] **Version API** affiche X.Y.Z (sans -rc.n)
- [ ] **environment** = PROD
- [ ] **is_rc** = false

### Finalisation
- [ ] **DONE.md** mis à jour
- [ ] **WORK_IN_PROGRESS.md** nettoyé
- [ ] **Git tag** vX.Y.Z créé et pushé

---

## 🚨 **Rollback**

### Procédure Rapide via Helm (Recommandé)
```bash
# Voir l'historique des releases
KUBECONFIG=kubeconfig.txt helm history ansible-builder -n ansible-builder

# Rollback vers la revision précédente
KUBECONFIG=kubeconfig.txt helm rollback ansible-builder -n ansible-builder

# Ou rollback vers une revision spécifique
KUBECONFIG=kubeconfig.txt helm rollback ansible-builder <REVISION> -n ansible-builder

# Vérification
KUBECONFIG=kubeconfig.txt kubectl get pods -n ansible-builder
curl -s https://coupel.net/ansible-builder/api/version
```

### Alternative : Rollback manuel (si Helm échoue)
```bash
# Uniquement si helm rollback ne fonctionne pas
KUBECONFIG=kubeconfig.txt kubectl rollout undo \
  deployment/ansible-builder-backend -n ansible-builder

KUBECONFIG=kubeconfig.txt kubectl rollout undo \
  deployment/ansible-builder-frontend -n ansible-builder
```

---

## 📊 **Comparaison Staging vs Production**

| Aspect | Staging | Production |
|--------|---------|------------|
| URL | http://192.168.1.217 | https://coupel.net/ansible-builder |
| ENVIRONMENT | STAGING | PROD (défaut) |
| Version affichée | X.Y.Z-rc.n | X.Y.Z |
| is_rc | true | false |
| Image backend | ansible-builder-backend:X.Y.Z-rc.n | ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z |
| Image frontend | ansible-builder-frontend:X.Y.Z-rc.n | ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z |
| Frontend server | nginx (port 80) | nginx (port 80) |
| **Dockerfile** | **frontend/Dockerfile** | **frontend/Dockerfile** |
| **Code** | **IDENTIQUE** | **IDENTIQUE** |

---

*Document maintenu à jour. Dernière mise à jour : 2026-01-01*

*Voir aussi :*
- [Phase 1 Développement](PHASE1_DEVELOPMENT.md)
- [Phase 2 Intégration](PHASE2_INTEGRATION.md)
- [Stratégie de Tests](TESTING_STRATEGY.md)
- [Process Développement](../core/DEVELOPMENT_PROCESS.md)
