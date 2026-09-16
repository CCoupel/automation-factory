# Adaptations projet — Automation Factory

> Complète `dev-frontend.template.md` (générique React/Vue) avec la structure et les règles
> réelles du frontend Automation Factory.

## Stack
- **React 18** + **TypeScript** strict
- **Vite** — build tool, dev server (port 5173)
- **Material-UI** — composants UI, thème
- **@dnd-kit** — drag & drop (playbook builder)
- **State — hybride, pas juste Zustand** : `stores/` (Zustand — `editorStore.ts`,
  `playbookEditorStore.ts`, `projectStore.ts` : état de l'éditeur/playbook) **+** 7 React Context
  dans `contexts/` (`AuthContext`, `ThemeContext`, `CollaborationContext`, `GalaxyCacheContext`,
  `UserPreferencesContext`, `ZoomContext`, `AnsibleVersionContext` : préoccupations transverses).
  Ne pas orienter un dev vers un seul des deux patterns.
- **react-i18next** — internationalisation EN/FR
- **Vitest** + **React Testing Library** — tests

## Structure réelle
```
frontend/src/
├── components/
│   ├── zones/        ← WorkZone, PlaybookZone, PlayZone, SystemZone, ConfigZone, ModulesZoneCached
│   └── dialogs/, admin/, auth/, canvas/, collaboration/, editor/, project/, role/, validation/...
├── stores/           ← Zustand (état éditeur/playbook — voir Stack)
├── contexts/         ← 7 React Context (préoccupations transverses — voir Stack)
├── hooks/            ← Custom hooks
├── services/         ← Appels API métier (authService, playbookService, galaxy*Service...)
├── utils/httpClient.ts ← Le client HTTP réel (`getHttpClient()`) — PAS dans services/
├── types/            ← Types TypeScript
├── locales/
│   ├── en/           ← {common,auth,playbook,project,dialogs,admin,errors}.json (7 namespaces,
│   │                    "project" existe et est souvent oublié dans la doc/les rappels)
│   └── fr/           ← Même structure, parité obligatoire
└── i18n/__tests__/   ← Test de parité EN/FR
```

## Règles i18n (RÈGLE CRITIQUE projet — voir aussi CLAUDE.md)
- **Jamais** hardcoder du texte visible — toujours `useTranslation()`
- **Toujours** ajouter les clés dans `en/` ET `fr/` simultanément
- **Namespaces** : `common`, `auth`, `playbook`, `project`, `dialogs`, `admin`, `errors`
  (`CLAUDE.md` liste actuellement 6 namespaces et omet `project` — à corriger si vous le
  retouchez pour cette raison)
- **Mock** `httpClient` (`utils/httpClient.ts`) via `vi.mock()` dans les tests
- **TypeScript strict** : pas de `any`, pas de `@ts-ignore`

## Validation
```bash
cd frontend && npm test
npm run lint
npx tsc --noEmit
```
