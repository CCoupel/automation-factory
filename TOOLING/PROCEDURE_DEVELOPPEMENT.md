# 📋 Procédure de Développement et Déploiement

## 🎯 Règles de Versioning

### Repository EXTERNE (ghcr.io/ccoupel)
- **Format :** X.Y.Z (ex: 1.3.8)
- **Push uniquement** sur validation explicite avec commit git
- Versions stables et officielles

### Repository INTERNE (développement)
- **Format :** X.Y.Z_n (ex: 1.3.8_1, 1.3.8_2, etc.)
- **n** : increment de build, seul à changer durant le développement
- **X.Y.Z** : fixes jusqu'au prochain push externe

### Incrémentation des versions
- **X** : Changement de schéma de base de données
- **Y** : Nouvelle fonctionnalité implémentée
- **Z** : Correction de bug
- **n** : Build de développement (reset après push externe)
- **Sans limite** : Peut dépasser 10 (ex: 2.157.342_89)

---

## 🔧 Procédure Post-Modifications de Code

### 1. Vérification du Code Modifié

```bash
# Identifier quoi builder
- Si modification backend/ → build image backend
- Si modification frontend/ → build image frontend
- Si les deux → build les deux
```

### 2. Build des Images (INTERNE uniquement)

```bash
# Docker disponible : 192.168.1.217

# Backend (si modifié)
cd backend/
docker --host tcp://192.168.1.217:2375 build -t ansible-builder-backend:1.3.8_1 -f Dockerfile .

# Frontend (si modifié)
cd frontend/
docker --host tcp://192.168.1.217:2375 build -t ansible-builder-frontend:1.5.1_1 -f Dockerfile .

# Incrémenter _n à chaque nouveau build : _1, _2, _3...
```

**⚠️ NE PAS PUSH vers ghcr.io !**

### 3. Mise à jour Configuration Kubernetes

```yaml
# custom-values.yaml pour développement
backend:
  image:
    repository: ansible-builder-backend  # Local, sans ghcr.io
    tag: "1.3.8_1"
    pullPolicy: Never  # Force utilisation image locale

frontend:
  image:
    repository: ansible-builder-frontend
    tag: "1.5.1_1"
    pullPolicy: Never
```

### 4. Déploiement sur Kubernetes

```bash
# Déployer avec Helm
helm --kubeconfig=kubeconfig.txt upgrade ansible-builder ./helm/ansible-builder -f custom-values.yaml --namespace ansible-builder

# Si nécessaire, forcer redémarrage
kubectl --kubeconfig=kubeconfig.txt rollout restart deployment/ansible-builder-backend -n ansible-builder
kubectl --kubeconfig=kubeconfig.txt rollout restart deployment/ansible-builder-frontend -n ansible-builder
```

### 5. Vérification des Logs de Démarrage

```bash
# Attendre que les pods soient prêts
kubectl --kubeconfig=kubeconfig.txt wait --for=condition=ready pod -l app.kubernetes.io/component=backend -n ansible-builder --timeout=300s

# Vérifier les logs de démarrage
kubectl --kubeconfig=kubeconfig.txt logs -l app.kubernetes.io/component=backend -n ansible-builder | grep -E "(Starting|Database|Error|✅|❌|🚀)"

# Chercher erreurs spécifiques
kubectl --kubeconfig=kubeconfig.txt logs <POD-NAME> -n ansible-builder | head -50
```

### 6. Tests OBLIGATOIRES des APIs (Backend)

**À chaque déploiement d'une nouvelle version backend :**

```bash
# 1. Version Frontend
curl -s "https://coupel.net/ansible-builder/version"
# Attendu: {"version":"X.Y.Z","name":"Ansible Builder Frontend"}

# 2. Version Backend
curl -s "https://coupel.net/ansible-builder/api/version"
# Attendu: {"version":"X.Y.Z","name":"Ansible Builder API"}

# 3. Health Check Frontend
curl -s "https://coupel.net/ansible-builder/health"
# Attendu: {"status":"healthy","service":"frontend"}

# 4. Health Check Backend (si existe)
curl -s "https://coupel.net/ansible-builder/api/health"

# 5. Test Authentication
curl -X POST "https://coupel.net/ansible-builder/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin"}'

# 6. Test Register (si nécessaire)
curl -X POST "https://coupel.net/ansible-builder/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"password123"}'

# 7. Autres endpoints selon modifications
```

### 7. Cycle de Développement

```
Build 1: 1.3.8_1  → Test → ❌ Bug trouvé
Build 2: 1.3.8_2  → Test → ❌ Autre correction  
Build 3: 1.3.8_3  → Test → ✅ Fonctionne
Build 4: 1.3.8_4  → Test → ✅ Amélioration
...
Build n: 1.3.8_15 → Test → ✅ Version stable
```

---

## 🚀 Procédure de Push Externe (Sur Validation)

### SEULEMENT quand demandé : "Push vers git"

### 1. Déterminer la nouvelle version

```
Si changement DB schema  → X+1.0.0
Si nouvelle fonctionnalité → X.Y+1.0  
Si bugfix → X.Y.Z+1
```

### 2. Tagger et Pusher les Images

```bash
# Login GitHub Registry
echo $GITHUB_TOKEN | docker --host tcp://192.168.1.217:2375 login ghcr.io -u ccoupel --password-stdin

# Backend
docker --host tcp://192.168.1.217:2375 tag ansible-builder-backend:1.3.8_15 ghcr.io/ccoupel/ansible-builder-backend:1.3.9
docker --host tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-backend:1.3.9

# Frontend
docker --host tcp://192.168.1.217:2375 tag ansible-builder-frontend:1.5.1_8 ghcr.io/ccoupel/ansible-builder-frontend:1.5.2
docker --host tcp://192.168.1.217:2375 push ghcr.io/ccoupel/ansible-builder-frontend:1.5.2
```

### 3. Mise à jour pour Production

```yaml
# custom-values.yaml pour production
backend:
  image:
    repository: ghcr.io/ccoupel/ansible-builder-backend
    tag: "1.3.9"
    pullPolicy: Always

frontend:
  image:
    repository: ghcr.io/ccoupel/ansible-builder-frontend
    tag: "1.5.2"
    pullPolicy: Always
```

### 4. Déploiement Production

```bash
helm --kubeconfig=kubeconfig.txt upgrade ansible-builder ./helm/ansible-builder -f custom-values.yaml --namespace ansible-builder
```

### 5. Documentation et Reset

- Mettre à jour CLAUDE.md avec nouveau changelog
- Documenter les changements dans TOOLING/
- **Reset compteur** : Prochain build sera X.Y.Z_1

---

## 📊 Exemple Complet

```
DÉVELOPPEMENT:
Version actuelle externe : backend 1.3.8, frontend 1.5.1

Bugfix authentication :
- Build : backend 1.3.8_1 → Test → Erreur
- Build : backend 1.3.8_2 → Test → OK
- Build : backend 1.3.8_3 → Amélioration logs → OK

VALIDATION : "Push vers git, c'est un bugfix"

ACTIONS :
1. Nouvelle version : 1.3.9 (Z+1 car bugfix)
2. Tag 1.3.8_3 → ghcr.io/ccoupel/ansible-builder-backend:1.3.9
3. Push vers ghcr.io
4. Deploy production avec 1.3.9
5. Prochain build sera 1.3.9_1
```

---

## ⚠️ Points d'Attention

1. **Ne jamais push vers ghcr.io sans validation explicite**
2. **Toujours tester TOUTES les APIs après déploiement backend**
3. **Vérifier les logs de démarrage des containers**
4. **Builder seulement ce qui a été modifié**
5. **Documenter les changements importants**

---

## 🔄 Rollback si Nécessaire

```bash
# Voir historique
helm --kubeconfig=kubeconfig.txt history ansible-builder -n ansible-builder

# Rollback à version précédente
helm --kubeconfig=kubeconfig.txt rollback ansible-builder [REVISION] -n ansible-builder
```

---

**Dernière mise à jour :** 2025-12-05  
**Version procédure :** 2.0