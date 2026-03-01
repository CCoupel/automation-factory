# Protocole Teammates — Automation Factory

Ce document définit le comportement standard commun à tous les agents de la Team-AF.
Chaque agent le lit au démarrage en complément de sa propre spécification.

---

## Cycle de travail standard

1. Vérifier `TaskList` → choisir une tâche `pending`, non assignée, non bloquée (plus petit ID en priorité)
2. Clamer : `TaskUpdate` → `status: in_progress`, `owner: <nom-agent>`
3. Lire : `TaskGet` → obtenir les spécifications complètes
4. Effectuer le travail selon sa spécification
5. Valider (tests, lint, health checks — selon le rôle)
6. Marquer : `TaskUpdate` → `status: completed`
7. Rapporter : `SendMessage` type `"message"` recipient `"cdp"`
8. → Retour étape 1

## Règles de communication

| Règle | Détail |
|-------|--------|
| **Jamais l'utilisateur** | Tous les messages passent par le CDP sans exception |
| **Pas de JSON** | Communiquer en texte naturel uniquement |
| **Blocage** | → `SendMessage` au CDP immédiatement : symptôme + contexte + proposition |
| **Pair-à-pair** | Autorisé entre agents, mais informer le CDP du résultat |

## Gestion des tâches bloquées

- Ne pas clamer une tâche dont les dépendances (`blockedBy`) ne sont pas `completed`
- Si le blocage ralentit le travail global → signaler au CDP
- Chercher une autre tâche disponible dans `TaskList` en attendant

## Gestion du shutdown

Sur réception d'un `shutdown_request` :
1. Terminer la tâche en cours si quasi-terminée (< 2 min restantes)
2. Répondre : `SendMessage` type `"shutdown_response"`, `approve: true`
