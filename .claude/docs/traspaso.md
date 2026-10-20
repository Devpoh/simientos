# Traspaso entre sesiones (actualizado: 2026-10-21, relevo de A, B, C y D)

> Sesión nueva: lee en este orden `.claude/docs/pivote-pixel-art.md` (manda sobre todo, sobre todo §13), este archivo, `.claude/docs/sesiones.md`, `games/sedimento/CLAUDE.md` y `node studio/bitacora.mjs estado`. Las reglas del usuario están en `games/sedimento/docs/requisitos-usuario.md` (R1–R89): **léelas antes de diseñar o dibujar nada**.
> R40: déjalo todo documentado. Antes de cerrar una sesión, actualiza este archivo y deja una `nota` en la bitácora.

## Quién es quién
Sesiones del 21-10: A `proyectos-gc-1b`, B `-c3`, C `-a7`, D `-81` (`studio/sesiones.json`). Se relevan por contexto lleno; la A nueva registra los nombres nuevos con `ListAgents`. Prompts de arranque: `.claude/docs/prompts-relevo-pixel-art.md`.

## Estado del juego (CIMIENTOS, slug `sedimento`)
- **Pixel art 2D isométrico con Phaser 4**. Tag de seguridad `pre-pixel-art`. Todo lo 3D está fuera del proyecto, en `D:\Recursos GC\3d\` (R58).
- **Hecho:** panel con «Pixel art propio → Avances» (galería) y «Lo que pediste» (R1–R89) · P0 (limpieza y docs), P1 (pipeline de arte `tools/arte-pixel`), P2 tramos 1–4b (Phaser 960×540 escalado entero; cámara 2D; terreno horneado con costa y yacimientos; aldea de referencia animada, D023; bench de 60 fps con el criterio D034).
- **En curso:** P2 tramo 4c, pantalla completa con píxel entero (R83, D032).
- **Roadmap:** P2b (UI HTML/CSS, R70) → P2c (montañas como piezas, R84) → P2d (agua y humo, R87) → P3 (rejilla de ocupación) → P3b (caminos, R85) → P4 … P10 → v0.1 (F102 «Fundación desde cero»).
- **Cola de D:** CAM1 → ESC1 (boceto de escala de seres frente a edificios, R89–R90, D038; antes de D4) → CULT1 (R86) → CULT2 (R88) → M2 → almacén de era 2 (R82) → pulir las chozas de E0. Estado y cola en `tools/arte-pixel/README.md`.

## Reglas del usuario que siempre se cumplen (detalle y fecha en `requisitos-usuario.md`)
1. **Tramos de ≤ 20 min (R67), también A:** al cerrar cada tramo, HECHO corto y parar hasta el «sigue».
2. **Anotar toda petición o crítica del usuario (R68)** en `requisitos-usuario.md` con fecha, aunque se la diga a B, C o D (le avisan a A y A la registra).
3. **Revisar con captura (R12):** quien entrega mira su captura; A también la mira antes de aceptar.
4. **Boceto antes de cada familia de arte** (pivote §10.11): lo aprueba el usuario y luego no se cambia el estilo.
5. **Progresión desde cero (R77, `gdd/progresion.md`):** todo sube por eras y niveles. Era 0–1 humilde: paja, ramas, troncos y barro; nunca teja, sillar ni enlucido liso (R80).
6. **Enseñar el avance en el navegador (R64):** panel en :4400 (pestaña «Pixel art propio → Avances») y juego en :5173. Antes de arrancar servidores, comprueba la memoria; el sistema cerró uno por falta de memoria.
7. **Vigilar el panel:** cada `falta` o `reco` nueva recibe «→ Plan: sesión, fase» en el mismo tramo.
8. Mínimo **60 fps medidos** (R56) · **cero gasto** (R43) · **nada 3D** (R49, R57) · **sin push** · commit solo de tus rutas.
9. **Documento maestro = guía de la parte jugable (R81):** `games/sedimento/docs/prompts/maestro.md` (copia literal de `espertativas/IMPERIUM_Prompt_Maestro_y_Vision_Creativa.docx`). Consúltalo al diseñar o planificar cualquier mecánica y salta lo que contradiga R49–R80.
10. Decisiones que no se reabren: terreno procedural (R59), ratón RTS (R60), cámara sin giro (R61), mar de `pixel-cimientos` y río de la muestra (R65), campos en 6 etapas (R66), UI híbrida HTML/CSS (R70), catálogo de estructuras (R74), pantalla completa con píxel entero (R83), montañas como piezas de sprite (R84), bench de 60 fps con el criterio D034 (con vsync ≥ 59,5 fps y ≤ 0,5 % perdidos; sin vsync p95 ≤ 8,3 ms).
11. **Lo que se sustituye no se borra (R82):** se guarda y se le busca otro uso (el almacén anterior pasa a la era 2).

## Lecciones (no repetir)
- Los avisos de inactividad de otra sesión pueden ser **viejos**: antes de dar a alguien por parado, mira `ListAgents` (busy/idle) y `git log`.
- Si todas las sesiones paran a la vez sin entregar nada, casi seguro es el **límite de uso** de la cuenta: espera al reinicio y reenvía las tareas.
- En Windows, un `vite` en marcha bloquea mover o renombrar las carpetas que vigila.
- Las pruebas del panel nunca tocan carpetas reales: usan variables de entorno y carpetas temporales (una prueba borró el atlas, E003).
- El CLI de la bitácora numera por longitud de lista y ordena por versión; no edites IDs a mano sin renumerar.
- `npm run arte` escribe de forma atómica (carpeta temporal + `os.replace`) porque otras sesiones leen el atlas mientras tanto.
