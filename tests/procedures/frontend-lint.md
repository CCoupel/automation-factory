# Procédure de Test — Lint frontend (#95)

**Version** : 2.4.4
**Fichier de test** : `frontend/src/__tests__/lint-config.test.ts`

## Commande

```bash
cd frontend && npx vitest run src/__tests__/lint-config.test.ts
# équivalent direct : cd frontend && npm run lint
```

## Résultat attendu

- Avant correction (RED) : 2 tests KO — `eslint.config.js` absent ; `npm run lint` sort en code 2 (ESLint 9 sans config flat).
- Après correction (GREEN) : 2 tests OK — config flat présente, `npm run lint` sort en 0 (`--max-warnings 0`).
