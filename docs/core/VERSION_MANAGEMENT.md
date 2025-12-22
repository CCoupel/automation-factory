# Gestion des Versions - Ansible Builder

Ce document décrit le système complet de gestion des versions, incluant le format, l'affichage conditionnel par environnement, et l'implémentation technique.

---

## 📋 **Format des Versions**

### Pattern Standard
```
X.Y.Z[-rc.n]
```

| Composant | Description | Exemple |
|-----------|-------------|---------|
| **X** | Version majeure (changements DB/breaking) | `1`, `2` |
| **Y** | Version mineure (nouvelles fonctionnalités) | `13`, `14` |
| **Z** | Version patch (bugfixes) | `0`, `1`, `2` |
| **-rc.n** | Release Candidate (optionnel, staging/dev) | `-rc.1`, `-rc.2` |

### Exemples de Versions
```
1.13.0          # Version stable production
1.13.0-rc.1     # Release Candidate 1 en staging
1.13.0-rc.2     # Release Candidate 2 en staging
1.13.1          # Bugfix version
1.14.0          # Nouvelle fonctionnalité
2.0.0           # Breaking change / migration DB
```

---

## 🌍 **Affichage par Environnement**

### Règle Principale

| Environnement | Valeur `ENVIRONMENT` | Version Affichée | Exemple |
|---------------|---------------------|------------------|---------|
| **Production** | `PROD` | Version de base (sans `-rc.n`) | `1.13.0` |
| **Staging** | `STAGING` | Version complète (avec `-rc.n`) | `1.13.0-rc.2` |
| **Développement** | `DEV` | Version complète (avec `-rc.n`) | `1.13.0-rc.2` |

### Logique de Décision
```
SI environment === 'PROD'
    ALORS afficher version sans suffix RC (ex: 1.13.0)
SINON
    afficher version complète (ex: 1.13.0-rc.2)
```

---

## ⚙️ **Implémentation Backend**

### Fichier : `backend/app/version.py`

```python
import os

__version__ = "1.13.0-rc.2"  # Version interne complète
__description__ = "Ansible Builder API with dynamic Ansible documentation integration"

# Environment: PROD (default), STAGING, DEV
ENVIRONMENT = os.getenv("ENVIRONMENT", "PROD")

def get_base_version(version: str) -> str:
    """Extract base version (remove -rc.X suffix)"""
    if '-rc.' in version:
        return version.split('-')[0]
    return version

def get_display_version() -> str:
    """Get version string for display (hides RC in PROD)"""
    if ENVIRONMENT == "PROD":
        return get_base_version(__version__)
    return __version__

def get_version_info():
    """Get complete version information including features"""
    base_version = get_base_version(__version__)
    display_version = get_display_version()

    return {
        "version": display_version,           # Version affichée (selon env)
        "base_version": base_version,         # Version de base (sans RC)
        "internal_version": __version__,      # Version interne complète
        "environment": ENVIRONMENT,           # Environnement actuel
        "description": __description__,
        "is_rc": "-rc." in __version__ and ENVIRONMENT != "PROD",
        "features": VERSION_FEATURES.get(base_version, {})
    }
```

### Endpoint API : `GET /api/version`

**Réponse en STAGING :**
```json
{
  "version": "1.13.0-rc.2",
  "base_version": "1.13.0",
  "internal_version": "1.13.0-rc.2",
  "environment": "STAGING",
  "is_rc": true,
  "features": { ... }
}
```

**Réponse en PROD :**
```json
{
  "version": "1.13.0",
  "base_version": "1.13.0",
  "internal_version": "1.13.0-rc.2",
  "environment": "PROD",
  "is_rc": false,
  "features": { ... }
}
```

---

## 🎨 **Implémentation Frontend**

### Fichier : `frontend/package.json`
```json
{
  "version": "1.13.0-rc.2"
}
```

### Hook partagé : `frontend/src/hooks/useVersionInfo.ts`

Ce hook centralise toute la logique de gestion des versions pour garantir un affichage cohérent dans toute l'application.

```typescript
import { useState, useEffect } from 'react'
import axios from 'axios'
import packageJson from '../../package.json'

export interface UseVersionInfoReturn {
  frontendVersion: string      // Version affichée (selon env)
  backendVersion: string       // Version backend
  backendVersionInfo: VersionInfo | null
  packageVersion: string       // Version brute package.json
  isProduction: boolean        // true si PROD
  isReleaseCandidate: boolean  // true si RC et pas PROD
  isLoading: boolean
  error: string | null
}

export function useVersionInfo(): UseVersionInfoReturn {
  const [backendVersionInfo, setBackendVersionInfo] = useState<VersionInfo | null>(null)

  useEffect(() => {
    const fetchVersion = async () => {
      const response = await axios.get('/api/version')
      setBackendVersionInfo(response.data)
    }
    fetchVersion()
  }, [])

  // Compute display values based on environment
  const isProduction = backendVersionInfo?.environment === 'PROD'

  // Frontend version: remove RC suffix only in production
  const frontendVersion = isProduction
    ? packageJson.version.replace(/-rc\.\d+$/, '')
    : packageJson.version

  return { frontendVersion, backendVersion, isReleaseCandidate, ... }
}
```

### Utilisation dans les composants

**LoginPage.tsx :**
```typescript
import { useVersionInfo } from '../hooks/useVersionInfo'

const LoginPage = () => {
  const { frontendVersion, backendVersion } = useVersionInfo()

  return (
    <Chip label={`Frontend: ${frontendVersion}`} />
    <Chip label={`Backend: ${backendVersion}`} />
  )
}
```

**AppHeader.tsx :**
```typescript
import { useVersionInfo } from '../../hooks/useVersionInfo'

const AppHeader = () => {
  const { frontendVersion, backendVersion, backendVersionInfo, isReleaseCandidate } = useVersionInfo()

  // Dans le dialog About:
  return (
    <>
      <Typography>• Frontend: {frontendVersion}</Typography>
      <Typography>• Backend: {backendVersion}</Typography>
      <Typography>• Environment: {backendVersionInfo?.environment}</Typography>
      {isReleaseCandidate && (
        <Typography color="warning">⚠️ Release Candidate</Typography>
      )}
    </>
  )
}
```

### Avantages du Hook
- **Centralisation** : Une seule source de vérité pour la logique de version
- **Cohérence** : Même affichage sur toutes les pages (Login, About, etc.)
- **Maintenabilité** : Modifier la logique à un seul endroit
- **Réutilisabilité** : Facile à utiliser dans tout nouveau composant

---

## 📁 **Fichiers à Modifier pour Changer la Version**

### Liste Complète

| Fichier | Contenu à Modifier |
|---------|-------------------|
| `backend/app/version.py` | `__version__ = "X.Y.Z-rc.n"` |
| `frontend/package.json` | `"version": "X.Y.Z-rc.n"` |
| `docker-compose.staging.yml` | Tags images Docker |
| `custom-values.yaml` | Tags Kubernetes (production) |

### Commande de Mise à Jour Rapide
```bash
# Backend
sed -i 's/__version__ = ".*"/__version__ = "1.14.0-rc.1"/' backend/app/version.py

# Frontend
npm version 1.14.0-rc.1 --no-git-tag-version --prefix frontend

# Docker Compose Staging
# Mettre à jour manuellement les tags d'images
```

---

## 🔄 **Cycle de Vie des Versions**

### Phase 1 : Développement Local
```
Version: X.Y.Z-rc.1
Environment: DEV
Affichage: X.Y.Z-rc.1 (complet)
```

### Phase 2 : Staging/Intégration
```
Version: X.Y.Z-rc.n (incrémenté à chaque fix)
Environment: STAGING
Affichage: X.Y.Z-rc.n (complet)
```

### Phase 3 : Production
```
Version: X.Y.Z (sans RC)
Environment: PROD
Affichage: X.Y.Z (version de base)
```

### Diagramme de Flux
```
Développement          Staging              Production
    │                     │                     │
    ▼                     ▼                     ▼
1.13.0-rc.1  ───►  1.13.0-rc.1  ───►     1.13.0
    │                     │                     │
    ▼                     ▼                     │
1.13.0-rc.2  ───►  1.13.0-rc.2           (stable)
    │                     │
    ▼                     ▼
   ...              Validation OK ─────────────►
```

---

## 🐳 **Configuration Docker**

### docker-compose.staging.yml
```yaml
services:
  backend:
    image: ansible-builder-backend:1.13.0-rc.2
    environment:
      - ENVIRONMENT=STAGING  # Important: définit l'environnement

  frontend:
    image: ansible-builder-frontend:1.13.0-rc.2-vite
```

### Kubernetes (custom-values.yaml) - Production
```yaml
backend:
  image:
    tag: "1.13.0"  # Sans RC en production
  env:
    ENVIRONMENT: "PROD"

frontend:
  image:
    tag: "1.13.0"
```

---

## 🧪 **Vérification des Versions**

### Backend
```bash
# Vérifier la version et l'environnement
curl http://localhost:8000/api/version | jq

# Résultat attendu (STAGING)
{
  "version": "1.13.0-rc.2",
  "environment": "STAGING",
  "is_rc": true
}
```

### Frontend (Console Browser)
```javascript
// Log automatique dans AppHeader.tsx
📦 Version Debug: {
  packageJsonVersion: "1.13.0-rc.2",
  backendEnv: "STAGING",
  isProduction: false,
  frontendVersion: "1.13.0-rc.2"
}
```

### Checklist de Validation
- [ ] Backend `/api/version` retourne la bonne version
- [ ] Backend `environment` correspond à l'environnement réel
- [ ] Frontend affiche la version avec/sans RC selon l'environnement
- [ ] Dialog About affiche les informations cohérentes
- [ ] `is_rc` est `true` en STAGING/DEV, `false` en PROD

---

## ⚠️ **Points d'Attention**

### Erreurs Courantes

| Problème | Cause | Solution |
|----------|-------|----------|
| Version sans RC en staging | `ENVIRONMENT` non défini | Ajouter `ENVIRONMENT=STAGING` dans docker-compose |
| Frontend montre ancienne version | Cache navigateur | Hard refresh (Ctrl+F5) |
| Version différente F/B | Fichiers non synchronisés | Mettre à jour package.json ET version.py |
| RC visible en production | `ENVIRONMENT` mal configuré | Vérifier que `ENVIRONMENT=PROD` en production |

### Bonnes Pratiques
1. **Toujours synchroniser** `version.py` et `package.json`
2. **Rebuild sans cache** après modification de version : `docker build --no-cache`
3. **Vérifier l'environnement** avant déploiement
4. **Incrémenter RC** à chaque fix en staging (rc.1 → rc.2 → rc.3)
5. **Supprimer RC** uniquement lors du passage en production

---

*Dernière mise à jour : 2025-12-22*
*Voir aussi : [Process Développement](DEVELOPMENT_PROCESS.md) | [Guide Déploiement](../operations/DEPLOYMENT_GUIDE.md)*
