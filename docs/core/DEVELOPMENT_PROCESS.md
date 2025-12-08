# Process de Développement - Ansible Builder

Ce document décrit la méthodologie de développement, les phases et les procédures pour Ansible Builder.

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

## 🚀 **Sprint de Développement**

### Étapes du Sprint

1. **Définition** : Nouvelle fonctionnalité ou définition d'un bug
2. **Classification** : Confirmation feature vs bugfix (impact versioning)
3. **Planification** :
   - 3a) Plan de développement avec impact, risques, gains
   - 3b) Mise à jour documentation avec la demande
4. **Phase 1** : Développement local
5. **Tests Phase 1** :
   - 5a) Analyse logs et tests unitaires/bout-en-bout + corrections
   - 5b) Rapport de tests et performance
   - 5c) Arrêt instances précédentes + relance sur 192.168.1.217 (ports 5180/8000)
   - 5d) Test page d'accueil sans erreur + API répond
6. **Validation** : Tests manuels utilisateur
7. **Décision** :
   - 7a) Corrections → Retour Phase 1
   - 7b) Validation → Phase 2
8. **Phase 2** : Intégration production
9. **Build** : Images frontend et backend
10. **Publication** : Push images sur ghcr.io
11. **Déploiement** : Deploy dans Kubernetes
12. **Tests Phase 2** : Logs + tests + corrections si nécessaire
13. **Rapport final** : Tests et performance
14. **Finalisation** : Mise à jour documentation + commit/push

---

## 🔧 **Phase 1 : Développement**

### Objectifs
- Développement et test en local
- Validation technique de l'implémentation
- Préparation pour validation utilisateur

### Procédures

#### Build et Test
```bash
# Incrémenter version _n automatiquement
# Build sur Docker distant
docker --host=tcp://192.168.1.217:2375 build ...

# Test local accessible
# Frontend: http://192.168.1.217:5173
# Backend: http://192.168.1.217:8000
```

#### Validation Technique
- Logs frontend et backend sans erreur
- Tests unitaires passent
- API endpoints répondent correctement
- Page d'accueil charge sans erreur
- Fonctionnalité implémentée opérationnelle

#### Livrable Phase 1
- Version `X.Y.Z_n` testée et validée
- Rapport technique avec métriques
- Documentation mise à jour
- **Attente validation utilisateur avant Phase 2**

---

## 🚀 **Phase 2 : Intégration**

### Objectifs
- Déploiement en production
- Tests complets environnement réel
- Documentation finale

### Procédures

#### Build Production
```bash
# Utilisation Docker distant pour build
docker --host=tcp://192.168.1.217:2375 build ...

# Build sélectif (frontend OU backend si modifié)
# Tags production : suppression suffixe _n
```

#### Publication
```bash
# Push vers GitHub Container Registry
# Authentification via github_token.txt
docker push ghcr.io/ccoupel/ansible-builder-backend:X.Y.Z
docker push ghcr.io/ccoupel/ansible-builder-frontend:X.Y.Z
```

#### Déploiement Kubernetes
```bash
# Configuration kubeconfig.txt
# Déploiement via custom-values.yaml
helm upgrade ansible-builder ...
```

#### Tests Production
- Vérification logs de démarrage containers
- Test TOUS les appels API (pour nouveau backend)
- Validation complète fonctionnalités
- Tests de régression

#### Finalisation
- Mise à jour documentation implémentation
- Commit et push vers repository
- Version d'intégration = dernière version développement

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
- **URL** : https://coupel.net/ansible-builder
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
- [Travail Actuel](../work/CURRENT_WORK.md)