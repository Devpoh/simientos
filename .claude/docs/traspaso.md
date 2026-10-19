# Traspaso entre sesiones (última actualización: 2026-10-19, tras A5)

> Lee esto **antes de nada** si eres una sesión nueva. Después: `node studio/bitacora.mjs estado`, `games/sedimento/CLAUDE.md` y `.claude/docs/sesiones.md`.
> **Regla del usuario (R40): dejar siempre todo documentado.** Antes de cerrar una sesión, actualiza este archivo y deja una `nota` en la bitácora.

## Cómo arrancar las sesiones nuevas

Pega una de estas frases en cada sesión nueva de Claude Code, abierta en `D:\Proyectos GC`:

| Rol | Modelo | Frase de arranque |
|---|---|---|
| **A** | Opus 5.5 · esfuerzo alto | `Eres la sesión A del estudio. Lee .claude/docs/traspaso.md y .claude/docs/sesiones.md, registra tu nombre en studio/sesiones.json y coordina a B y C.` |
| **B** | Sonnet 5.5 · esfuerzo alto | `Eres la sesión B del estudio. Lee .claude/docs/traspaso.md y .claude/docs/sesiones.md y preséntate a la sesión A.` |
| **C** | Sonnet 5 · esfuerzo medio | `Eres la sesión C del estudio. Lee .claude/docs/traspaso.md y .claude/docs/sesiones.md y preséntate a la sesión A.` |

La sesión A, al arrancar, hace esto:
1. Ejecuta `ListAgents` y apunta los nombres nuevos en `studio/sesiones.json`.
2. Mira las imágenes de `games/sedimento/espertativas/` (R39).
3. Reparte el trabajo.

## Quién es quién ahora

A = `proyectos-gc-bd` · B = `proyectos-gc-7b` · C = `proyectos-gc-9e` (coincide con `studio/sesiones.json`).

## Estado del juego

- **Nombre provisional: CIMIENTOS** (R36). Carpeta y *slug* técnicos: `games/sedimento` (no renombrar hasta que el nombre sea definitivo).
- **Fuentes de verdad:** `games/sedimento/docs/prompts/`, que guarda literales `maestro.md`, `direccion-artistica.md`, `camara.md` y `recursos-recomendados.md`, y `docs/requisitos-usuario.md` (R1–R47 con su estado).
- **Decisiones del 19-10:**
  - Terreno continuo sin casillas (R20), **ya implementado en A5** (ver más abajo).
  - Construcción libre (R21) y progresiva en 6 etapas (R22): pendiente, fase A6.
  - Estilo visual **por decidir en el Art Direction Lab** (R23). El **3D es la vía principal** (R47): el pixel art quedó cerrado en `prototypes/pixel-cimientos/` con veredicto **CAMBIAR** — gustó el agua (espuma, olas, destellos), pero no las casas ni la gente («juego de 1990»); solo es plan B si no hay buenos modelos 3D, y entonces tendría que verse como un juego de 2026, no como ese prototipo.
  - Batallas tácticas **por turnos** dentro de una campaña en tiempo real (R35).
  - **three.js** hasta la v0.9 (R37).
  - Versiones en tramos **alfa → beta** (R38).
  - Se mantienen todas las ideas del juego (R34).
  - **Cero gasto (R43, innegociable):** solo recursos CC0/CC-BY o propios. Lo que cuesta dinero (p. ej. Beelim, Civilization Builder Mega Pack de 3dsultan) se registra como `reco` y queda descartado hasta que el usuario diga lo contrario.
  - **R46 (pendiente, fase A5b):** el terreno continuo de A5 gusta más o menos, pero árboles, flores y decorado no van con la estética — hay que revisar `vegetacion.ts`/`decorado.ts` antes de A7.
- **Roadmap:** 121 fases de la v0.0 a la v1.0 (`docs/versiones.md` y el panel). Hechas: **A1, A2, A2b, A3, A5, C1, C2**. En curso: **A6a** (obras por `{x,z,giro}` en vez de `hex`, con A) y **C3** (terreno y oclusión de cámara, con B); después **A5b**.
- **Panel:** `npm run panel` → http://localhost:4400 (progreso con marcas de nuevo y leído, laboratorio de arte y comandos). Pruebas: `npm run panel:probar` (34 comprobaciones). **Si cambias `studio/panel/server.mjs`, reinicia el panel**: Node no recarga solo.
- **Juego:** `cd games/sedimento && npm run dev` → http://localhost:5173. Galería: `?galeria`. Exportar modelos propios: `npm run modelos`.

## A5: terreno continuo, ya hecho

El terreno dejó de ser hexágonos: `logic/alturas.ts` genera el campo continuo (`alturaEn`, `aguaEn`) y `render/terrenoContinuo.ts`, `render/agua.ts` y `render/seleccion.ts` lo dibujan (malla con color por vértice, agua de lagos/ríos/mar, marca circular bajo el ratón). `render/terreno.ts` y `render/relieve.ts` (los de prismas y anillos por hexágono) ya no existen. Detalle completo en `games/sedimento/docs/auditoria.md`, sección «Estado tras A5». La deuda técnica que dejó esa fase (números mágicos, `VECINDAD` repetido) se cerró en A5-limpieza (reco R003).

## Pendiente por rol (orden recomendado)

**A (Opus):** A6a (obras en coordenadas libres y 6 etapas, R21–R22) y coordinar A5b (revisar vegetación/decorado, R46) y A7 (decidir estilo con métricas).

**B (Sonnet 5.5):** C3 (terreno y oclusión de cámara, ya puede apoyarse en A5), después sigue con A5b si A no la ha tomado.

**C (Sonnet 5):** sin tarea fija ahora mismo; última entregada fue DOC-1 (esta puesta al día). Catálogo de recursos en `docs/recursos/catalogo.md` (30 paquetes) y descargas en `recursos-sin-revisar/` (texturas, HDRI, pixel art), todo fuera de git.

## Lecciones de esta tanda (no repetir)

- Las nubes semitransparentes a poca altura quedaban delante de la cámara y difuminaban todo: cualquier elemento entre la cámara y el suelo hay que probarlo de cerca.
- Un CDN lento (jsDelivr tardaba más de 20 s) bloqueaba el panel entero: three se sirve en local desde `/vendor/three/`.
- Nunca dejes un archivo a medias que rompa la compilación cuando otra sesión necesita el juego: aparta tu trabajo en curso y avisa.
- `git stash` puede estar denegado por permisos: archiva los diffs en `docs/archivo/`.
- El usuario quiere ver avances visuales enseguida y probarlos él mismo: abre el juego y el panel cuando haya algo que enseñar.
