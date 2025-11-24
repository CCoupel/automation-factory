# Guide de Publication du Helm Chart

Ce document explique comment publier le Helm chart Ansible Builder sur GitHub Container Registry (GHCR).

## 🚀 Méthodes de Publication

### Méthode 1: GitHub Actions (Recommandé) ⭐

**Configuration automatique via CI/CD**

Le workflow GitHub Actions publiera automatiquement le chart sur GHCR lors de:
- Push d'un tag version (ex: `v1.1.0`)
- Push vers la branche `master`
- Déclenchement manuel via l'interface GitHub

**Aucune configuration requise!** Le workflow utilise le token `GITHUB_TOKEN` automatiquement fourni par GitHub Actions.

#### Publier une nouvelle version:

```bash
# 1. Mettre à jour la version dans Chart.yaml
# helm/ansible-builder/Chart.yaml: version: 1.2.0

# 2. Commit et push
git add helm/ansible-builder/Chart.yaml
git commit -m "chore: bump chart version to 1.2.0"
git push

# 3. Créer et pousser un tag
git tag v1.2.0
git push origin v1.2.0
```

Le workflow GitHub Actions s'exécutera automatiquement et publiera sur GHCR! ✅

#### Publier manuellement via GitHub Actions:

1. Aller sur https://github.com/ccoupel/ansible_builder/actions
2. Sélectionner "Publish Helm Chart to GHCR"
3. Cliquer "Run workflow"
4. Sélectionner la branche et cliquer "Run workflow"

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

### Pour publication manuelle (Méthodes 2 et 3):

1. Aller sur https://github.com/settings/tokens
2. Cliquer "Generate new token" > "Generate new token (classic)"
3. Donner un nom: "Helm Chart Publisher"
4. Sélectionner les scopes:
   - ✅ `write:packages` (Upload packages to GitHub Package Registry)
   - ✅ `read:packages` (Download packages from GitHub Package Registry)
5. Cliquer "Generate token"
6. **Copier le token immédiatement** (il ne sera plus visible après)

### Pour GitHub Actions (Méthode 1):

**Aucun token nécessaire!** GitHub Actions utilise automatiquement `GITHUB_TOKEN`.

---

## 📊 Vérifier la Publication

### Via GitHub:

1. Aller sur https://github.com/ccoupel?tab=packages
2. Chercher "ansible-builder"
3. Vérifier la version publiée

### Via CLI:

```bash
# Voir les métadonnées du chart
helm show chart oci://ghcr.io/ccoupel/ansible-builder

# Tester l'installation
helm install test-ansible-builder oci://ghcr.io/ccoupel/ansible-builder \
  --namespace test \
  --create-namespace \
  --dry-run
```

---

## 🔄 Workflow de Release Complet

### Release Standard:

```bash
# 1. Mettre à jour la version dans Chart.yaml
vim helm/ansible-builder/Chart.yaml
# Changer: version: 1.2.0

# 2. Mettre à jour CHANGELOG (si applicable)
vim CHANGELOG.md

# 3. Commit les changements
git add helm/ansible-builder/Chart.yaml CHANGELOG.md
git commit -m "chore: release helm chart v1.2.0"

# 4. Créer un tag
git tag -a v1.2.0 -m "Release v1.2.0"

# 5. Push vers Bitbucket (code source)
git push origin master
git push origin v1.2.0

# 6. Push vers GitHub (déclenchera le workflow de publication)
git push github master
git push github v1.2.0
```

Le workflow GitHub Actions publiera automatiquement sur GHCR! 🚀

---

## 🛠️ Troubleshooting

### Erreur: "helm: command not found"

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

### GitHub Actions Workflow échoue

**Vérifier:**
1. Les permissions du workflow (Settings > Actions > General > Workflow permissions)
2. Doit être "Read and write permissions"
3. Le token `GITHUB_TOKEN` doit avoir le scope `packages: write`

---

## 📚 Références

- [Helm OCI Support](https://helm.sh/docs/topics/registries/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Helm Documentation](https://helm.sh/docs/)

---

## 💡 Conseils

1. **Utilisez GitHub Actions (Méthode 1)** pour publication automatique et zéro configuration
2. **Versionnez avec semver**: `v1.0.0`, `v1.1.0`, `v2.0.0`
3. **Testez localement** avant de publier: `helm install --dry-run`
4. **Documentez les changements** dans CHANGELOG.md
5. **Gardez le repository Git et le registry synchronisés**
