# SEDIMENTO

> Gobierna una ciudad-estado sumeria viva en un mundo hexagonal en tiempo real: cada cosecha, ley y crecida tiene consecuencias que se propagan por toda la sociedad.

three.js (3D) · TypeScript · Vite · Vitest · Playwright — slug de bitácora: `sedimento`

## Comandos (desde `games/sedimento`)

| Qué | Comando |
|---|---|
| Jugar (tú) | `npm run dev` → http://localhost:5173 |
| Typecheck + tests | `npm run check` |
| Verificar en navegador | `npm run shot -- --acciones "KeyW:500,Space" --nombre F03-algo` |
| Solo estado, sin imagen | añade `--sin-captura` |
| Build | `npm run build` |

## Arquitectura

- `src/logic/` reglas puras, **sin imports de three**, con tests en `tests/`
- `src/main.ts` arranque y bucle. Al crecer, separa por sistemas (`src/systems/`, `src/world/`)
- `src/data/tuning.json` todos los números de diseño
- `src/core/test-hooks.ts` `exponer()` y `marcarListo()` para `shot.mjs`
- `docs/` brief, GDDs, `estado.json` (bitácora) y `evidencia/` (capturas)

## Trampas de three.js (r186+)

- Usa `THREE.Timer`, no `Clock` (está obsoleto). Acota el delta (`Math.min(dt, 0.1)`).
- Lo que quites de la escena se libera con `geometry.dispose()` / `material.dispose()` / `texture.dispose()`, salvo que se comparta.
- Comparte geometrías y materiales entre instancias. Si hay muchas copias, usa `InstancedMesh`.
- No crees `Vector3` dentro del bucle: reutiliza temporales.
- Para suavizar, usa `lerp(objetivo, 1 - Math.exp(-k * dt))`, que no depende de los FPS.
- Si tienes dudas sobre una API, consulta context7 o las skills `threejs-*`. three cambia APIs entre versiones.
