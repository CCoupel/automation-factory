# Adaptations projet — Automation Factory

> Complète `marketing-release.template.md` (générique, orienté binaire téléchargeable avec
> `config.yml`) — Automation Factory est une application web hébergée, pas un binaire distribué,
> et le site marketing est un site statique, pas un site généré depuis un `config.yml`.
> Dérogation projet : section "Comment mettre à jour" et section Déploiement binaires/`config.yml`
> du template **non applicables telles quelles**, remplacer par
> "l'application est mise à jour automatiquement en production, aucune action utilisateur".

## Contexte projet
Automation Factory est un constructeur visuel de playbooks Ansible, pour ingénieurs DevOps et
administrateurs systèmes. Cible : équipes infrastructure/DevOps utilisant Ansible.

## Site marketing (statique, gh-pages)
- **URL** : https://ccoupel.github.io/automation-factory/ (GitHub Pages, branche `gh-pages` — ccoupel.bitbucket.io abandonné)
- **Hébergement** : branche `gh-pages` du repo GitHub `CCoupel/automation-factory`, disponible
  en worktree local dans `MARKETING/`
- **Pages** : `MARKETING/index.html` (accueil, section "Latest Version"), `MARKETING/features.html`,
  `MARKETING/releases.html`
- **Workflow git** : celui du template (PREPARE sans commit ; PUBLISH après GATE 4d :
  `git -C MARKETING … commit -m "docs(site): vX.Y.Z"` puis push de `gh-pages` ; release notes
  commitées séparément sur la branche de code).

> ⚠️ **Le worktree `MARKETING/` est actuellement CASSÉ.** `MARKETING/` est un dossier simple
> (non vide) sans `.git` ; le worktree `gh-pages` reste enregistré `prunable` à l'ancien chemin
> Windows `C:/Users/cyril/Documents/VScode/GITHUB/Automation-Factory/MARKETING` (le repo est
> désormais sous `/mnt/c/Users/cyril/Documents/PROJETS/OTHER/Automation-Factory`). La recréation
> automatique du template (`git worktree add MARKETING gh-pages`) échouerait sur ce dossier non vide.
> Dérogation projet : ne pas corriger silencieusement — `BLOQUE` et signaler à l'utilisateur avant
> toute tentative de commit marketing, c'est une décision qui touche l'état git réel.

## URL production
https://coupel.net/automation-factory — CTA de tous les posts/newsletters.

## Mise à jour obligatoire à chaque release (structure vérifiée sur `MARKETING/`)
> Dérogation projet : site existant (`translations.js`, `hero.badge`, timeline) — le système du
> template (`assets/lang.js`, `locales/{fr,en}.json`, badges `data-badge-version`/`badges.js`) ne
> s'applique pas.
- **Hero badge** : clé `hero.badge` dans `MARKETING/translations.js` (FR et EN, deux occurrences
  distinctes) + fallback dans `MARKETING/index.html` (`<span data-i18n="hero.badge">`). Format :
  `'hero.badge': 'Version X.Y.Z — Nom Feature'`.
- **Timeline versions** (`MARKETING/index.html`) : ajouter une entrée `timeline-item current` en
  tête, retirer la classe/le tag `current` de l'entrée précédente. Chaque feature listée est un
  `<li class="feat-TYPE" data-i18n-detail="versions.vXYZ.fN.detail">` — `data-i18n-detail` est
  **obligatoire** (alimente le popup au clic). Classes `feat-TYPE` disponibles : `feat-api`,
  `feat-frontend`, `feat-backend`, `feat-security`, `feat-perf`, `feat-collab`.
- **Traductions** (`MARKETING/translations.js`) : ajouter `versions.vXYZ.date/title/fN/fN.detail`
  en FR et EN pour chaque feature listée dans la timeline.
- Vérifier après publication que les popups s'affichent au clic (attribut `data-i18n-detail`).

## Release notes publiques
Sources : celles du template (milestone GitHub + `CHANGELOG.md`). `docs/releases/vX.Y.Z/release-notes.md`
est une **sortie** de marketing-release (exemples existants : v2.3.6, v2.4.3), pas une entrée à
demander à `doc-updater`. `docs/work/DONE.md` (historique interne) n'est pas une source.

## Ton et audience
- Langue : français en priorité, anglais pour hashtags/posts internationaux
- Audience : ingénieurs DevOps, sysadmins, équipes infra utilisant Ansible
- Value props clés : playbook builder visuel, drag & drop, import/export YAML, collaboration
  multi-utilisateur, intégration Galaxy
- Ton : professionnel, pragmatique, orienté communauté DevOps — pas un ton "jeu vidéo"
- Hashtags : #AutomationFactory #Ansible #DevOps #IaC
