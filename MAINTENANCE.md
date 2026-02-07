# Marketing Site Maintenance Guide

Ce document décrit les étapes pour maintenir le site marketing lors de nouvelles versions.

## Fichiers à Modifier

| Fichier | Contenu |
|---------|---------|
| `translations.js` | Traductions FR/EN (hero badge, version features, détails popup) |
| `index.html` | Structure HTML des versions, fallback texte |

---

## Checklist Nouvelle Version

### 1. Mettre à jour le Hero Badge (en-tête)

**Fichier:** `translations.js`

Modifier `hero.badge` dans les deux sections (FR ligne ~18, EN ligne ~346):

```javascript
// Section FR
'hero.badge': 'Version X.Y.Z - Nom Feature',

// Section EN
'hero.badge': 'Version X.Y.Z - Feature Name',
```

**Fichier:** `index.html` (fallback, ligne ~70)

```html
<span data-i18n="hero.badge">Version X.Y.Z - Feature Name</span>
```

---

### 2. Ajouter la Version dans le Changelog

**Fichier:** `index.html`

Ajouter un nouveau bloc `timeline-item` AVANT les versions existantes (section `#versions`, ligne ~605):

```html
<!-- vX.Y.Z -->
<div class="timeline-item current">
    <div class="timeline-marker">
        <span class="marker-dot"></span>
    </div>
    <div class="timeline-content">
        <div class="version-header">
            <span class="version-badge">vX.Y.Z</span>
            <span class="version-date" data-i18n="versions.vXYZ.date">Mois 2026</span>
            <span class="version-tag current-tag" data-i18n="versions.current">Actuelle</span>
        </div>
        <h3 data-i18n="versions.vXYZ.title">Titre Feature</h3>
        <ul class="version-features">
            <li class="feat-TYPE" data-i18n-detail="versions.vXYZ.f1.detail">
                <svg>...</svg>
                <span data-i18n="versions.vXYZ.f1">Feature 1</span>
            </li>
            <!-- Répéter pour chaque feature -->
        </ul>
    </div>
</div>
```

**Important:**
- Remplacer `vXYZ` par le numéro de version sans points (ex: `v221` pour v2.2.1)
- Classe `current` uniquement sur la version actuelle
- Retirer `current` et `current-tag` de l'ancienne version

**Types de features (class `feat-TYPE`):**
- `feat-api` - API/Cloud (bleu)
- `feat-frontend` - Frontend (violet)
- `feat-backend` - Backend (vert)
- `feat-security` - Sécurité (orange)
- `feat-perf` - Performance (jaune)
- `feat-collab` - Collaboration (rose)

---

### 3. Ajouter les Traductions

**Fichier:** `translations.js`

Ajouter dans la section FR (après les autres versions, avant `roadmap`):

```javascript
// Version X.Y.Z
'versions.vXYZ.date': 'Mois 2026',
'versions.vXYZ.title': 'Titre en Français',
'versions.vXYZ.f1': 'Feature 1',
'versions.vXYZ.f1.detail': 'Description détaillée de la feature 1 pour le popup',
'versions.vXYZ.f2': 'Feature 2',
'versions.vXYZ.f2.detail': 'Description détaillée de la feature 2 pour le popup',
// etc.
```

Ajouter les mêmes clés dans la section EN avec les traductions anglaises.

---

### 4. Commit et Push

```bash
cd marketing

# Vérifier les changements
git status
git diff

# Commit
git add .
git commit -m "feat: Add version X.Y.Z to marketing site"

# Push vers Bitbucket Pages
git push origin main
```

---

### 5. Mettre à jour le Submodule (repo principal)

```bash
cd ..  # Retour au repo principal

# Mettre à jour la référence du submodule
git add marketing
git commit -m "chore: Update marketing submodule to vX.Y.Z"
git push ccoupel master
```

---

## Structure des Traductions pour Popups

Chaque feature DOIT avoir:
1. **Clé courte** (`versions.vXYZ.fN`) - Affichée dans la liste
2. **Clé détail** (`versions.vXYZ.fN.detail`) - Affichée dans le popup au clic

Le popup s'affiche automatiquement si:
- L'élément `<li>` a l'attribut `data-i18n-detail="versions.vXYZ.fN.detail"`
- La clé existe dans `translations.js`

---

## Exemple Complet: Ajout v2.2.1

### index.html
```html
<li class="feat-frontend" data-i18n-detail="versions.v221.f1.detail">
    <svg viewBox="0 0 24 24">...</svg>
    <span data-i18n="versions.v221.f1">3-state theme</span>
</li>
```

### translations.js (FR)
```javascript
'versions.v221.f1': 'Thème 3 états',
'versions.v221.f1.detail': 'Trois modes de thème : Light, Dark et System (suit les préférences OS)',
```

### translations.js (EN)
```javascript
'versions.v221.f1': '3-state theme',
'versions.v221.f1.detail': 'Three theme modes: Light, Dark and System (follows OS preference)',
```

---

## Notes Importantes

1. **Cache CDN**: Après push, attendre 10-15 minutes pour que le cache Bitbucket Pages se rafraîchisse
2. **Test local**: Ouvrir `index.html` directement dans le navigateur pour tester avant push
3. **Vérification**: Après déploiement, tester le clic sur chaque feature pour vérifier les popups

---

*Dernière mise à jour: 2026-01-06*
