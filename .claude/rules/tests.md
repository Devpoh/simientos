---
paths:
  - "games/*/tests/**"
---

# Tests

- Vitest en entorno `node`: se testea `src/logic/` y nunca escenas ni render. Si algo no se puede testear sin el motor, la lógica está mal separada.
- Un archivo por módulo de lógica: `tests/<modulo>.test.ts`. Los `it()` se describen en español con el comportamiento esperado.
- Deterministas: RNG con semilla y sin tiempo real. Los valores salen de `tuning.json` o de fábricas, salvo en los tests de límite.
- Todo bug arreglado en lógica deja un test de regresión que falla antes del arreglo.
- No testees la "sensación" (feel) ni lo visual: eso se verifica con `shot` y `/playtest`.
- Nunca borres ni saltes (`.skip`) un test para ponerlo en verde. Arregla la causa.
