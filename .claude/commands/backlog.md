# Commande /backlog - Gestion du Backlog

$ARGUMENTS

## Source de vérité
Le backlog est géré via **GitHub Issues** : https://github.com/CCoupel/automation-factory/issues

Le token GitHub est dans `github_token.txt` (ou dans la variable d'environnement `GITHUB_TOKEN`).

---

## Instructions

### Si $ARGUMENTS est vide — Afficher le backlog
Interroger l'API GitHub pour lister les issues ouvertes, puis les afficher groupées par milestone/label de version :

```bash
curl -s -H "Authorization: token $(cat github_token.txt)" \
  "https://api.github.com/repos/CCoupel/automation-factory/issues?state=open&per_page=100" \
  | python3 -c "
import sys, json
issues = json.load(sys.stdin)
# Grouper par label de version
by_version = {}
no_version = []
for i in issues:
    if i.get('pull_request'):
        continue
    labels = [l['name'] for l in i.get('labels', [])]
    version = next((l for l in labels if l.startswith('v')), None)
    if version:
        by_version.setdefault(version, []).append(i)
    else:
        no_version.append(i)
for v in sorted(by_version.keys()):
    print(f'\n### {v}')
    for i in by_version[v]:
        labels = [l['name'] for l in i['labels'] if not l['name'].startswith('v')]
        print(f'  #{i[\"number\"]} {i[\"title\"]} [{', '.join(labels)}]')
if no_version:
    print('\n### Sans version')
    for i in no_version:
        labels = [l['name'] for l in i['labels']]
        print(f'  #{i[\"number\"]} {i[\"title\"]} [{', '.join(labels)}]')
"
```

Afficher le résultat à l'utilisateur de façon lisible.

### Si $ARGUMENTS contient un item — Ajouter une issue GitHub
Créer une nouvelle issue via l'API GitHub :

```bash
curl -s -X POST \
  -H "Authorization: token $(cat github_token.txt)" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/CCoupel/automation-factory/issues \
  -d '{
    "title": "<titre>",
    "body": "<description>",
    "labels": ["feature", "priority: medium"]
  }'
```

Adapter le titre, la description et les labels selon le contexte de $ARGUMENTS.
Confirmer à l'utilisateur le numéro et l'URL de l'issue créée.

---

## Labels disponibles
- **Priorité** : `priority: high`, `priority: medium`, `priority: low`
- **Type** : `feature`, `enhancement`, `technical-debt`, `bug`
- **Version** : `v2.4.0`, `v2.5.x`, `v2.6.x`, `v2.7.x`, `v2.8.x`, `v3.0+`
- **Catégorie** : `galaxy`, `collaboration`, `import-export`, `security`, `inventory`, `notifications`, `git-integration`, `marketing`, `testing`, `devops`, `ux-ui`, `ai-ml`, `performance`, `backend`, `frontend`, `architecture`
