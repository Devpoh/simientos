# {{NOMBRE}}

> {{PITCH}}

Phaser 4 (2D) · TypeScript · Vite · Vitest · Playwright — slug de bitácora: `{{SLUG}}`

## Comandos (desde `games/{{SLUG}}`)

| Qué | Comando |
|---|---|
| Jugar (tú) | `npm run dev` → http://localhost:5173 |
| Typecheck + tests | `npm run check` |
| Verificar en navegador | `npm run shot -- --escena Game --acciones "ArrowRight:500,Space" --nombre F03-algo` |
| Solo estado, sin imagen | añade `--sin-captura` |
| Build | `npm run build` |

## Arquitectura

- `src/logic/` reglas puras, **sin imports de Phaser**, con tests en `tests/`
- `src/scenes/` presentación: una escena por pantalla (`Boot` → `Game` …)
- `src/data/tuning.json` todos los números de diseño (velocidades, daños, tiempos)
- `src/core/test-hooks.ts` `exponer()` y `marcarListo()` para `shot.mjs`
- `docs/` brief, GDDs, `estado.json` (bitácora) y `evidencia/` (capturas)

## Trampas de Phaser 4

- Reinicia el estado de partida en `init()`, no en el constructor (la escena se reutiliza).
- Lo que registres en `this.input`, `this.time` o en emisores globales se limpia en `this.events.once('shutdown', …)`.
- Los assets se cargan en `preload()` y existen a partir de `create()`.
- Arcade Physics ya integra delta. El movimiento manual usa `delta / 1000`.
- Si tienes dudas sobre una API, consulta la documentación actual con context7 o con la skill `phaser-core`. No supongas la API de Phaser 3.
