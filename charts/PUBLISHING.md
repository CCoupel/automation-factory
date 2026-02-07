# Guide de Publication du Helm Chart

Ce document explique comment publier le Helm chart Automation Factory sur GitHub Container Registry (GHCR) depuis Bitbucket.

## 🚀 Méthodes de Publication

### Méthode 1: Bitbucket Pipelines (Recommandé) ⭐

**Configuration automatique via CI/CD Bitbucket**

Le pipeline Bitbucket publiera automatiquement le chart sur GHCR lors de:
- Push d'un tag version (ex: `v1.1.0`)
- Déclenchement manuel via l'interface Bitbucket

#### Configuration Initiale (une seule fois):

1. **Activer Bitbucket Pipelines:**
   - Aller sur https://bitbucket.org/ccoupel/automation_factory/admin/addon/admin/pipelines/settings
   - Activer "Enable Pipelines"

2. **Configurer les variables d'environnement:**
   - Aller sur https://bitbucket.org/ccoupel/automation_factory/admin/addon/admin/pipelines/repository-variables
   - Ajouter deux variables:
     - Name: `GITHUB_USERNAME`, Value: `ccoupel` (non sécurisée)
     - Name: `GITHUB_TOKEN`, Value: `ghp_your_token_here` (✅ **Secured**)

3. **Obtenir un GitHub Personal Access Token:**
   - Aller sur https://github.com/settings/tokens
   - Cliquer "Generate new token" > "Generate new token (classic)"
   - Nom: "Helm Chart Publisher - Bitbucket"
   - Scope requis: ✅ `write:packages`
   - Copier le token et le mettre dans la variable `GITHUB_TOKEN`

#### Publier une nouvelle version:

```bash
# 1. Mettre à jour la version dans Chart.yaml
vim helm/automation-factory/Chart.yaml
# Changer: version: 1.2.0

# 2. Commit les changements
git add helm/automation-factory/Chart.yaml
git commit -m "chore: bump chart version to 1.2.0"
git push origin master

# 3. Créer et pousser un tag
git tag v1.2.0
git push origin v1.2.0
```

Le pipeline Bitbucket s'exécutera **automatiquement** et publiera sur GHCR! ✅

**Suivi de l'exécution:**
- https://bitbucket.org/ccoupel/automation_factory/addon/pipelines/home

#### Publier manuellement via Bitbucket Pipelines:

1. Aller sur https://bitbucket.org/ccoupel/automation_factory/addon/pipelines/home
2. Cliquer "Run pipeline" (en haut à droite)
3. Branch: `master`
4. Pipeline: Sélectionner "Custom: publish-chart"
5. Cliquer "Run"

---

### Méthode 2: Script Local Windows

**Pour publication manuelle depuis Windows**

#### Prérequis:
```powershell
# Installer Helm via Chocolatey
choco install kubernetes-helm

# OU via Scoop
scoop install helm
```

#### Publier:

```bash
# 1. Se connecter à GHCR (une seule fois)
set GITHUB_USERNAME=ccoupel
set GITHUB_TOKEN=ghp_your_token_here
echo %GITHUB_TOKEN% | helm registry login ghcr.io -u %GITHUB_USERNAME% --password-stdin

# 2. Exécuter le script de publication
cd charts
package-oci.bat ghcr.io/ccoupel
```

---

### Méthode 3: Script Local Linux/Mac

**Pour publication manuelle depuis Linux/Mac**

#### Prérequis:
```bash
# Installer Helm
# macOS: brew install helm
# Linux: voir https://helm.sh/docs/intro/install/
```

#### Publier:

```bash
# 1. Se connecter à GHCR (une seule fois)
export GITHUB_USERNAME="ccoupel"
export GITHUB_TOKEN="ghp_your_token_here"
echo $GITHUB_TOKEN | helm registry login ghcr.io -u $GITHUB_USERNAME --password-stdin

# 2. Exécuter le script de publication
cd charts
./package-oci.sh ghcr.io/ccoupel
```

---

## 🔐 Obtenir un GitHub Personal Access Token

### Pour Bitbucket Pipelines (Méthode 1):

1. Aller sur https://github.com/settings/tokens
2. Cliquer "Generate new token" > "Generate new token (classic)"
3. Nom: "Helm Chart Publisher - Bitbucket Pipelines"
4. Sélectionner les scopes:
   - ✅ `write:packages` (Upload packages to GitHub Package Registry)
   - ✅ `read:packages` (Download packages from GitHub Package Registry)
5. Cliquer "Generate token"
6. **Copier le token immédiatement** (format: `ghp_...`)
7. Le configurer dans les variables Bitbucket (voir Configuration Initiale)

### Pour publication manuelle (Méthodes 2 et 3):

Même processus, mais stocker le token localement dans les variables d'environnement.

---

## 📊 Vérifier la Publication

### Via Bitbucket Pipelines:

1. Aller sur https://bitbucket.org/ccoupel/automation_factory/addon/pipelines/home
2. Vérifier que le pipeline s'est exécuté avec succès (✅ vert)
3. Consulter les logs pour voir la confirmation de publication

### Via GitHub Packages:

1. Aller sur https://github.com/ccoupel?tab=packages
2. Chercher "automation-factory"
3. Vérifier la version publiée

### Via CLI:

```bash
# Voir les métadonnées du chart
helm show chart oci://ghcr.io/ccoupel/automation-factory

# Voir toutes les infos
helm show all oci://ghcr.io/ccoupel/automation-factory

# Tester l'installation
helm install test-automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --namespace test \
  --create-namespace \
  --dry-run
```

---

## 🔄 Workflow de Release Complet

### Release Standard:

```bash
# 1. Mettre à jour la version dans Chart.yaml
vim helm/automation-factory/Chart.yaml
# Changer: version: 1.2.0

# 2. Mettre à jour CHANGELOG (si applicable)
vim CHANGELOG.md

# 3. Commit les changements
git add helm/automation-factory/Chart.yaml CHANGELOG.md
git commit -m "chore: release helm chart v1.2.0"

# 4. Créer un tag annoté
git tag -a v1.2.0 -m "Release Helm chart v1.2.0"

# 5. Push vers Bitbucket (déclenchera automatiquement le pipeline)
git push origin master
git push origin v1.2.0
```

Le pipeline Bitbucket publiera automatiquement sur GHCR! 🚀

**Vérifier:**
- Pipeline: https://bitbucket.org/ccoupel/automation_factory/addon/pipelines/home
- Package: https://github.com/ccoupel?tab=packages

---

## 🛠️ Troubleshooting

### Erreur: "helm: command not found" (local)

**Solution:** Installer Helm
- Windows: `choco install kubernetes-helm`
- macOS: `brew install helm`
- Linux: Voir https://helm.sh/docs/intro/install/

### Erreur: "failed to authorize: failed to fetch anonymous token"

**Solution:** Se connecter au registry
```bash
helm registry login ghcr.io -u ccoupel
# Entrer le Personal Access Token
```

### Erreur: "Error: failed to do request: Head... 404 Not Found"

**Causes possibles:**
1. Le package n'existe pas encore sur GHCR (première publication)
2. Le package est privé et nécessite une authentification
3. Le nom du repository est incorrect

**Solution:** Vérifier le nom sur https://github.com/ccoupel?tab=packages

### Bitbucket Pipeline échoue

**Étape 1: Vérifier les logs**
- Aller sur https://bitbucket.org/ccoupel/automation_factory/addon/pipelines/home
- Cliquer sur le pipeline qui a échoué
- Consulter les logs détaillés

**Étape 2: Vérifier la configuration**

1. **Pipelines activées?**
   - Settings > Pipelines > Settings
   - "Enable Pipelines" doit être ON

2. **Variables configurées?**
   - Settings > Pipelines > Repository variables
   - `GITHUB_USERNAME` existe (non sécurisée)
   - `GITHUB_TOKEN` existe (✅ **Secured**)

3. **Token valide?**
   - Le token GitHub doit avoir le scope `write:packages`
   - Le token ne doit pas être expiré
   - Format: `ghp_...` (classic token)

4. **Erreurs courantes:**
   - `401 Unauthorized`: Token invalide ou scope manquant
   - `403 Forbidden`: Token n'a pas les permissions nécessaires
   - `404 Not Found`: Première publication (normal)

**Étape 3: Réexécuter le pipeline**
- Corriger la configuration
- Cliquer "Rerun" sur le pipeline échoué

### Package visible uniquement par moi sur GitHub

**Solution:** Rendre le package public
1. Aller sur https://github.com/users/ccoupel/packages/container/automation-factory
2. Settings > Change visibility
3. Sélectionner "Public"
4. Confirmer

---

## 📚 Références

- [Helm OCI Support](https://helm.sh/docs/topics/registries/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Bitbucket Pipelines](https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/)
- [Helm Documentation](https://helm.sh/docs/)

---

## 💡 Conseils

1. **Utilisez Bitbucket Pipelines (Méthode 1)** pour publication automatique depuis votre repository
2. **Versionnez avec semver**: `v1.0.0`, `v1.1.0`, `v2.0.0`
3. **Testez localement** avant de publier: `helm install --dry-run`
4. **Documentez les changements** dans CHANGELOG.md
5. **Gardez le repository Git et le registry synchronisés**
6. **Rendez le package public** sur GitHub pour que tout le monde puisse l'installer

---

## 🎯 Résumé Rapide

**Pour publier une nouvelle version:**

```bash
# Méthode rapide (3 commandes)
git tag v1.2.0
git push origin v1.2.0
# → Le pipeline s'occupe du reste automatiquement!
```

**Pour installer le chart:**

```bash
helm install automation-factory oci://ghcr.io/ccoupel/automation-factory \
  --namespace automation-factory \
  --create-namespace
```

**C'est tout!** 🎉
