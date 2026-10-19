# SEDIMENTO

> Gobierna una ciudad-estado sumeria viva en un paisaje continuo en tiempo real: construyes donde quieras, ves levantarse cada edificio, y cada cosecha, ley y crecida tiene consecuencias que se propagan por toda la sociedad.

three.js (3D) · TypeScript · Vite · Vitest · Playwright — slug de bitácora: `sedimento`

## Comandos (desde `games/sedimento`)

| Qué | Comando |
|---|---|
| Jugar (tú) | `npm run dev` → http://localhost:5173 |
| Typecheck + tests | `npm run check` |
| Verificar en navegador | `npm run shot -- --acciones "KeyW:500,Space" --nombre F03-algo` |
| Solo estado, sin imagen | añade `--sin-captura` |
| Build | `npm run build` |

## Lo que manda (leer antes de tocar nada)

- **`docs/prompts/`**: textos literales del usuario (dirección artística, construcción y cámara). Mandan sobre todo lo demás.
- **`docs/requisitos-usuario.md`**: R1–R33 con su estado. Innegociables: **terreno continuo sin hexágonos ni casillas visibles (R20)**, **construcción libre (R21)** y **progresiva por etapas (R22)**, y **no fijar un sistema gráfico antes de comparar estilos en el laboratorio (R23)**.
- **Prioridades (R27):** diversión y mecánicas > construcción y simulación coherentes > estilo atractivo y consistente > rendimiento > efectos.
- GDD: `docs/gdd/README.md` (general), `construccion.md`, `camara.md`, `arte.md`, `mapa.md` y `simulacion.md`. Recursos y licencias: `docs/recursos/catalogo.md` y `docs/creditos.md`.

## Arquitectura

- `src/logic/` reglas puras, **sin imports de three**, con tests en `tests/`
- `src/main.ts` arranque y bucle. Al crecer, separa por sistemas (`src/systems/`, `src/world/`)
- `src/data/tuning.json` todos los números de diseño
- **Celdas de datos frente a mundo:** `logic/mapa.ts` genera celdas (hoy hexagonales, **invisibles**) con bioma, fertilidad, agua y recursos; `logic/alturas.ts` genera el **terreno continuo** (`alturaEn(x, z)`). Edificios, obras y caminos usan coordenadas libres (`x`, `z`, `giro` y huella), nunca «una celda».
- `src/entrada.ts` decide qué arranca: `?galeria` (galería de modelos), `?exportar` (exporta los modelos propios a GLB, `npm run modelos`) o la partida
- El laboratorio de arte vive en el panel del estudio (`studio/panel`, http://localhost:4400) y lee `public/modelos` y, más adelante, `public/recursos`
- `src/core/test-hooks.ts` `exponer()` y `marcarListo()` para `shot.mjs`
- **`docs/requisitos-usuario.md`: lo que el usuario pidió explícitamente. Léelo antes de diseñar o cambiar algo visible.**
- **Regla permanente (R12): sigue las skills al pie de la letra y revisa todo.** Cada cambio visible → `npm run shot` → **mira la captura** → corrige → repite. En cada fase los gráficos mejoran algo; nunca se dan por terminados.
- `docs/` brief, GDDs, `estado.json` (bitácora) y `evidencia/` (capturas)

## Trampas de three.js (r186+)

- Usa `THREE.Timer`, no `Clock` (está obsoleto). Acota el delta (`Math.min(dt, 0.1)`).
- Lo que quites de la escena se libera con `geometry.dispose()` / `material.dispose()` / `texture.dispose()`, salvo que se comparta.
- Comparte geometrías y materiales entre instancias. Si hay muchas copias, usa `InstancedMesh`.
- No crees `Vector3` dentro del bucle: reutiliza temporales.
- Para suavizar, usa `lerp(objetivo, 1 - Math.exp(-k * dt))`, que no depende de los FPS.
- Si tienes dudas sobre una API, consulta context7 o las skills `threejs-*`. three cambia APIs entre versiones.
