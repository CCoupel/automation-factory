# Commande /deploy - Déploiement

$ARGUMENTS

## Points de contrôle obligatoires
- Phase 3 (production) : demander confirmation explicite à l'utilisateur avant de transmettre au CDP

## Instructions
1. Lis `.claude/memory/MEMORY.md`
2. Si Phase 3 : demander confirmation à l'utilisateur avant de continuer
3. SendMessage au CDP : "DEPLOY REQUEST : $ARGUMENTS (Phase 2 staging ou Phase 3 production)"
4. Relaie le rapport de déploiement retourné par le CDP à l'utilisateur
