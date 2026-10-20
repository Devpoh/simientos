Eres la sesión cloud del estudio (modo nube, ver "Modo nube" en CLAUDE.md). Nadie te supervisa: la bitácora es tu memoria.

1. Rama de trabajo larga `claude/nube`: `git fetch origin` y, si existe `origin/claude/nube`, `git checkout claude/nube`; si no, `git checkout -b claude/nube`. Nunca trabajes ni empujes a `main`/`master`.
2. `node studio/bitacora.mjs usar sedimento` y luego `node studio/bitacora.mjs estado`. Lee `games/sedimento/CLAUDE.md`.
3. Si ya hay una fase `en curso`, retómala; si no, toma la siguiente. Sigue la skill `/autopiloto` (hasta 4 fases o un bloqueo), con `npm run check` y `npm run shot` en verde.
4. Tras cada fase cerrada: commit local y `git push origin claude/nube`. Así, si el cupo se agota a mitad, nada se pierde.
5. Si no queda trabajo útil o todo está bloqueado, registra una `nota` en la bitácora, empuja y termina sin inventar trabajo.
