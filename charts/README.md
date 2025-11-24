# Ansible Builder Helm Chart Repository

Ce repository contient les Helm charts packagés pour Ansible Builder.

## Utilisation du Chart Repository

### Ajouter le repository Helm

```bash
# Via Bitbucket (après le push)
helm repo add ansible-builder https://bitbucket.org/ccoupel/ansible_builder/raw/master/charts/

# Mettre à jour les repositories
helm repo update

# Rechercher les charts disponibles
helm search repo ansible-builder
```

### Installer le chart

```bash
# Installation simple
helm install my-ansible-builder ansible-builder/ansible-builder

# Installation avec valeurs personnalisées
helm install my-ansible-builder ansible-builder/ansible-builder \
  --namespace ansible-builder \
  --create-namespace \
  --values my-values.yaml
```

### Lister les versions disponibles

```bash
helm search repo ansible-builder/ansible-builder --versions
```

## Packager le Chart (Pour les développeurs)

Si vous avez des modifications locales à packager:

```bash
# 1. Se placer dans le dossier helm
cd helm/ansible-builder

# 2. Mettre à jour les dépendances
helm dependency update

# 3. Packager le chart
helm package . --destination ../../charts/

# 4. Créer/mettre à jour l'index
helm repo index ../../charts/ --url https://bitbucket.org/ccoupel/ansible_builder/raw/master/charts/

# 5. Commit et push
cd ../../
git add charts/
git commit -m "chore: update helm chart package"
git push
```

## Structure du Repository

```
charts/
├── README.md                    # Ce fichier
├── index.yaml                   # Index du repository Helm
├── ansible-builder-1.1.0.tgz    # Chart packagé v1.1.0
└── package.sh                   # Script de packaging
```

## Versions disponibles

| Version | Date | Description |
|---------|------|-------------|
| 1.1.0 | 2025-11-23 | Version initiale avec persistence et auth |

## Support

Pour toute question ou problème:
- Issues: https://bitbucket.org/ccoupel/ansible_builder/issues
- Documentation: https://bitbucket.org/ccoupel/ansible_builder
