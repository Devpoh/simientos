# CIMIENTOS (nombre provisional · slug técnico `sedimento`)

> Gobierna una ciudad-estado sumeria viva en un paisaje continuo en tiempo real: construyes donde quieras, ves levantarse cada edificio, y cada cosecha, ley y crecida tiene consecuencias que se propagan por toda la sociedad.

**Pixel art 2D isométrico** · Phaser 4 · TypeScript estricto · Vite · Vitest · Playwright. Slug de bitácora: `sedimento`.
Desde el 20-10 manda **`.claude/docs/pivote-pixel-art.md`** (stack, colisiones, selección, fichas, 60 fps, hoja de ruta P0–P10).

## Comandos (desde `games/sedimento`)

| Qué | Comando |
|---|---|
| Jugar | `npm run dev` → http://localhost:5173 |
| Typecheck + tests | `npm run check` |
| Verificar en navegador | `npm run shot -- --acciones "KeyW:500,Space" --nombre P03-algo` (añade `--sin-captura` para solo estado) |
| Arte (desde P1) | `npm run arte` (genera atlas + JSON en `public/recursos/pixel/`) · `npm run arte:verificar` · skill `sprite-qa` |

## Lo que manda

- `docs/requisitos-usuario.md`: todo lo que pidió el usuario (R1–R66). Léelo antes de cambiar algo visible. Vigentes clave: R49 (pixel art), R50 (colisiones), R51 (selección), R52 (ficha de ciudadano), R53 (ficha de estructuras), R56 (≥ 60 fps), R59 (terreno procedural), R60 (ratón RTS), R61 (cámara sin giro), R65 (agua), R66 (cultivos por etapas).
- `docs/prompts/maestro.md` (visión del juego) y `camara.md`; `espertativas/` (meta de ambiente y composición, R39); GDD en `docs/gdd/`.
- Arte: la muestra aprobada (`prototypes/imperium-muestra/`) y sus errores (README) son la lista de aceptación. El mar de referencia está en `prototypes/pixel-cimientos/` (R65).
- Prioridades (R27): diversión > construcción y simulación coherentes > estilo > rendimiento > efectos.

## Arquitectura

- `src/logic/` reglas puras sin motor, con tests en `tests/`. `src/data/tuning.json` todos los números de diseño.
- `src/main.ts` arranque (provisional hasta P2). `src/core/test-hooks.ts` `exponer()` y `marcarListo()` para `shot.mjs`.
- Una **rejilla de ocupación** única (P3) manda en colocación, navegación y orden de dibujo. Hasta P3, `logic/mapa.ts` sigue con celdas hexagonales de datos.
- `tools/arte-pixel/` (raíz del repo) genera el arte en Python; el juego **solo carga atlas**, no genera sprites en ejecución.

## Trampas

- Escalado solo por enteros, `pixelArt: true`, `roundPixels`. Nada de zoom fraccionario.
- Ningún color fuera de la paleta de 59. Un sprite nuevo pasa `sprite-qa` y se mira ampliado y a tamaño real (R12).
- Todo lo que dependa del tiempo usa delta acotado; lógica a paso fijo con interpolación al dibujar. Cero asignaciones en el bucle.
- Si dudas de una API de Phaser 4, consulta context7 o las skills `phaser-*`.
