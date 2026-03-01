# Commande /backlog - Gestion du Backlog

$ARGUMENTS

## Instructions
Traiter directement (sans agent) :

### Si $ARGUMENTS est vide — Afficher le backlog
Lire `docs/work/BACKLOG.md` et l'afficher à l'utilisateur de façon structurée :
- Features prévues par priorité
- Bugs connus
- Dette technique

### Si $ARGUMENTS contient un item — Ajouter au backlog
Lire `docs/work/BACKLOG.md`, ajouter l'item dans la section appropriée, sauvegarder.
Confirmer l'ajout à l'utilisateur.

### Format d'ajout
```markdown
- [ ] <description> _(ajouté le YYYY-MM-DD)_
```

## Fichier cible
`docs/work/BACKLOG.md`
