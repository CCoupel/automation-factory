# Phase 1 : Développement - Ansible Builder

Ce document détaille les procédures spécifiques à la phase de développement (Phase 1).

---

## 🎯 **Objectifs Phase 1**

### Scope de la Phase
- **Développement et test en local** sur environnement de développement
- **Validation technique** de l'implémentation
- **Préparation pour validation utilisateur** 
- **Utilisation version `X.Y.Z_n`** avec suffixe de build

### Critères d'Entrée
- **Nouvelle demande utilisateur** reçue et analysée
- **Classification confirmée** (feature vs bugfix)  
- **Plan de développement** établi avec impacts et risques
- **CURRENT_WORK.md mis à jour** avec nouvelle tâche

### Critères de Sortie
- ✅ **Version `X.Y.Z_n` testée** et validée techniquement
- ✅ **Rapport technique** avec métriques
- ✅ **Documentation technique** mise à jour  
- ✅ **Validation utilisateur obtenue**
- ✅ **CHANGELOG.md mis à jour** avec nouvelles fonctionnalités
- 🚫 **Pas de déploiement production** avant validation

---

## 🛠️ **Environnement de Développement**

### Infrastructure
```bash
# Configuration Docker Host
export DOCKER_HOST=tcp://192.168.1.217:2375

# URLs de test
Frontend: http://192.168.1.217:5173
Backend:  http://192.168.1.217:8000
```

### Configuration Database
- **Type** : SQLite pour développement rapide
- **Location** : `/tmp/ansible_builder_dev.db`
- **Reset** : Possible à chaque test

### Services
- **Cache** : Redis local ou in-memory
- **Logs** : Console output pour debug immédiat
- **Monitoring** : Logs temps réel uniquement

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

### 2. Préparation Environnement
```bash
# Vérification Docker host
docker --host=tcp://192.168.1.217:2375 ps

# Arrêt instances précédentes
docker --host=tcp://192.168.1.217:2375 compose down

# Nettoyage si nécessaire
docker --host=tcp://192.168.1.217:2375 system prune -f
```

### 3. Versioning Development
```bash
# Incrément automatique version _n
# Pattern: X.Y.Z_n où n s'incrémente à chaque build

# Exemples:
1.8.1_1 → 1.8.1_2 → 1.8.1_3
```

### 4. Build et Lancement
```bash
# Build images
docker --host=tcp://192.168.1.217:2375 compose build

# Lancement services
docker --host=tcp://192.168.1.217:2375 compose up -d

# Vérification démarrage
docker --host=tcp://192.168.1.217:2375 compose logs -f
```

### 5. Tests Automatisés
```bash
# Tests unitaires frontend
npm run test

# Tests unitaires backend  
python -m pytest

# Tests linting
npm run lint
python -m flake8
```

### 6. Validation Technique
```bash
# Test accessibilité frontend
curl -f http://192.168.1.217:5173

# Test API backend
curl -f http://192.168.1.217:8000/api/health
curl -f http://192.168.1.217:8000/api/version

# Test endpoints principaux
curl -f http://192.168.1.217:8000/api/auth/...
curl -f http://192.168.1.217:8000/api/playbooks/...
```

### 7. Validation Utilisateur et Documentation

#### Démonstration à l'utilisateur
- **Présentation fonctionnalité** développée
- **Tests scenarios utilisateur** validés
- **Collecte feedback** et demandes d'ajustements

#### Mise à jour CHANGELOG.md (Après validation)
```markdown
# Ajouter dans CHANGELOG.md
## [X.Y.Z_n] - 2025-MM-DD (Development)

### Added
- [Feature] Description nouvelle fonctionnalité
- [Enhancement] Amélioration existante

### Fixed  
- [Bug] Correction problème identifié

### Changed
- [Update] Modification comportement

### Performance
- [Optimization] Amélioration performance mesurée
```

#### Validation Formelle
- ✅ **Approbation explicite** utilisateur pour passage Phase 2
- ✅ **Tests utilisateur** réussis
- ✅ **Documentation** technique et fonctionnelle à jour
- ✅ **CHANGELOG.md** enrichi avec développements Phase 1

---

## ✅ **Checklist Validation Phase 1**

### Tests Techniques Obligatoires
- [ ] **Logs frontend** : Aucune erreur critique en console
- [ ] **Logs backend** : Démarrage propre, connexion DB OK
- [ ] **Page d'accueil** : Charge sans erreur 200/300
- [ ] **API Health** : Endpoints /health et /version répondent
- [ ] **Tests unitaires** : 100% de passage
- [ ] **Linting** : Code conforme aux standards

### Tests Fonctionnels
- [ ] **Feature implémentée** : Fonctionne selon spécifications
- [ ] **Navigation** : Pas de régression sur fonctionnalités existantes
- [ ] **Performance locale** : Réponses <2s sur réseau local
- [ ] **Gestion erreurs** : Messages appropriés si erreur

### Tests d'Intégration
- [ ] **Frontend ↔ Backend** : Communication OK
- [ ] **Base de données** : CRUD operations fonctionnelles
- [ ] **Authentification** : Login/logout opérationnels
- [ ] **Cache/Galaxy** : Services externes répondent

---

## 📊 **Métriques Phase 1**

### Performance Locale
```bash
# Temps build
time docker --host=tcp://192.168.1.217:2375 compose build

# Temps démarrage
time docker --host=tcp://192.168.1.217:2375 compose up -d

# Temps réponse API
curl -w "@curl-format.txt" http://192.168.1.217:8000/api/version
```

### Métriques Cibles
- **Build Time** : <5 minutes
- **Startup Time** : <30 secondes
- **API Response** : <1s local
- **Page Load** : <2s local
- **Memory Usage** : <1GB total

---

## 📝 **Livrables Phase 1**

### Documentation Technique
- **Rapport de tests** : Résultats tous tests automatisés
- **Métriques performance** : Temps build, startup, réponse
- **Screenshots** : Interface utilisateur si changes UI
- **Changelog technique** : Modifications code significatives

### Artefacts Code
- **Version `X.Y.Z_n`** : Testée et validée
- **Tests mis à jour** : Coverage maintenu ou amélioré
- **Documentation code** : Comments et docstrings
- **Configuration** : Environnement développement stable

---

## 🚨 **Points d'Attention Phase 1**

### ⚠️ **Arrêts Obligatoires**
- **Erreurs critiques** : Logs avec ERROR ou FATAL
- **Tests échoués** : Même un seul test unitaire en échec
- **Régression** : Fonctionnalité existante cassée
- **Performance dégradée** : Temps réponse >5s local

### 🔍 **Validations Utilisateur**
- **Démonstration** : Présenter la fonctionnalité à l'utilisateur
- **Feedback** : Collecter commentaires et demandes ajustements
- **Approbation explicite** : Obtenir "go" pour Phase 2
- **Corrections si nécessaire** : Retour développement si demandé

### 📋 **Avant Phase 2**
- **Documentation jour** : Mise à jour complète docs techniques
- **Code review** : Vérification qualité code
- **Plan Phase 2** : Stratégie déploiement définie
- **Backup config** : Sauvegarder configuration actuelle

---

## 🔄 **Transition vers Phase 2**

### Conditions de Passage
1. ✅ **Tous tests Phase 1 passent**
2. ✅ **Validation utilisateur obtenue**
3. ✅ **Documentation technique à jour**
4. ✅ **Performance locale acceptable**
5. ✅ **Aucune erreur critique**

### Préparation Phase 2
```bash
# Arrêt propre environnement dev
docker --host=tcp://192.168.1.217:2375 compose down

# Vérification version finale
cat frontend/package.json | grep version
cat backend/app/version.py | grep version

# Documentation finale
git status # Vérifier docs à jour
```

---

*Document maintenu à jour. Dernière mise à jour : 2025-12-12*

*Voir aussi :*
- [Phase 2 Production](PHASE2_PRODUCTION.md)
- [Process Développement](../core/DEVELOPMENT_PROCESS.md)
- [Guide Déploiement](DEPLOYMENT_GUIDE.md)