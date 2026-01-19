# Spécification Event Sourcing - Ansible Builder

> **Version cible :** 2.4.0
> **Statut :** Planifié
> **Dernière mise à jour :** 2026-01-19

---

## 📋 **Résumé**

Refonte de l'architecture collaborative pour passer d'un modèle "Optimistic UI + Sync sélectif" à un modèle **Event Sourcing** où le backend est l'autorité unique.

### Principes fondamentaux

| Principe | Description |
|----------|-------------|
| **Client = demandeur** | Le client envoie une intention d'action, jamais de modification locale avant réponse |
| **Backend = autorité** | Seul le backend valide, persiste et diffuse les actions |
| **Broadcast total** | Tous les clients reçoivent tous les événements (y compris l'émetteur) |
| **Journal = source de vérité** | L'état du playbook = replay de tous les événements |
| **Timeline** | Rattrapage automatique si client en retard (sequence number) |

---

## 🏗️ **Architecture**

### Flux de données

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Client A   │         │    Backend   │         │   Client B   │
│              │         │              │         │              │
│  1. Action   │────────▶│  2. Validate │         │              │
│     (drop)   │   WS    │     + Log    │         │              │
│              │         │              │         │              │
│              │         │  3. Broadcast│────────▶│              │
│              │◀────────│     à TOUS   │         │              │
│              │         │              │         │              │
│  4. Apply    │         │              │         │  4. Apply    │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Composants

#### Frontend

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Action    │───▶│  Dispatcher │───▶│   Reducer   │     │
│  │  (onClick)  │    │  (central)  │    │   (apply)   │     │
│  └─────────────┘    └──────┬──────┘    └─────────────┘     │
│                            │                                │
│                            ▼ WebSocket                      │
└────────────────────────────┼────────────────────────────────┘
                             │
```

- **Dispatcher** : Point d'entrée unique pour toutes les actions
- **WebSocket** : Connexion bidirectionnelle avec le backend
- **Reducer** : Application des événements reçus à l'état local

#### Backend

```
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Events    │◀───│   Handler   │───▶│  Broadcast  │     │
│  │   Store     │    │  (persist)  │    │  (WebSocket)│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Handler** : Validation et traitement des événements
- **Events Store** : Persistance du journal des événements
- **Broadcast** : Diffusion aux clients connectés

---

## 📦 **Modèle de données**

### Table `playbook_events`

```sql
CREATE TABLE playbook_events (
    id SERIAL PRIMARY KEY,
    playbook_id INTEGER NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,  -- Numéro séquentiel par playbook
    event_type VARCHAR(50) NOT NULL,   -- Type d'événement
    event_data JSONB NOT NULL,         -- Données de l'événement
    user_id INTEGER NOT NULL REFERENCES users(id),
    username VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(playbook_id, sequence_number)
);

CREATE INDEX idx_playbook_events_playbook_seq
    ON playbook_events(playbook_id, sequence_number);
```

### Structure d'un événement

```typescript
interface PlaybookEvent {
  id: number
  playbook_id: number
  sequence_number: number
  event_type: EventType
  event_data: EventData
  user_id: number
  username: string
  created_at: string
}

type EventType =
  // Modules
  | 'module_add'
  | 'module_move'
  | 'module_delete'
  | 'module_config'
  | 'module_resize'
  // Links
  | 'link_add'
  | 'link_delete'
  // Play
  | 'play_add'
  | 'play_delete'
  | 'play_update'
  // Variables
  | 'variable_add'
  | 'variable_update'
  | 'variable_delete'
  // Roles
  | 'role_add'
  | 'role_delete'
  | 'role_update'
  // Blocks
  | 'block_collapse'
  // Playbook
  | 'playbook_rename'
```

---

## 🔄 **Protocole WebSocket**

### Messages Client → Backend

```typescript
// Demande d'action
{
  type: 'action',
  event_type: 'module_add',
  data: {
    moduleId: 'uuid',
    module: { ... },
    position: { x: 100, y: 200 }
  }
}

// Demande de synchronisation (rattrapage)
{
  type: 'sync',
  last_sequence: 42  // Dernier événement connu
}
```

### Messages Backend → Client

```typescript
// Événement validé et persisté
{
  type: 'event',
  sequence_number: 43,
  event_type: 'module_add',
  data: { ... },
  user_id: 1,
  username: 'alice',
  timestamp: '2026-01-19T12:00:00Z'
}

// Batch de synchronisation (rattrapage)
{
  type: 'sync_batch',
  events: [ ... ],  // Liste d'événements manqués
  current_sequence: 50
}

// Erreur (action rejetée)
{
  type: 'error',
  message: 'Invalid action',
  original_action: { ... }
}
```

---

## 🚀 **Fonctionnalités natives**

### 1. Sauvegarde automatique

Plus besoin de bouton "Save" - chaque action est immédiatement persistée.

### 2. Undo/Redo

```typescript
// Frontend maintient un pointeur dans la timeline
interface UndoState {
  currentSequence: number
  maxSequence: number
}

// Undo = demander au backend de créer un événement inverse
{
  type: 'action',
  event_type: 'undo',
  data: { target_sequence: 42 }
}

// Le backend génère l'événement inverse approprié
```

### 3. Time Travel

```typescript
// Demander l'état à un instant T
{
  type: 'time_travel',
  target_sequence: 30
}

// Le backend renvoie l'état reconstruit
{
  type: 'snapshot',
  sequence_number: 30,
  state: { ... }  // État complet du playbook
}
```

### 4. Audit Trail

Le journal des événements fournit naturellement :
- Qui a fait quoi
- Quand
- Historique complet des modifications

### 5. Rattrapage automatique

Si un client se reconnecte ou est en retard :

```typescript
// Client envoie son dernier sequence connu
{ type: 'sync', last_sequence: 40 }

// Backend renvoie les événements manqués
{
  type: 'sync_batch',
  events: [event_41, event_42, event_43, ...],
  current_sequence: 50
}
```

---

## 📐 **Plan d'implémentation**

### Phase 1 : Infrastructure Backend (2-3 jours)

- [ ] Créer table `playbook_events`
- [ ] Créer service `EventStoreService`
- [ ] Modifier WebSocket handler pour traiter les actions
- [ ] Implémenter la persistance des événements
- [ ] Implémenter le broadcast

### Phase 2 : Migration Frontend (2-3 jours)

- [ ] Créer `useEventDispatcher` hook
- [ ] Modifier les handlers pour utiliser le dispatcher
- [ ] Supprimer les `setState` locaux directs
- [ ] Implémenter l'application des événements reçus
- [ ] Supprimer le code de sync existant (`useCollaborationSync`)

### Phase 3 : Fonctionnalités avancées (2-3 jours)

- [ ] Implémenter le rattrapage (sync)
- [ ] Implémenter Undo/Redo
- [ ] Implémenter Time Travel (optionnel)
- [ ] Supprimer le bouton Save

### Phase 4 : Tests et optimisations (1-2 jours)

- [ ] Tests unitaires backend
- [ ] Tests d'intégration WebSocket
- [ ] Tests de charge (multi-utilisateurs)
- [ ] Optimisation des performances

---

## ⚠️ **Considérations**

### Latence

Sans optimistic UI, l'utilisateur doit attendre la réponse du serveur. Si la latence devient gênante (>200ms), on pourra implémenter une solution hybride :

```typescript
// Hybrid approach (si nécessaire)
const dispatch = (action) => {
  // 1. Apply optimistically
  applyOptimistic(action)

  // 2. Send to backend
  sendAction(action)

  // 3. On response: confirm or rollback
  onResponse((event) => {
    if (event.type === 'error') {
      rollback(action)
    }
  })
}
```

### Snapshots périodiques

Pour éviter de rejouer tous les événements depuis le début :

```sql
CREATE TABLE playbook_snapshots (
    id SERIAL PRIMARY KEY,
    playbook_id INTEGER NOT NULL REFERENCES playbooks(id),
    sequence_number INTEGER NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Créer un snapshot tous les N événements (ex: 100).

### Nettoyage

Possibilité de compacter les anciens événements :
- Garder les snapshots
- Supprimer les événements avant le dernier snapshot
- Ou garder X jours d'historique

---

## 🔗 **Références**

- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Collaboration actuelle (v2.3.x)](../backend/BACKEND_IMPLEMENTATION.md#websocket-collaboration)

---

*Document créé le 2026-01-19 - Sera mis à jour lors de l'implémentation*
