# Traspaso entre sesiones (actualizado: 2026-10-20, pivote a pixel art)

> Si eres una sesión nueva, lee en este orden: `.claude/docs/pivote-pixel-art.md` (manda sobre todo), este archivo, `.claude/docs/sesiones.md`, `games/sedimento/CLAUDE.md` y `node studio/bitacora.mjs estado`.
> **R40: dejarlo todo documentado.** Antes de cerrar una sesión, actualiza este archivo y deja una `nota` en la bitácora.

## Quién es quién
A = `proyectos-gc-d5` · B = `proyectos-gc-ca` · C = `proyectos-gc-9c` · D = `proyectos-gc-0f` (en `studio/sesiones.json`). Prompts de arranque: `.claude/docs/prompts-relevo-pixel-art.md`.

## Estado (20-10)
- **CIMIENTOS** (slug `sedimento`) pasa a **pixel art 2D isométrico con Phaser 4** (R49). Tag de seguridad: `pre-pixel-art` (commit 7200b9c).
- Los recursos y el código 3D están **fuera del proyecto**, en `D:\Recursos GC\3d\` (R58), para otros juegos. No volver a descargar ni a documentar arte 3D.
- Roadmap: **P0–P10** (v0.0) y después F102–F1006 hasta la 1.0, todo en el panel (http://localhost:4400).
- En curso: P0 (A + C: limpieza, docs y panel), P1 (B: pipeline de arte en `tools/arte-pixel`), bocetos de D (D1 obra en 6 etapas, D2 campos con etapas de cultivo) pendientes del visto bueno del usuario.

## Decisiones del usuario del 20-10 que hay que recordar
R59 terreno procedural horneado al cargar · R60 ratón RTS (izquierdo = caja, central/WASD/bordes = cámara, derecho = órdenes) · R61 cámara sin giro ni inclinación · R62 skills `sprite-qa`, `sprite-atlas` y `bench-60fps` · R64 enseñar el avance en el navegador · R65 mar como en `prototypes/pixel-cimientos` (:5180) y río como en la muestra · R66 cultivos con etapas (siembra → crecimiento → listo → cosecha).

## Lecciones (no repetir)
- Windows bloquea mover o borrar carpetas que vigila un `vite` en marcha: para el servidor antes de moverlas.
- El CLI de la bitácora numera por longitud de la lista: si borras entradas a mano, renumera los ID.
- Nunca dejes un archivo a medias que rompa `npm run check` si otra sesión necesita el juego.
- El usuario quiere ver los avances en el navegador: abre el panel y el juego cuando haya algo que enseñar.
