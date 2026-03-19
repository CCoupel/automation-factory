# Commande /marketing - Communication de Release

Lance le sous-agent MARKETING pour créer les contenus de communication d'une nouvelle version.

## Argument reçu (optionnel)

$ARGUMENTS

## Mot-clé help

`/marketing help` → Affiche :

```
## /marketing - Aide

**Description** : Créer les contenus de communication d'une release Automation Factory

**Usage** :
  /marketing help                          Afficher cette aide
  /marketing                               Auto-détecte la version courante
  /marketing 2.3.6                         Version spécifique
  /marketing 2.3.6 PROD                    Version + environnement
  /marketing "YAML parser import"          Focus sur une feature

**Livrables** : Release notes, posts réseaux sociaux, contenu site marketing, newsletter (major)
```

**Formats possibles** :
- `/marketing` : Auto-détecte la version actuelle depuis `backend/app/version.py`
- `/marketing 2.3.6` : Version spécifique
- `/marketing 2.3.6 PROD` : Version + environnement
- `/marketing "YAML parser import"` : Focus sur une feature

## Action immédiate

**Détecter le mode** — Lire la config team active :
- **Team-AF active** : transmettre au CDP existant via SendMessage
- **Pas de team active** : spawner l'agent `marketing-release` directement

### Mode TEAM (Team-AF active)
```
SendMessage(
  type: "message",
  recipient: "cdp",
  content: "MARKETING REQUEST: $ARGUMENTS",
  summary: "Marketing release: $ARGUMENTS"
)
```

### Sans TEAM
Spawner directement :
```
subagent_type: "marketing-release"
description: "Communication marketing release"
prompt: "Lis .claude/agents/TEAMMATES_PROTOCOL.md puis .claude/agents/marketing-release.md, et applique ces instructions. Demande de communication marketing : $ARGUMENTS"
```
