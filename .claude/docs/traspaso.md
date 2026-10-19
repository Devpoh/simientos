# Traspaso entre sesiones (última actualización: 2026-10-19, cierre de A, B y C)

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

## Estado del juego

- **Nombre provisional: CIMIENTOS** (R36). Carpeta y *slug* técnicos: `games/sedimento` (no renombrar hasta que el nombre sea definitivo).
- **Fuentes de verdad:** `games/sedimento/docs/prompts/`, que guarda literales `maestro.md`, `direccion-artistica.md`, `camara.md` y `recursos-recomendados.md`, y `docs/requisitos-usuario.md` (R1–R40 con su estado).
- **Decisiones del 19-10:**
  - Terreno continuo sin casillas (R20).
  - Construcción libre (R21) y progresiva en 6 etapas (R22).
  - Estilo visual **por decidir en el Art Direction Lab** (R23), con el estilo B (3D detallado y cálido) como favorito según las imágenes de expectativas.
  - Batallas tácticas **por turnos** dentro de una campaña en tiempo real (R35).
  - **three.js** hasta la v0.9 (R37).
  - Versiones en tramos **alfa → beta** (R38).
  - Se mantienen todas las ideas del juego (R34).
- **Roadmap:** 121 fases de la v0.0 a la v1.0 (`docs/versiones.md` y el panel). Hechas: C1 y P1–P2.
- **Panel:** `npm run panel` → http://localhost:4400 (progreso con marcas de nuevo y leído, laboratorio de arte y comandos). Pruebas: `npm run panel:probar` (34 comprobaciones). **Si cambias `studio/panel/server.mjs`, reinicia el panel**: Node no recarga solo.
- **Juego:** `cd games/sedimento && npm run dev` → http://localhost:5173. Galería: `?galeria`. Exportar modelos propios: `npm run modelos`.

## Pendiente por rol (orden recomendado)

**A (Opus):**
1. **A1 Auditoría**: crear `docs/auditoria.md` (qué funciona, qué es provisional y qué hay que rehacer frente a R20–R23).
2. **A5 Terreno continuo:**
   - `src/logic/alturas.ts` ya existe (campo de alturas, cauces, lagos), con commit pero **sin tests**.
   - El agua continua a medias está en `docs/archivo/wip/agua-continua.ts.txt`: se retiró para no bloquear a B.
   - Falta crear `render/terrenoContinuo.ts`, cablearlo en `mundo.ts` (pasando `campo` a `crearAgua`) y añadir la clave `render.agua.anchoCinta` en tuning.
   - La cámara de B ya acepta `alturaEn(x, z)` (con `fijarAlturaEn`).
3. **A3 y A4, el laboratorio:** ampliar la pestaña «Laboratorio de arte» del panel (portada, estilos, materiales, pixel art, construcción progresiva y comparador con favoritos). Usar el catálogo de C.
4. Revisar con el usuario el hallazgo de C: Beelim «Ancient Buildings 5: Akkadian and Babylonian». Es de pago (1,35 USD) y no CC0: **decide el usuario**.

**B (Sonnet 5.5):** la siguiente es **C2** (suavizado y velocidad adaptativa) y después **C3** (terreno y oclusión: necesita A5). La nota de traspaso de B, con lo que falta de la cámara, está en la bitácora.

**C (Sonnet 5):**
- A2 está entregada: `docs/recursos/catalogo.md` (17 paquetes).
- Las texturas y HDRI CC0 están en `games/sedimento/recursos-sin-revisar/`, fuera de git.
- Le queda: verificar la licencia de Craftpix, buscar un normal map de agua y el HDRI. Después, datos mecánicos para el laboratorio y tests de lógica bien especificados.

## Lecciones de esta tanda (no repetir)

- Las nubes semitransparentes a poca altura quedaban delante de la cámara y difuminaban todo: cualquier elemento entre la cámara y el suelo hay que probarlo de cerca.
- Un CDN lento (jsDelivr tardaba más de 20 s) bloqueaba el panel entero: three se sirve en local desde `/vendor/three/`.
- Nunca dejes un archivo a medias que rompa la compilación cuando otra sesión necesita el juego: aparta tu trabajo en curso y avisa.
- `git stash` puede estar denegado por permisos: archiva los diffs en `docs/archivo/`.
- El usuario quiere ver avances visuales enseguida y probarlos él mismo: abre el juego y el panel cuando haya algo que enseñar.
