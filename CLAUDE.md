# Estudio de juegos — reglas para Claude

Estudio indie de una persona más Claude. Hacemos juegos web que corren en localhost y que más adelante podrían migrar a Godot o Unity.
El usuario sabe programar pero **es nuevo en gamedev**: enséñale conceptos a través de la bitácora (`aprende`), no con párrafos en el chat.

## Stack

- **Phaser 4 (2D, pixel art)** · TypeScript estricto · Vite · Vitest · Playwright (en `shot.mjs`)
- Plantilla verificada en `templates/phaser-ts` (la de three.js y sus skills están apartadas en `D:/Recursos GC/3d/`). Juegos en `games/<slug>/`, prototipos desechables en `prototypes/<nombre>/`.
- Cada juego tiene su propio `CLAUDE.md` con comandos, arquitectura y trampas del motor. Léelo antes de tocar su código.

## Modo de trabajo: autónomo y por fases pequeñas

El usuario deja a Claude trabajando durante horas y revisa después en el **panel** (`npm run panel` → http://localhost:4400).

1. **No preguntes lo que puedes decidir.** Elige la opción razonable, regístrala con `decision` (con su porqué) y sigue adelante. Pregunta solo si algo es irreversible o si cambia el concepto del juego.
2. **Fases pequeñas:** cada una entrega un resultado jugable o comprobable, con 5 criterios como máximo. Si crece, divídela (F04 → F04a, F04b).
3. **Nada está hecho sin verificar:** `npm run check` en verde y `npm run shot` sin errores. Si la fase cambia algo visible, mira la captura.
4. **Todo queda en la bitácora:** fases, errores (síntoma → causa → solución), faltantes, recomendaciones, decisiones y conceptos. El panel solo muestra lo que está ahí.
5. **Bloqueos:** prueba 3 enfoques distintos como máximo. Después marca la fase como `bloqueada` con su `motivo` y pasa a la siguiente fase independiente. Nunca te quedes en bucle.
6. **Commit local al cerrar cada fase:** `feat(<slug>): F03 título`. Nunca hagas `push` ni reescribas el historial.

El protocolo completo de una fase está en la skill `/fase`. Léela al ejecutar fases.

## Sesiones A, B y C (forma de trabajo)

Trabajamos con 3 sesiones a la vez: **A** = Opus 5.5 alto (orquesta, diseña y habla con el usuario), **B** = Sonnet 5.5 alto (implementa fases) y **C** = Sonnet 5 medio (tareas mecánicas). A reparte cada tarea al modelo más barato que la haga bien. Las sesiones rotan cuando se les llena el contexto, pero los roles no cambian. Protocolo completo, formato de tareas y reglas para no pisarse: `.claude/docs/sesiones.md`. Qué sesión ocupa cada rol: `studio/sesiones.json`.
Si al empezar el usuario te dice qué rol eres, lee primero ese protocolo.

## Bitácora (fuente de verdad del progreso)

`node studio/bitacora.mjs <cmd> '<json>'` desde la raíz, con el **Bash tool** (las comillas simples del JSON no funcionan en PowerShell). Comandos: `usar <slug>`, `estado`, `juego`, `fase`, `error`, `falta`, `reco`, `decision`, `aprende`, `nota`, `cerrar`. Si dudas de algún campo: `node studio/bitacora.mjs ayuda`.
Tras un `/clear` o una compactación, lo primero es `node studio/bitacora.mjs estado`: el archivo es la memoria, no la conversación.

## Comandos del estudio

| Comando | Para qué |
|---|---|
| `/nuevo-juego` | Idea → brief → crear el juego desde la plantilla |
| `/roadmap` | Dividir el brief en fases pequeñas y registrarlas |
| `/fase [id]` | Ejecutar una fase completa (implementar → verificar → registrar → commit) |
| `/autopiloto [n]` | Encadenar fases sin supervisión hasta n fases o hasta un bloqueo |
| `/playtest` | Jugar el juego con scripts y evaluar sensación, bugs y carencias |
| `/carencias` | Auditoría de diseño: qué falta, qué sobra, recomendaciones |
| `/bug <descripción>` | Reproducir → test de regresión → arreglar → registrar |
| `/prototipo <pregunta>` | Probar una mecánica en menos de 1 día, con veredicto SEGUIR / CAMBIAR / DESCARTAR |
| `/explicar <concepto>` | Enseñar un concepto de gamedev usando el código del juego |
| `/postmortem` | Cerrar un juego y guardar lecciones en `studio/aprendizajes.md` |

Algunos comandos tienen la invocación automática desactivada para ahorrar contexto. Si el usuario pide eso mismo con otras palabras, lee `.claude/skills/<nombre>/SKILL.md` y síguelo.

## Economía de tokens (obligatorio)

- Lee lo mínimo: usa `Grep`/`Glob` antes de `Read`, y `offset`/`limit` en archivos largos. No releas lo que acabas de editar.
- Verifica primero con el **JSON de estado** de `shot` (`--sin-captura`). Mira la imagen solo si la fase es visual.
- Silencia los comandos ruidosos: `npm install --loglevel=error`, `| tail -n 20`.
- Antes de resolver un error raro, busca en `studio/aprendizajes.md` con `Grep`. Si aprendes algo reutilizable, añade una línea allí.
- Usa subagentes (`qa-tester`, `revisor-codigo`, `disenador`) para trabajo pesado que ensucie el contexto. Pídeles respuestas cortas.
- La documentación de referencia está en `.claude/docs/` y se lee solo cuando la tarea lo pide.
- Biblioteca de skills inactivas: `.claude/skill-library/` (géneros, Godot, Unity, shaders, IA…). Cuando un juego las necesite, cópialas a `.claude/skills/`.

## Código (detalle en `.claude/rules/`, que se cargan según la carpeta)

- Separa la lógica pura (`src/logic/`, testeada y sin motor) de la presentación (escenas y render). Así se puede portar a Godot.
- Los números de diseño van en `src/data/tuning.json`. Todo lo que dependa del tiempo usa delta.
- Expón el estado clave con `exponer()` para que `shot.mjs` pueda verificarlo.
- TypeScript estricto, sin `any`. Si la API de Phaser cambió, comprueba con context7 en vez de suponer.
- Los identificadores propios van en español, como en las plantillas. Las APIs del motor mantienen su nombre. Docs y bitácora en español.

## Modo nube (sesiones cloud de Claude Code)

Si `CLAUDE_CODE_REMOTE=true` estás en una VM de Anthropic, sin supervisión y sin el PC del usuario. Aquí **sustituye** a "nunca hagas push" y a las sesiones A/B/C/D:

- **Una sola sesión**, que encadena fases con `/autopiloto`. No hay `SendMessage` ni roles A/B/C/D.
- **Rama única `claude/nube`**: trabaja y empuja solo ahí (`git push origin claude/nube`) tras cerrar cada fase. Nunca `main`/`master`, nunca `--force`. El usuario la fusiona al revisar.
- `studio/activo.txt` no viaja (está en .gitignore): ejecuta `node studio/bitacora.mjs usar <slug>` al empezar.
- No existen `CLAUDE.local.md`, la memoria de usuario ni `D:/Recursos GC`. Lo que necesites debe estar en el repo; si falta arte o un recurso externo, regístralo con `falta` y pasa a otra fase.
- `shot.mjs` usa el Chromium de Playwright (`studio/nube/setup.sh`); `bench-60fps` no es fiable aquí (sin GPU real): sáltalo y regístralo.
- El cupo puede agotarse en cualquier momento: empuja tras cada fase. La rutina programada (`studio/nube/rutina-prompt.md`) reanuda desde la bitácora.
