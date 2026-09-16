# Adaptations projet — Automation Factory

> Complète `marketing-release.template.md` (générique, orienté binaire téléchargeable avec
> `config.yml`) — Automation Factory est une application web hébergée, pas un binaire distribué,
> et le site marketing est un site statique, pas un site généré depuis un `config.yml`.
> Section "Comment mettre à jour" du template : **non applicable telle quelle**, remplacer par
> "l'application est mise à jour automatiquement en production, aucune action utilisateur".

## Contexte projet
Automation Factory est un constructeur visuel de playbooks Ansible, pour ingénieurs DevOps et
administrateurs systèmes. Cible : équipes infrastructure/DevOps utilisant Ansible.

## Site marketing (statique, gh-pages)
- **URL** : https://ccoupel.bitbucket.io
- **Hébergement** : branche `gh-pages` du repo GitHub `CCoupel/automation-factory`, disponible
  en worktree local dans `MARKETING/`
- **Pages** : `MARKETING/index.html` (accueil, section "Latest Version"), `MARKETING/features.html`,
  `MARKETING/releases.html`
- **Workflow git** :
  ```bash
  cd MARKETING && git add . && git commit -m "release: vX.Y.Z" && git push origin gh-pages
  ```
  Ne JAMAIS faire `git checkout` depuis le repo principal pour ce worktree — toujours `cd MARKETING`.

> ⚠️ **Le worktree `MARKETING/` est actuellement CASSÉ depuis WSL, pas juste `prunable`.**
> `MARKETING/.git` et `.git/worktrees/MARKETING/gitdir` contiennent tous les deux un chemin
> Windows (`C:/Users/cyril/...`) que WSL ne résout pas — toute commande `git` lancée depuis
> `MARKETING/` échoue immédiatement avec `fatal: not a git repository`. Le workflow ci-dessus
> ne fonctionnera pas tel quel dans une session Claude Code WSL tant que ces deux fichiers ne
> sont pas réécrits en chemin WSL (`/mnt/c/Users/cyril/Documents/VScode/GITHUB/Automation-Factory/...`).
> Ne pas corriger silencieusement — signaler à l'utilisateur avant toute tentative de commit
> marketing, c'est une décision qui touche l'état git réel, pas une adaptation de contenu.

## URL production
https://coupel.net/automation-factory — CTA de tous les posts/newsletters.

## Mise à jour obligatoire à chaque release (structure vérifiée sur `MARKETING/`)
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

## Source du contenu de release
`docs/releases/vX.Y.Z/release-notes.md` — texte déjà rédigé pour un public externe (contexte,
corrections en langage clair), confirmé existant pour v2.3.6 et v2.4.3. C'est cette source qui
doit nourrir le contenu marketing (hero badge, timeline, traductions) — **pas** `CHANGELOG.md`
(technique, format Keep-a-Changelog) ni `docs/work/DONE.md` (historique interne), qui sont
d'un niveau de détail inadapté à un site public. Si `docs/releases/vX.Y.Z/` n'existe pas pour
la version en cours, le demander à `doc-updater` avant de rédiger le contenu marketing.

## Ton et audience
- Langue : français en priorité, anglais pour hashtags/posts internationaux
- Audience : ingénieurs DevOps, sysadmins, équipes infra utilisant Ansible
- Value props clés : playbook builder visuel, drag & drop, import/export YAML, collaboration
  multi-utilisateur, intégration Galaxy
- Ton : professionnel, pragmatique, orienté communauté DevOps — pas un ton "jeu vidéo"
- Hashtags : #AutomationFactory #Ansible #DevOps #IaC
