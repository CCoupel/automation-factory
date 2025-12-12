# Phase 2 : Production - Ansible Builder

Ce document détaille les procédures spécifiques à la phase de mise en production (Phase 2).

---

## 🎯 **Objectifs Phase 2**

### Scope de la Phase
- **Documentation finale** et changelog
- **Déploiement en production** avec version stable
- **Tests complets environnement réel**
- **Validation production** par utilisateur
- **Nettoyage documentation** et préparation prochaine itération

### Critères d'Entrée
- ✅ **Phase 1 validée** par utilisateur
- ✅ **Tests techniques passent** 100%
- ✅ **Documentation technique** à jour
- ✅ **Approbation déploiement** obtenue

### Critères de Sortie
- ✅ **Version `X.Y.Z` produite** (suppression suffixe `_n`)
- ✅ **Images pushées** sur ghcr.io
- ✅ **Déploiement K8s** opérationnel
- ✅ **Tests production** validés
- ✅ **CHANGELOG.md finalisé** avec version production
- ✅ **DONE.md enrichi** avec nouvelle réalisation
- ✅ **CURRENT_WORK.md nettoyé** pour prochaine itération

---

## 🏗️ **Environnement Production**

### Infrastructure Cible
```bash
# Registry
Registry: ghcr.io/ccoupel
Images:
  - ansible-builder-frontend:X.Y.Z
  - ansible-builder-backend:X.Y.Z

# Production
URL: https://coupel.net/ansible-builder
Orchestration: Kubernetes
Database: SQLite single-pod
```

### Configuration Kubernetes
```bash
# Kubeconfig
export KUBECONFIG=kubeconfig.txt

# Custom values
Values: custom-values.yaml
Namespace: default ou ansible-builder
```

---

## 📋 **Procédures Phase 2**

### 1. Finalisation Documentation

#### Mise à jour CHANGELOG.md (Production)
```markdown
# Transformer entrée development en production
## [X.Y.Z] - 2025-MM-DD (Production Release)

### Added
- [Feature] Description fonctionnalité validée
- [Enhancement] Amélioration déployée

### Fixed  
- [Bug] Correction validée en production

### Changed
- [Update] Modification comportement confirmée

### Performance
- [Optimization] Métriques performance atteintes

### Deployment
- Frontend: ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z
- Backend: ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z
- URL: https://coupel.net/ansible-builder
```

### 2. Documentation DONE.md

#### Ajout nouvelle réalisation
```markdown
# Ajouter dans DONE.md
## ✅ **Version X.Y.Z** - *2025-MM-DD*

### 🎯 [Nom Feature/Bugfix]
- **[Type]** : Description détaillée fonctionnalité
- **Performance** : Métriques atteintes (si applicable)
- **Impact utilisateur** : Bénéfice apporté
- **Technical notes** : Points techniques importants

### 📊 Métriques Atteintes
- **Build time** : Xm Ys
- **Deploy time** : Xm Ys  
- **API response** : <2s (99th percentile)
- **Error rate** : 0% post-deployment
```

### 3. Versioning Production

#### Suppression Suffixe Development
```bash
# Frontend: package.json
"version": "X.Y.Z_n" → "X.Y.Z"

# Backend: version.py  
__version__ = "X.Y.Z_n" → "X.Y.Z"
```

#### Validation Cohérence
```bash
# Vérifier versions identiques
grep -r "X.Y.Z" frontend/package.json
grep -r "X.Y.Z" backend/app/version.py

# Vérifier pas de _n restant
grep -r "_" frontend/package.json backend/app/version.py
```

### 4. Build Production

#### Images Docker
```bash
# Build avec Docker distant
docker --host=tcp://192.168.1.217:2375 build -t ansible-builder-frontend:X.Y.Z frontend/
docker --host=tcp://192.168.1.217:2375 build -t ansible-builder-backend:X.Y.Z backend/

# Validation build
docker --host=tcp://192.168.1.217:2375 images | grep ansible-builder
```

#### Tags Registry
```bash
# Tags pour registry
docker --host=tcp://192.168.1.217:2375 tag ansible-builder-frontend:X.Y.Z ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z
docker --host=tcp://192.168.1.217:2375 tag ansible-builder-backend:X.Y.Z ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z
```

### 5. Publication Registry

#### Authentification GitHub
```bash
# Login registry avec token
cat github_token.txt | docker --host=tcp://192.168.1.217:2375 login ghcr.io -u ccoupel --password-stdin
```

#### Push Images
```bash
# Push sélectif selon modifications
# Frontend modifié
docker --host=tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z

# Backend modifié  
docker --host=tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z
```

### 6. Déploiement Kubernetes

#### Configuration Helm
```bash
# Mise à jour custom-values.yaml
frontend:
  image:
    tag: X.Y.Z
backend:
  image:  
    tag: X.Y.Z
```

#### Déploiement
```bash
# Helm upgrade/install
helm upgrade ansible-builder ./charts/ansible-builder \
  -f custom-values.yaml \
  --set frontend.image.tag=X.Y.Z \
  --set backend.image.tag=X.Y.Z

# Alternative kubectl si pas Helm
kubectl set image deployment/frontend frontend=ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z
kubectl set image deployment/backend backend=ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z
```

---

## ✅ **Tests Production Obligatoires**

### 1. Tests Déploiement
```bash
# Vérification pods
kubectl get pods
kubectl describe pods

# Logs démarrage
kubectl logs deployment/frontend
kubectl logs deployment/backend

# Status services
kubectl get svc
kubectl get ingress
```

### 2. Tests Connectivité
```bash
# Test URL production
curl -f https://coupel.net/ansible-builder

# Test API backend via reverse proxy
curl -f https://coupel.net/ansible-builder/api/health
curl -f https://coupel.net/ansible-builder/api/version
```

### 3. Tests API Complets (Backend Modifié)
```bash
# TOUS les endpoints si backend changé
curl -X POST https://coupel.net/ansible-builder/api/auth/login -d {...}
curl -H "Authorization: Bearer ..." https://coupel.net/ansible-builder/api/auth/me
curl -H "Authorization: Bearer ..." https://coupel.net/ansible-builder/api/playbooks
curl -H "Authorization: Bearer ..." https://coupel.net/ansible-builder/api/galaxy/namespaces
```

### 4. Tests Fonctionnels UI
- [ ] **Page d'accueil** charge correctement
- [ ] **Authentification** fonctionne
- [ ] **Navigation** fluide sans erreurs
- [ ] **Nouvelle fonctionnalité** opérationnelle
- [ ] **Fonctionnalités existantes** non régressées

### 5. Tests Performance
```bash
# Temps de réponse API
curl -w "@curl-format.txt" https://coupel.net/ansible-builder/api/version

# Temps chargement page
# Utiliser outils browser dev ou lighthouse
```

---

## 📊 **Métriques Phase 2**

### Performance Production
- **API Response** : <2s (99th percentile)
- **Page Load** : <3s first paint
- **TTFB** : <500ms  
- **Error Rate** : 0% pour endpoints critiques

### Monitoring
```bash
# Logs production
kubectl logs -f deployment/backend
kubectl logs -f deployment/frontend

# Métriques ressources
kubectl top pods
kubectl describe hpa
```

### Critères d'Acceptation
- **0 erreur critique** dans logs 15 minutes post-deploy
- **Tous endpoints** répondent avec status 200/201/204
- **Performance** conforme aux métriques cibles
- **Fonctionnalité** validée par utilisateur en production

---

## 🚨 **Gestion des Incidents Phase 2**

### Rollback Automatique
```bash
# Si erreurs critiques détectées
kubectl rollout undo deployment/frontend
kubectl rollout undo deployment/backend

# Retour version précédente
helm rollback ansible-builder
```

### Debug Production
```bash
# Logs temps réel
kubectl logs -f -l app=ansible-builder

# Événements cluster
kubectl get events --sort-by=.metadata.creationTimestamp

# Debug pods
kubectl exec -it deployment/backend -- /bin/bash
```

### Escalade
1. **< 5 minutes** : Investigation logs automatique
2. **5-15 minutes** : Rollback si erreurs critiques
3. **> 15 minutes** : Validation manuelle requise utilisateur

---

## 📝 **Finalisation Phase 2**

### Documentation Finale et Nettoyage

#### Finalisation CHANGELOG.md
```bash
# Confirmer version production dans CHANGELOG.md
# Vérifier cohérence dates et informations
# Ajouter metrics de deployment
```

#### Mise à jour DONE.md  
```markdown
# Compléter l'entrée ajoutée précédemment
- Confirmer métriques réelles atteintes
- Ajouter feedback utilisateur post-production
- Documenter lessons learned
```

#### Nettoyage CURRENT_WORK.md
```markdown
# Archiver section work in progress
## ✅ **Version X.Y.Z** - *COMPLETED*
Moved to: docs/work/DONE.md

# Vider sections actives
## 🚧 **Work in Progress** 
*No active development*

## 📝 **Next Priorities**
*Ready for new tasks*

# Préparer pour prochaine demande
- État documentation: ✅ Jour
- Environment: ✅ Prêt  
- Process: ✅ Documenté
```

### Commit Final
```bash
# Ajouter toutes modifications
git add .

# Commit avec message structuré
git commit -m "$(cat <<'EOF'
release: Deploy version X.Y.Z to production

- Feature: Description nouvelle fonctionnalité
- Fix: Corrections apportées  
- Performance: Améliorations mesurées
- Documentation: Mise à jour complète

Deployed: https://coupel.net/ansible-builder
Images: ghcr.io/ccoupel/ansible-builder-*:X.Y.Z

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Push vers repository
git push ccoupel master
```

---

## 🔄 **Transition Post-Production**

### Validation Utilisateur Finale
- **Démonstration** : Montrer fonctionnalité en production
- **Tests utilisateur** : Scénarios réels validés
- **Feedback** : Collecter retours et améliorations futures
- **Acceptance** : Obtenir validation finale

### Préparation Prochaine Itération  
```markdown
# État final workspace
## Documentation
- ✅ **CHANGELOG.md**: Version X.Y.Z finalisée
- ✅ **DONE.md**: Nouvelle réalisation documentée  
- ✅ **CURRENT_WORK.md**: Nettoyé et prêt
- ✅ **BACKLOG.md**: Prochaines priorités à jour

## Environment  
- ✅ **Production**: Stable version X.Y.Z
- ✅ **Development**: Prêt nouvelle iteration
- ✅ **Documentation**: Cohérente et jour

## Process
- ✅ **Cycle complet**: Phase 1 + Phase 2 validés
- ✅ **Metrics**: Performance confirmée
- ✅ **User validation**: Fonctionnalité acceptée
- ✅ **Ready**: Pour nouvelle demande utilisateur
```

---

*Document maintenu à jour. Dernière mise à jour : 2025-12-12*

*Voir aussi :*
- [Phase 1 Développement](PHASE1_DEVELOPMENT.md)
- [Process Développement](../core/DEVELOPMENT_PROCESS.md)
- [Guide Déploiement](DEPLOYMENT_GUIDE.md)