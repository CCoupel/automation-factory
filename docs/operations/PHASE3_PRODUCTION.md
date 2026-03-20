# Phase 3 : Production - Automation Factory

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
- Noms de services identiques : automation-factory-backend, automation-factory-frontend
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
Namespace: automation-factory
Registry: ghcr.io/ccoupel
URL: https://coupel.net/automation-factory
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

### 1. Pipeline GitHub Actions CI — Build et Push des Images

#### ⚠️ PAS DE BUILD LOCAL — Les images production viennent EXCLUSIVEMENT du pipeline GitHub Actions CI

```bash
# 1. S'assurer que main contient le code de la version à déployer
git log --oneline github/main | head -3

# 2. Pousser sur main pour déclencher le pipeline CI
git push https://<PAT>@github.com/CCoupel/automation-factory.git main
```

#### Surveillance ACTIVE du pipeline CI (Claude doit faire cela, pas l'utilisateur)

```bash
# Lister les derniers runs sur main
GITHUB_TOKEN=<PAT> gh run list --repo CCoupel/automation-factory --branch main --limit 5

# Surveiller un run spécifique (relancer toutes les 60s jusqu'à conclusion)
GITHUB_TOKEN=<PAT> gh run view <run_id> --repo CCoupel/automation-factory

# Si le run échoue : analyser les logs
GITHUB_TOKEN=<PAT> gh run view <run_id> --log-failed --repo CCoupel/automation-factory
# → Corriger le code, pousser, et attendre le prochain run — NE JAMAIS contourner par build local
```

**Le pipeline CI est terminé quand :** `status: completed` + `conclusion: success`

#### Vérification des images sur ghcr.io
```bash
# Vérifier que les images X.Y.Z sont bien disponibles sur ghcr.io
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-backend/versions \
  --jq '.[0].metadata.container.tags'
GITHUB_TOKEN=<PAT> gh api /orgs/CCoupel/packages/container/automation-factory-frontend/versions \
  --jq '.[0].metadata.container.tags'
# Doit retourner ["X.Y.Z", "latest"]
```

### 2. Mise à jour Configuration Kubernetes

#### Mise à jour custom-values.yaml
```yaml
# custom-values.yaml - Mettre à jour les tags
backend:
  image:
    repository: ghcr.io/ccoupel/automation-factory-backend
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
KUBECONFIG=kubeconfig.txt helm upgrade automation-factory ./helm/automation-factory \
  --namespace automation-factory \
  --values custom-values.yaml \
  --timeout 300s
```

**Résultat attendu :**
```
Release "automation-factory" has been upgraded. Happy Helming!
NAME: automation-factory
NAMESPACE: automation-factory
STATUS: deployed
REVISION: XX
```

#### Vérification Pods
```bash
# Vérifier que les pods sont Running
KUBECONFIG=kubeconfig.txt kubectl get pods -n automation-factory

# Vérifier la release Helm
KUBECONFIG=kubeconfig.txt helm list -n automation-factory
```

#### ❌ NE PAS UTILISER kubectl set image
```bash
# ⚠️ INTERDIT - Casse la cohérence Helm
# kubectl set image deployment/automation-factory-backend ...
# kubectl set image deployment/automation-factory-frontend ...
```

### 4. Smoke Tests Production

> **Voir [TESTING_STRATEGY.md](TESTING_STRATEGY.md)** pour les scripts de smoke tests complets.

```bash
# Test 1: Accessibilité
echo "=== Smoke Tests Production ==="
curl -s -I https://coupel.net/automation-factory/ | head -1

# Test 2: Version API (doit afficher X.Y.Z sans -rc.n)
curl -s https://coupel.net/automation-factory/api/version

# Vérifier :
# - "version": "X.Y.Z" (sans -rc.n)
# - "environment": "PROD" (ou absent = défaut PROD)
# - "is_rc": false

# Test 3: Fonctionnalité
curl -s https://coupel.net/automation-factory/api/ansible/versions | head -c 100

# Test 4: Temps de réponse
curl -w "Response time: %{time_total}s\n" -s -o /dev/null https://coupel.net/automation-factory/
```

**Template Rapport Smoke Tests:**
```markdown
## Rapport Smoke Tests Production - Version X.Y.Z
**Date:** YYYY-MM-DD
**URL:** https://coupel.net/automation-factory

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
- **URL :** https://coupel.net/automation-factory
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

#### C. Mise à jour Site Marketing

**⚠️ OBLIGATOIRE** : Mettre à jour le site marketing (ccoupel.bitbucket.io) avec la nouvelle version.

**Fichiers à modifier dans `marketing/` :**

1. **translations.js** - Hero Badge (en-tête de page)
   - **⚠️ OBLIGATOIRE** : Mettre à jour `hero.badge` (FR ligne ~18, EN ligne ~346)
   - Format : `'hero.badge': 'Version X.Y.Z - Nom Feature',`

2. **index.html** - Hero Badge (fallback, ligne ~70)
   - Mettre à jour le texte dans `<span data-i18n="hero.badge">...</span>`

3. **index.html** - Section Versions (timeline)
   - Ajouter la nouvelle version en haut de la timeline
   - Marquer la nouvelle version comme "Actuelle" / "Current"
   - Retirer le tag "Actuelle" de l'ancienne version
   - **⚠️ OBLIGATOIRE** : Ajouter `data-i18n-detail` sur chaque `<li>` pour les popups

4. **translations.js** - Traductions FR/EN
   - Ajouter les traductions pour la nouvelle version :
     - `versions.vXYZ.date` (FR/EN)
     - `versions.vXYZ.title` (FR/EN)
     - `versions.vXYZ.f1`, `f2`, etc. pour chaque feature (FR/EN)
     - **⚠️ OBLIGATOIRE** : `versions.vXYZ.f1.detail`, `f2.detail`, etc. pour les popups (FR/EN)

5. **index.html** - Section Roadmap (optionnel)
   - Retirer les fonctionnalités implémentées de la roadmap
   - Ajouter les nouvelles fonctionnalités prévues

**Documentation complète** : Voir `marketing/MAINTENANCE.md`

**Procédure :**
```bash
# 1. Modifier les fichiers dans marketing/
cd marketing

# 2. Commit et push le submodule
git add index.html translations.js
git commit -m "feat: Add version X.Y.Z to changelog and update roadmap"
git push origin main

# 3. Mettre à jour la référence du submodule dans le repo principal
cd ..
git add marketing
git commit -m "chore: Update marketing submodule - version X.Y.Z"
git push
```

**Template nouvelle version (index.html) :**
```html
<div class="timeline-item current">
    <div class="timeline-marker">
        <span class="marker-dot"></span>
    </div>
    <div class="timeline-content">
        <div class="version-header">
            <span class="version-badge">vX.Y.Z</span>
            <span class="version-date" data-i18n="versions.vXYZ.date">Mois YYYY</span>
            <span class="version-tag current-tag" data-i18n="versions.current">Actuelle</span>
        </div>
        <h3 data-i18n="versions.vXYZ.title">Titre Feature</h3>
        <ul class="version-features">
            <li class="feat-TYPE" data-i18n-detail="versions.vXYZ.f1.detail">
                <svg viewBox="0 0 24 24">...</svg>
                <span data-i18n="versions.vXYZ.f1">Feature 1</span>
            </li>
            <li class="feat-TYPE" data-i18n-detail="versions.vXYZ.f2.detail">
                <svg viewBox="0 0 24 24">...</svg>
                <span data-i18n="versions.vXYZ.f2">Feature 2</span>
            </li>
        </ul>
    </div>
</div>
```

**Types de features (class `feat-TYPE`) :**
- `feat-api` - API/Cloud (bleu)
- `feat-frontend` - Frontend (violet)
- `feat-backend` - Backend (vert)
- `feat-security` - Sécurité (orange)
- `feat-perf` - Performance (jaune)
- `feat-collab` - Collaboration (rose)

---

## ✅ **Checklist Validation Phase 3**

### Pré-Déploiement
- [ ] **Version staging** validée et testée
- [ ] **Images staging** identifiées (X.Y.Z-rc.n)

### Pipeline CI GitHub Actions
- [ ] **Push sur `main`** effectué
- [ ] **Pipeline CI** surveillé activement (gh run view, polling 60s)
- [ ] **Pipeline CI** terminé avec `conclusion: success`
- [ ] **Images ghcr.io** vérifiées : tag X.Y.Z présent (backend + frontend)

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

### Site Marketing (ccoupel.bitbucket.io)
- [ ] **Hero Badge** - `hero.badge` mis à jour dans translations.js (FR + EN)
- [ ] **Hero Badge** - Fallback mis à jour dans index.html (ligne ~70)
- [ ] **index.html** - Nouvelle version ajoutée avec `data-i18n-detail` pour popups
- [ ] **translations.js** - Traductions FR/EN avec clés `.detail` pour popups
- [ ] **Roadmap** mise à jour (optionnel)
- [ ] **Submodule** marketing commité et pushé
- [ ] **Test popups** - Vérifier que les popups s'affichent au clic

---

## 🚨 **Rollback**

### Procédure Rapide via Helm (Recommandé)
```bash
# Voir l'historique des releases
KUBECONFIG=kubeconfig.txt helm history automation-factory -n automation-factory

# Rollback vers la revision précédente
KUBECONFIG=kubeconfig.txt helm rollback automation-factory -n automation-factory

# Ou rollback vers une revision spécifique
KUBECONFIG=kubeconfig.txt helm rollback automation-factory <REVISION> -n automation-factory

# Vérification
KUBECONFIG=kubeconfig.txt kubectl get pods -n automation-factory
curl -s https://coupel.net/automation-factory/api/version
```

### Alternative : Rollback manuel (si Helm échoue)
```bash
# Uniquement si helm rollback ne fonctionne pas
KUBECONFIG=kubeconfig.txt kubectl rollout undo \
  deployment/automation-factory-backend -n automation-factory

KUBECONFIG=kubeconfig.txt kubectl rollout undo \
  deployment/automation-factory-frontend -n automation-factory
```

---

## 📊 **Comparaison Staging vs Production**

| Aspect | Staging | Production |
|--------|---------|------------|
| URL | http://192.168.1.217 | https://coupel.net/automation-factory |
| ENVIRONMENT | STAGING | PROD (défaut) |
| Version affichée | X.Y.Z-rc.n | X.Y.Z |
| is_rc | true | false |
| Image backend | automation-factory-backend:X.Y.Z-rc.n | ghcr.io/ccoupel/automation-factory-backend:X.Y.Z |
| Image frontend | automation-factory-frontend:X.Y.Z-rc.n | ghcr.io/ccoupel/automation-factory-frontend:X.Y.Z |
| Frontend server | nginx (port 80) | nginx (port 80) |
| **Dockerfile** | **frontend/Dockerfile** | **frontend/Dockerfile** |
| **Code** | **IDENTIQUE** | **IDENTIQUE** |

---

*Document maintenu à jour. Dernière mise à jour : 2026-03-20 — v2.4.3 deployed, Helm revision 13*

*Voir aussi :*
- [Phase 1 Développement](PHASE1_DEVELOPMENT.md)
- [Phase 2 Intégration](PHASE2_INTEGRATION.md)
- [Stratégie de Tests](TESTING_STRATEGY.md)
- [Process Développement](../core/DEVELOPMENT_PROCESS.md)
