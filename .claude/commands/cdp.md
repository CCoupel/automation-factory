# Commande /cdp - Contrôle Direct de l'Orchestrateur

$ARGUMENTS

## Instructions
Si la team `Team-AF` n'est pas active : `TeamCreate` `Team-AF` + spawner `cdp` (`"Lis .claude/agents/cdp.md et applique ces instructions. Spawn les agents nécessaires selon la demande entrante."`)

Envoie un message direct au CDP de la team `Team-AF` :

```
SendMessage type "message" recipient "cdp" :
"$ARGUMENTS"
```

Relayer la réponse du CDP à l'utilisateur.

## Usage
Utiliser pour :
- Donner une instruction directe au CDP sans passer par un workflow
- Demander un état de la team (TaskList)
- Débloquer une situation en cours
- Réorienter les priorités en cours de session
