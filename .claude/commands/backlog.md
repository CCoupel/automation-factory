# Commande /backlog - Gestion du Backlog

$ARGUMENTS

## Instructions
Traiter directement (sans agent) :

> **⚠️ BACKLOG MIGRÉ** : Le backlog est géré via **GitHub Issues**.
> URL : https://github.com/CCoupel/automation-factory/issues

### Si $ARGUMENTS est vide — Afficher le backlog
Afficher à l'utilisateur le résumé suivant :

```
📋 Backlog → GitHub Issues
https://github.com/CCoupel/automation-factory/issues

Issues par milestone :
- v2.4.0 Event Sourcing   : #20
- v2.1.x Collaboration    : #24, #25
- v2.2.x Import/Export    : #26-#34
- v2.3.x Sécurité         : #35-#37
- v2.5.x Annotations/Inv. : #38-#42
- v2.6.x Notifications    : #43, #44
- v2.7.x Git Integration  : #45-#47
- v2.8.x Marketing        : #48-#50
- Tests & Tech             : #51-#68
- v3.0+ Long terme         : #69-#72

🔥 Next priority : #20 Event Sourcing v2.4.0
```

Pour afficher le détail d'une issue spécifique, utiliser l'API GitHub :
```bash
curl -s -H "Authorization: token <TOKEN>" \
  https://api.github.com/repos/CCoupel/automation-factory/issues/<NUMBER>
```

### Si $ARGUMENTS contient un item — Ajouter au backlog GitHub
Créer une issue GitHub via l'API avec les informations fournies.

**Paramètres API :**
```
POST https://api.github.com/repos/CCoupel/automation-factory/issues
{
  "title": "<titre de l'item>",
  "body": "<description détaillée>",
  "labels": ["feature", "priority: medium"]  // adapter selon le contexte
}
```

Confirmer à l'utilisateur le numéro et l'URL de l'issue créée.

### Labels disponibles
- Priorité : `priority: high`, `priority: medium`, `priority: low`
- Type : `feature`, `enhancement`, `technical-debt`, `bug`
- Version : `v2.4.0`, `v2.5.x`, `v2.6.x`, `v2.7.x`, `v2.8.x`, `v3.0+`
- Catégorie : `galaxy`, `collaboration`, `import-export`, `security`, `inventory`, `notifications`, `git-integration`, `marketing`, `testing`, `devops`, `ux-ui`, `ai-ml`, `performance`, `backend`, `frontend`, `architecture`

## Référence
`docs/work/BACKLOG.md` — Index de référence vers les issues GitHub
