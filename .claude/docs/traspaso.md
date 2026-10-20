# Traspaso entre sesiones (actualizado: 2026-10-21, relevo de A, B, C y D)

> Sesión nueva: lee en este orden `.claude/docs/pivote-pixel-art.md` (manda sobre todo, sobre todo §13), este archivo, `.claude/docs/sesiones.md`, `games/sedimento/CLAUDE.md` y `node studio/bitacora.mjs estado`. Las reglas del usuario están en `games/sedimento/docs/requisitos-usuario.md` (R1–R81): **léelas antes de diseñar o dibujar nada**.
> R40: déjalo todo documentado. Antes de cerrar una sesión, actualiza este archivo y deja una `nota` en la bitácora.

## Quién es quién
Las sesiones del 20-10 (A `proyectos-gc-d5`, B `-ca`, C `-9c`, D `-0f`) se relevan por contexto lleno. La A nueva registra los nombres nuevos en `studio/sesiones.json` con `ListAgents`. Prompts de arranque: `.claude/docs/prompts-relevo-pixel-art.md`.

## Estado del juego (CIMIENTOS, slug `sedimento`)
- **Pixel art 2D isométrico con Phaser 4**. Tag de seguridad `pre-pixel-art`. Todo lo 3D está fuera del proyecto, en `D:\Recursos GC\3d\` (R58).
- **Hecho:** P0 (limpieza y docs), P1 (pipeline de arte `tools/arte-pixel`: atlas + JSON, `npm run arte`, `arte:verificar`, skill `sprite-qa`), P2 tramos 1–3c (Phaser 960×540 con escalado entero, F2 con fps; cámara 2D con central/WASD/bordes/zoom 1–4; terreno procedural horneado al cargar; costa como dato; yacimientos de 8 tipos).
- **A medias (mira las notas «Traspaso B/C/D (21-10)» en la bitácora para el punto exacto):**
  - P2 tramo 3d: calidad del terreno (montañas con forma y luz como en la muestra, llano con variación, sin islotes; R78/R79). Plan de B: sombras precalculadas + luz por normal cuantizada por rampa, tono mínimo por material, curvatura, fertilidad suave, limpieza morfológica, comparar con `prototypes/imperium-muestra/salida/escena_base_960x540.png`.
  - P2 tramo 4: bench de 60 fps (skill `bench-60fps`, Chrome con GPU real, p95 ≤ 16,6 ms) sobre una **aldea de referencia animada** que se ve por defecto (D023).
  - C3: sección «Lo que pediste» del panel (lee `requisitos-usuario.md`).
  - D: almacén de era 1 humilde (R80).
- **Siguiente:** cerrar P2 → P2b (UI HTML/CSS, R70; los marcos 9-slice ya están en `public/recursos/pixel/ui/`) → P3 (rejilla de ocupación; apuntado: declarar `huellaObra` y la categoría `cultivo` en `src/data/atlas.ts`) → P4 … P10 → v0.1 (F102 «Fundación desde cero»).
- **Cola de arte de D:** boceto de era 0 (choza redonda de ramas y paja, choza de troncos y barro con techo de paja) para que lo apruebe el usuario → D4 espaldas con torso propio + variantes (antes de P4) → familia de era 0 → familia de era 1 → niños, ancianos, pose colgando y retratos (antes de P6) → gaviotas y nubes (P9) → LOD (P10) → producción y mercados (R71) → soldados por era (R72) → yacimientos visibles (R73) → templo en 6 etapas (al final). Faltantes L001–L010 en el panel, cada uno con su plan.

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
10. Decisiones del 20-10 que no se reabren: terreno procedural (R59), ratón RTS (R60), cámara sin giro (R61), mar de `pixel-cimientos` y río de la muestra (R65), campos en 6 etapas (R66), UI híbrida HTML/CSS (R70), catálogo de estructuras (R74, `gdd/estructuras.md`).

## Lecciones (no repetir)
- Los avisos de inactividad de otra sesión pueden ser **viejos**: antes de dar a alguien por parado, mira `ListAgents` (busy/idle) y `git log`.
- Si todas las sesiones paran a la vez sin entregar nada, casi seguro es el **límite de uso** de la cuenta: espera al reinicio y reenvía las tareas.
- En Windows, un `vite` en marcha bloquea mover o renombrar las carpetas que vigila.
- Las pruebas del panel nunca tocan carpetas reales: usan variables de entorno y carpetas temporales (una prueba borró el atlas, E003).
- El CLI de la bitácora numera por longitud de lista y ordena por versión; no edites IDs a mano sin renumerar.
- `npm run arte` escribe de forma atómica (carpeta temporal + `os.replace`) porque otras sesiones leen el atlas mientras tanto.
