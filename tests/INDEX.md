# Index des tests

> Tests de specification ecrits par le test-writer, ranges en lots `<famille>/<theme>/<lot>/` ; statuts tenus par le CDP.
> Le chemin porte l'identite ; cet index ne porte que l'etat : une ligne par lot (chemin termine par `/`),
> plus des lignes fichier pour les exceptions (quarantaine). Lot sans ligne = `feature`.
> Convention : `context/COMMON.md` section 15. Statuts : `feature` | `regression` | `quarantaine`.
> Tags : `smoke`, `critical`, `slow`.

| Chemin | Niveau | Composant | Feature | Statut | Tags |
|--------|--------|-----------|---------|--------|------|
| frontend/src/__tests__/lint-config.test.ts | unitaire | frontend | lint ESLint flat config (#95) | regression | critical |
