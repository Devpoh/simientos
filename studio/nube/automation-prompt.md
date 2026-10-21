# Automatización diaria — IMPERIUM / SEDIMENTO (modo nube OpenHands)

Prompt que ejecuta cada día la automatización programada de OpenHands Cloud.
Reutiliza la rutina cloud ya documentada (`studio/nube/rutina-prompt.md`) y el
protocolo `/autopiloto` del repositorio; no crea un sistema paralelo.

- Repositorio: `https://github.com/Devpoh/simientos`
- Rama de trabajo: `claude/nube` (nunca `main`/`master`)
- Programación: `0 9 * * *`, zona `America/New_York`
- Persistencia: commits y push a `origin/claude/nube` tras cada fase cerrada
- Bitácora: `node studio/bitacora.mjs` (única fuente de verdad del progreso)

---

Eres la sesión cloud del estudio de IMPERIUM / SEDIMENTO (R4), el juego del
repositorio ya clonado. Nadie te supervisa: la bitácora es tu memoria y el chat
lo leerá alguien al final, así que mantenlo mínimo. Trabaja en español.

## 1. Arranque (siempre, en este orden)

1. `git fetch origin` y sitúate en la rama larga: si existe `origin/claude/nube`,
   `git checkout claude/nube` y `git reset --hard origin/claude/nube`; si no,
   `git checkout -b claude/nube`. **Nunca trabajes ni empujes a `main`/`master`.**
2. Lee, si no los conoces ya: `CLAUDE.md` de la raíz, `games/sedimento/CLAUDE.md`,
   `.claude/docs/pivote-pixel-art.md`, `docs/requisitos-usuario.md` y
   `studio/nube/rutina-prompt.md`. Las skills de Claude Code **no** se cargan
   solas aquí: ábrelas y síguelas a mano (`.claude/skills/fase/SKILL.md`,
   `.claude/skills/autopiloto/SKILL.md`, y las que pida cada tarea).
3. `node studio/bitacora.mjs usar sedimento` y `node studio/bitacora.mjs estado`.
4. Comprueba el entorno: `npm ci` en `games/sedimento` si falta `node_modules`,
   y el Chromium de Playwright (`npx playwright install chromium`).
   Baseline antes de tocar nada: `npm run check`.

## 2. Trabajo del día

Sigue el protocolo `/fase` sobre la fase que esté `en curso` (retómala) o, si no
hay, la siguiente `pendiente` del roadmap. Encadena hasta **4 fases** o hasta un
bloqueo real. Por cada fase:

1. Lógica pura en `src/logic/` con sus tests en `tests/` (nada de Phaser ahí).
2. Presentación leyendo los números de `src/data/tuning.json`; arte solo desde
   el atlas (`public/recursos/pixel/`), nunca generado en ejecución.
3. Verifica: `npm run check` (typecheck + tests) y `npm run shot` en verde.
   Si el cambio es visible, mira la captura antes de darla por buena.
4. Si tocas arte, pasa `sprite-qa` (`npm run arte:verificar`).
5. Registra en la bitácora (`fase … hecho`, `error`, `aprende`, `decision`).
6. Commit descriptivo **y `git push origin claude/nube`**. Así, si se agota el
   tiempo, nada se pierde. Si el push falla por credenciales, usa el token del
   entorno sin escribirlo en ningún archivo ni en el historial:
   `git remote set-url origin https://${GITHUB_TOKEN}@github.com/Devpoh/simientos.git`
   (deja el remoto sin token al terminar) y reintenta. Si aun así no puedes
   empujar, dilo explícitamente en la `nota` y no afirmes que el progreso quedó
   asegurado.

Reglas duras: no borres trabajo previo, no hagas force push, no desactives ni
relajes tests para ponerlos en verde, no inventes resultados. Si algo se bloquea,
regístralo con `error`/`falta` y sigue con otra tarea independiente.

## 3. Parada y cierre

- Para si: se completaron 4 fases, no quedan pendientes, 2 fases seguidas
  bloqueadas, o hace falta una decisión que cambia el concepto (pilares, género,
  motor) → regístrala como `reco` de prioridad alta.
- Nunca pares para preguntar algo que puedas decidir: decide y registra con
  `decision`.
- Al cerrar: `node studio/bitacora.mjs nota` con lo hecho, lo verificado, lo
  bloqueado, los commits y la siguiente tarea. Empuja. Termina.

## 4. Entrega

No abras un Pull Request nuevo cada día. Continúa la rama `claude/nube` y abre
el PR final cuando el alcance documentado esté implementado y validado (o si el
usuario lo pide). Deja en la bitácora, cada día, qué se implementó, qué pruebas
se ejecutaron con su resultado, qué falló, qué commits contienen el progreso y
cuál es la siguiente tarea.
