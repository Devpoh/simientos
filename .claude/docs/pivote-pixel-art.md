# Pivote a pixel art 2D (decidido el 2026-10-20) — LEER ANTES DE TOCAR NADA

> **Quién lo decidió:** el usuario (R49–R55 en `games/sedimento/docs/requisitos-usuario.md`).
> **Resumen:** se abandona el render 3D (three.js, modelos y texturas descargados) y se produce el juego **solo en pixel art 2D isométrico**, sobre **la misma base de juego** (la lógica pura de `src/logic/`, la bitácora, el panel y los documentos). Los sprites y generadores que ya se hicieron en `prototypes/imperium-muestra/` **se usan, no se rehacen**.
> Hay que dejar todo documentado (R40) y registrar el trabajo en la bitácora para que el panel (`npm run panel`, http://localhost:4400) lo muestre.

---

## 1. Qué se conserva y qué se ELIMINA (R57: limpiar el contexto)

El usuario ordenó **eliminar toda la documentación y los recursos que ya no se van a usar** (todo lo 3D), para que el contexto de las sesiones no se llene de información obsoleta. **No se archiva: se borra.** La seguridad es git: antes de borrar, commit local de todo lo pendiente (también lo no versionado) y `git tag pre-pixel-art`; el borrado va en **un commit aparte** (`chore: eliminar documentación y recursos 3D obsoletos (R57)`), de modo que todo es recuperable con `git show pre-pixel-art:<ruta>`. Nunca `push`.

| Se conserva (es la base) | Se ELIMINA (tras el tag) |
|---|---|
| `games/sedimento/src/logic/**` (lógica pura, sin motor) y sus tests; lo que dependa de hexágonos o de three se revisa y se limpia | `src/render/**` (three.js), `src/galeria.ts`, `src/exportarModelos.ts`, `src/ui` que solo sirva al 3D |
| `docs/prompts/maestro.md` (la visión: mecánicas, economía, sociedad) y `camara.md` (recortado a lo que valga en 2D), `espertativas/` (imágenes de la meta de ambiente y composición), `docs/brief.md`, `vision.md`, `gdd/simulacion.md`, `gdd/mapa.md`, `gdd/construccion.md`, `gdd/camara.md` (revisados) | `public/modelos/`, `public/recursos/{hdri,modelos3d,texturas}`, `recursos-sin-revisar/` (texturas, HDRI, previews), `docs/recursos/catalogo.md` y `docs/creditos.md` de assets 3D |
| `docs/requisitos-usuario.md` completo (historial de lo que pidió el usuario; solo se marcan como sustituidos R47/R48 y lo 3D) | `docs/prompts/direccion-artistica.md` y `recursos-recomendados.md` (arte 3D; si algo sigue valiendo —composición, hora dorada, legibilidad— pasa a `gdd/pixel-art.md` antes de borrar), `gdd/arte.md` (comparativa 3D/pixel; se reemplaza por `gdd/pixel-art.md`), `docs/archivo/` (estado hexagonal) |
| bitácora (`studio/bitacora.mjs`), panel (`studio/panel`), skills de método (`fase`, `roadmap`, `autopiloto`, `bug`, `playtest`, `carencias`…), reglas, `sesiones.md` | skills `threejs-*`, plantilla `templates/three-ts`, reglas de `.claude/rules/` que hablen de three/modelos; en el panel, el código y las pestañas de modelos 3D, materiales PBR y HDRI |
| nombre provisional CIMIENTOS, slug `sedimento` (R36), cero gasto (R43), todas las ideas del juego (R34) | `prototypes/pixel-cimientos/` (superado por la muestra nueva) y, **cuando `npm run arte` reproduzca sus entregables**, `prototypes/imperium-muestra/` (queda su `README.md` de errores → `docs/gdd/pixel-art.md`) |

**Pasos de la limpieza (los hace A en P0, con C):**
1. `git add -A` (commit local) + `git tag pre-pixel-art`.
2. Hacer la lista exacta de archivos a borrar (los de la columna derecha; si dudas de uno concreto, A decide) y borrar en un commit aparte.
3. Buscar referencias muertas: `grep -ri "three\|modelo\|glb\|pbr\|hdri\|hex[aá]g" docs .claude games/sedimento/CLAUDE.md CLAUDE.md` y corregir o quitar cada una; reescribir `games/sedimento/CLAUDE.md` (stack, comandos, «trampas»), `docs/versiones.md`, `gdd/README.md` y `traspaso.md` para pixel art. Los documentos resultantes deben ser **más cortos**, no más largos.
4. Bitácora: las fases 3D no se «arrastran»: cerrarlas como obsoletas y que el roadmap nuevo (pixel art) sea lo que muestre `estado` y el panel. Registrar una `decision` (R49 + R57) y una `nota` con el hash del tag.
5. Panel: retirar sus secciones 3D, añadir «Pixel art propio» (§9) y correr `npm run panel:probar`.
6. Actualizar la memoria del estudio (`sedimento-rumbo-2026-10-19` queda sustituida) y comprobar que `npm run check` sigue en verde tras el borrado.
Regla permanente: **no volver a descargar ni a documentar arte 3D**.

## 2. Stack objetivo

- **Phaser 4 + TypeScript estricto + Vite + Vitest** (plantilla verificada `templates/phaser-ts`). Para las APIs de Phaser 4, comprobar con context7; no suponer.
- **Lienzo lógico 960×540** (resolución base de la muestra), `pixelArt: true`, filtro *nearest*, `roundPixels`, escalado **solo por enteros** (×2 = 1080p, ×4 = 4K). Nada de píxeles de distinto tamaño ni zoom no entero.
- Vista **isométrica 2:1**, tile **32×16**. Cámara con arrastrar/desplazar y zoom por pasos enteros. **LOD por zoom** (idea del usuario): cerca = detalle completo; medio = sprites simplificados a la mitad (tile 16×8, ciudadanos como puntos de 2–3 px); lejos = mapa estratégico de iconos. Los generadores producen las versiones simples automáticamente.
- **Pipeline de arte:** los generadores Python se copian a `tools/arte-pixel/` (Pillow + numpy + scipy) y un script (`npm run arte`) escribe en `games/sedimento/public/recursos/pixel/`: **atlas PNG + JSON** con, por sprite, `ancla de pies`, `huella en tiles (w×d)`, `altura (para sombra)`, `frames/etapas/orientaciones`, `puertas`. El juego **no genera arte en ejecución**: carga atlas.
- **Terreno:** el mapa se hornea en trozos PNG a partir del *heightfield* (relief mapping de `terreno.py`/`render.py`) y se exportan **máscaras** (altura, material, agua, pendiente) que alimentan la rejilla de ocupación. El agua se anima con 4 fotogramas.
- **Rendimiento: mínimo 60 fps siempre (R56, requisito duro)**. Presupuesto y método en §12.

## 3. Inventario de lo ya hecho (usar tal cual, mejorar dentro del mismo estilo)

Todo está en `prototypes/imperium-muestra/` (ejecutar `python generar.py`; entregables en `salida/`, visor con `python servir.py` → http://localhost:4410). **El prototipo no se importa desde `games/` (regla de prototipos): se copia a `tools/arte-pixel/` y se limpia.**

| Archivo | Qué es | Notas para producción |
|---|---|---|
| `paleta.py` | **Paleta cerrada de 59 colores** en 14 rampas (sombra fría → luz dorada). Todo se dibuja con `c(rampa, tono)` | **No añadir colores sin permiso de A** (máx. 64). Verificable con `entregables.py` |
| `util.py`, `fuente.py` | ruido, rampas de oscurecer/aclarar; **fuente propia 4×5 con ñ y tildes** + logotipo | Para más legibilidad se puede añadir una fuente 5×7 *del mismo estilo* |
| `iso.py` | Motor de sprites isométricos por caras (mapeo afín exacto, textura por función, contorno selectivo) | Base de todos los edificios |
| `edificios.py` | Casas 2×2 / 3×2 con tejas individuales, estuco, postigos, **tejado con los dos faldones** | Falta variar tipologías y generar **6 etapas de obra (R22)** |
| `edificios2.py` | Puestos de mercado (toldos de colores y mercancías), faro, puente de 2 arcos, torre, solar y casa en obra | El puente y el faro tienen reglas de colocación (ver §4) |
| `templo.py` | Templo de Júpiter 5×5 en **3 etapas** (solar / obra / terminado) | Generar las 6 etapas |
| `personajes.py`, `personajes_extra.py` | **5 oficios × 2 géneros**, 16×24, idle + 6 fotogramas de caminar + de espaldas; poses martillar, cultivar, comerciar, cargar (saco/ánfora/cesta/caja), rezar | Faltan niños y ancianos, más variantes de ropa/pelo/piel, la pose «colgando» (§7) y 4 direcciones completas |
| `mitologicos.py` | Minotauro, centauro, sátiro (**versión 1, elegida por el usuario**) | No cambiar de estilo; los intentos v2/v3 están en `descartados/` |
| `animales.py`, `caballo.py` | Oveja, vaca, caballo (polígonos con anatomía), gallina | |
| `arboles.py`, `barcos.py`, `props.py` | Cipreses, pinos, encinas, olivos, arbustos, rocas; galera, mercante, pesquero; cajas, barriles, carretas, pozo, fuente, brasero, valla, estandarte | Los barcos **se validan contra la máscara de agua** |
| `terreno.py`, `render.py`, `plano.py` | Terreno continuo (costa, río, colinas), luz de hora dorada única, sombras proyectadas, agua de 4 fotogramas, calles/campos | Referencia del terreno horneado |
| `escena*.py`, `animacion.py`, `hud.py` | Composición, animación a 30 fps (bucle de 4 s) e interfaz en español | **Solo referencia visual**; el código de producción es TypeScript |
| `entregables.py` | Hoja de sprites, paleta (PNG + hex) y **verificación automática** (paleta, rejilla, ampliación exacta) | Pasarlo a `npm run arte:verificar` |

**Normas de estilo aprobadas** (no se discuten): resolución base 960×540; tiles 32×16; ciudadanos 16×24; luz única desde la izquierda (caras izquierdas cálidas, derechas frías, sombras hacia la derecha); contorno selectivo del color del vecino oscurecido (no negro); sin antialiasing; dithering solo en degradados (agua profunda, bruma); pixel art «de 2026», no de 1990.
Los **errores cometidos y sus reglas** están en `prototypes/imperium-muestra/README.md` (tabla «Fallos cometidos»); son la **lista de aceptación de todo sprite nuevo** (§10).

## 4. Colisiones (R50) — diseño obligatorio

**Problema de la muestra:** las rutas se dibujaron a mano y el orden de dibujo solo miraba el terreno; por eso los ciudadanos podían pasar por encima o por debajo de las casas y los objetos podían montarse sobre edificios. En el juego real **nada se mueve ni se coloca sin pasar por una única fuente de verdad**.

1. **Rejilla de ocupación única** (`logic/ocupacion.ts`, lógica pura y testeada). Resolución: 1 tile = 4×4 subceldas. Capas: *terreno* (agua profunda, acantilado, pendiente máxima), *estructuras* (huella de cada edificio), *objetos* (props, troncos de árbol, rocas), *dinámica* (unidades). Cada celda dice `libre | bloqueada | puerta(edificio) | camino`.
2. Cada sprite del atlas trae su **huella** (w×d tiles) y **ancla de pies** en el JSON; la huella es la que bloquea, no el dibujo. Las **puertas/accesos** son celdas especiales: el ciudadano que entra pasa a estado `dentro` (se oculta) y sale por la misma puerta.
3. **Colocación (construcción libre, R21):** `puedeColocar(huella, x, z, giro)` rechaza solapes con estructuras/objetos, agua, pendiente excesiva y celdas de camino reservadas; devuelve el motivo (se muestra en la UI). Los **objetos decorativos y props respetan las huellas**; apilar solo con regla explícita (p. ej. andamio sobre obra). Edificar/derribar actualiza la rejilla y **replanifica** las rutas afectadas.
4. **Navegación:** A* (o *flow field* para grupos) sobre la rejilla, coste bajo en calles, suavizado de ruta, evitación local entre unidades. **Una unidad nunca entra en una celda bloqueada**; si no hay camino, queda en estado `bloqueado` (icono) y se avisa.
5. **Orden de dibujo (y-sort) con una sola regla:** clave = `u+v` del punto de pies (unidades) o del vértice frontal de la huella (edificios). Excepciones **declaradas** en datos (unidad «sobre puente/andamio/escalera» = capa `sobre`). Un objeto nunca se dibuja *dentro* de otra huella.
6. **Pruebas Vitest obligatorias (de cada fase que toque movimiento o colocación):** (a) propiedad: 200 ciudadanos × 10 000 ticks sin ninguna posición en celda bloqueada; (b) `puedeColocar` rechaza solapes y agua; (c) el *pathfinding* rodea edificios y replanifica al construir; (d) ocupación correcta tras derribar; (e) y-sort determinista.
7. **Verificación visual:** tecla **F3** pinta huellas, celdas bloqueadas, puertas y rutas; `exponer()` publica `colisionesViolaciones` (debe ser **0**) para que `npm run shot` lo compruebe.

## 5. Selección múltiple y órdenes a ejércitos (R51)

- **Entidades seleccionables:** unidades, animales y edificios. Selección por **máscara de píxeles del sprite** (con tolerancia) y *hash* espacial; funciona con zoom y desplazamiento.
- **Clic** = la más cercana al cursor con prioridad unidad > animal > edificio > suelo. **Mayús/Ctrl + clic** añade o quita. **Arrastrar sobre el vacío = caja de selección** (borde dorado discontinuo animado). **Doble clic** = todos los del mismo tipo/oficio visibles. **Ctrl+1…9** guarda un grupo, **1…9** lo recupera (doble pulsación centra la cámara). **Esc** o clic en vacío deselecciona.
- **Feedback:** anillo elíptico bajo los pies, contador («×12»), panel de grupo con miniaturas (clic en una miniatura = dejar solo esa), resaltado al pasar el ratón.
- **Órdenes:** botón derecho = mover; con soldados: **formaciones** (línea, columna, cuña, cuadro) calculadas con huecos libres de la rejilla, velocidad del grupo = la del más lento; atacar-mover, patrullar, parar, mantener posición; **Mayús** encadena puntos de ruta. Cada unidad usa la navegación de §4 (líder + desplazamientos).
- **Coger y soltar (§7) no choca con la caja:** arrastrar sobre una **unidad** (mantener ≥ 250 ms o mover > 4 px) la coge; arrastrar sobre el **suelo vacío** hace la caja.
- **Pruebas:** caja con N entidades, prioridades, grupos, formación sin solapes ni celdas bloqueadas.

## 6. Ficha de ciudadano estilo Tropico 6 (R52)

Al hacer clic en un ciudadano se abre su **ficha** (panel pixel art con la paleta del juego, textos en español).

- **Datos** (`logic/sim/ciudadano.ts`, versionados para guardar): nombre y apellido/patronímico (listas mediterráneas/sumerias), edad (niño/adulto/anciano), género, aspecto (piel/pelo/ropa → variante de sprite), **rol/oficio** (campesino, artesano, comerciante, soldado, sacerdote… y desempleado/niño) con **nivel de habilidad** y experiencia.
- **Personalidad:** 3–4 rasgos de un catálogo con efectos reales (Trabajador, Perezoso, Devoto, Valiente, Cobarde, Sociable, Reservado, Ambicioso, Frugal, Rencoroso, Generoso…).
- **Humor:** felicidad 0–100 con **desglose de factores** (comida, vivienda, trabajo, fe, seguridad, ocio, familia, impuestos, clima) y **necesidades** con barras (hambre, descanso, fe, ocio, seguridad).
- **Familia:** pareja, hijos, padres, hermanos, con árbol; soltero/huérfano; relaciones simples (amistad/rivalidad) y lealtad/facción/religión.
- **Vida:** vivienda y lugar de trabajo (enlaces: la cámara salta), riqueza, historial de hechos y un **pensamiento actual** en una frase según su estado.
- **UI:** retrato 48×48 (cabeza del sprite ampliada) y pestañas *Resumen / Familia / Necesidades / Trabajo / Historial*; tooltip al pasar el ratón (nombre, oficio, icono de humor); botones «seguir» (cámara), asignar oficio, vivienda y trabajo.
- **Coger con el ratón y llevarlos a donde quieras:** al cogerla, la unidad se dibuja **levantada** (pose «colgando» de 2 fotogramas, sombra en el suelo, ligera rotación) y se resalta el destino válido bajo el cursor (verde/rojo según `puedeColocar`). Al soltar: suelo libre → cae con rebote y **se ajusta a la celda libre más cercana (nunca dentro de una huella)**; edificio con vacante → se asigna (vivienda o trabajo según el tipo); agua/obstáculo → vuelve a su sitio con animación. Los rasgos pueden reaccionar (guiño a Tropico: a algunos no les gusta que los levanten).
- **Rendimiento:** existen datos para todos los ciudadanos, pero solo se dibujan individuos cerca de la cámara; lejos se agregan.

## 7. Ficha de estructuras (R53)

Cada edificio muestra al seleccionarlo (y barra flotante al pasar el ratón; siempre visible si está por debajo del 50 %):

- **Durabilidad / condición** 0–100 con barra, degradación (uso, clima, incendio, asedio), reparación por trabajadores con coste; por debajo del 50 % baja la eficiencia, por debajo del 20 % riesgo de colapso.
- **Producción:** entradas → salidas por día, eficiencia actual y **bloqueos** («falta madera», «faltan trabajadores»).
- **Trabajadores** asignados/capacidad (con retratos clicables), **almacén** (inventario), **consumo y mantenimiento** (coste/día), **efectos** en el entorno (felicidad, seguridad, fe…).
- **Estado de obra** (etapa 1–6, %, motivo del retraso) y acciones: mejorar, reparar, demoler, pausar, prioridad.
- Datos en `logic/sim/edificio.ts` y `data/edificios.json` (balance en `tuning`, con su porqué).

## 8. Hoja de ruta propuesta (A la convierte en fases con `/roadmap`)

| Fase | Resultado comprobable | Quién |
|---|---|---|
| P0 | Decisión registrada (R49–R55), `git tag pre-pixel-art`, 3D archivado, docs y `CLAUDE.md` del juego actualizados | A + C |
| P1 | `tools/arte-pixel/` con los generadores del prototipo, `npm run arte` y `arte:verificar` (paleta, ampliación exacta); atlas + JSON en `public/recursos/pixel/` | B (+D) |
| P2 | Phaser 4 a 960×540 con escalado entero, cámara (arrastrar/zoom), terreno horneado y edificios desde el atlas | B |
| P3 | `ocupacion.ts` + `puedeColocar` + F3 de depuración + tests de §4 | B |
| P4 | Navegación (A*) y ciudadanos que caminan, entran y salen de edificios; y-sort con regla única; `colisionesViolaciones = 0` | B |
| P5 | Selección múltiple, grupos, formaciones y órdenes (§5) | B |
| P6 | Datos de ciudadanos (nombre, familia, rasgos, humor) y ficha; coger y soltar (§6) | B (+D para la pose «colgando» y retratos) |
| P7 | Edificios con durabilidad/producción y su ficha (§7) | B |
| P8 | Construcción libre con validación y las **6 etapas de obra** (R21/R22) | B (+D para etapas) |
| P9 | Ambiente vivo: agua, humo, banderas, animales, barcos con reflejo; luz del día | B / C |
| P10 | LOD por zoom (3 niveles) y optimización (60 fps) | B / A |

Cada fase: ≤ 5 criterios, `npm run check` + `npm run shot` en verde, captura mirada (R12), registro en bitácora y commit local `feat(sedimento): P4 título`. **Nunca `push`.**

## 9. Documentación y panel (R40, R54)

- **Antes de empezar:** `node studio/bitacora.mjs estado`, `games/sedimento/CLAUDE.md`, `.claude/docs/sesiones.md`, este archivo y `prototypes/imperium-muestra/README.md`. Mirar `games/sedimento/espertativas/` (R39) y recordar que ahora el destino visual es **el pixel art de la muestra**, no los 3D realistas.
- **Menos documentos, más cortos (R57):** lo obsoleto se borra (§1); no se reescribe «por si acaso».
- **Documentos nuevos** (breves, con criterios comprobables): `docs/gdd/pixel-art.md`, `colisiones.md`, `seleccion.md`, `ciudadanos.md`, `estructuras.md`. Actualizar `gdd/arte.md`, `docs/versiones.md`, `docs/recursos/catalogo.md` (los sprites propios van con licencia «propio») y `.claude/docs/traspaso.md`.
- **Panel:** registrar en la bitácora (`fase`, `error`, `decision`, `aprende`, `nota`, `reco`, `falta`) todo lo que se haga. Ampliar el **Art Direction Lab** (`studio/panel/server.mjs`) con una sección **«Pixel art propio»** que liste `public/recursos/pixel/` (atlas, hoja de sprites, paleta, animación) con su origen «propio (generado por código)». Si se toca `studio/`, correr `npm run panel:probar`.
- **Aprendizajes reutilizables** → una línea en `studio/aprendizajes.md`.

## 10. Lista de aceptación de todo sprite nuevo (errores ya cometidos)

1. Revisar **todas las poses, orientaciones y etapas**, no solo la principal; verlo **ampliado ×8 y a tamaño real** dentro de la escena (R12).
2. **Tejados a dos aguas con ambos faldones**; frontón alineado con el borde del tejado.
3. **Ancla en el punto de apoyo real** (la base de una torre cilíndrica baja r/2 por delante de su centro); zócalo/sombra de contacto.
4. **El agua sale del terreno, nunca del sprite**; los barcos se colocan solo con `agua_valida()` (casco + deriva); los puentes se colocan con el eje del río y apoyan los estribos en ambas orillas.
5. Cargas y herramientas **ancladas a las manos**; nada de bloques flotando junto a la cabeza.
6. Oficios distinguibles por **silueta y contraste de color**, no solo por forma; hombres y mujeres.
7. Animales y criaturas: **anatomía por polígonos** y proporciones reales (cabeza, cuello, patas con articulaciones); estilo de criaturas = **versión 1 aprobada**.
8. Sin colores fuera de paleta, sin antialiasing, ampliación exacta (`entregables.py`).
9. Dejar **espacio entre estructuras**: calles ≥ 2 tiles las principales y ≥ 1,2 las travesías, ≥ 2 tiles entre manzanas (la muestra se vio «pegada»).
10. Todo lo vivo se anima y **cierra en bucle** (agua, humo, banderas, llamas, ciudadanos, animales).
11. **El estilo lo valida el usuario con UN boceto pequeño antes de dibujar una familia entera.** Una vez aprobado, no se cambia.

## 11. Sesión D opcional: artista de sprites

Se abre solo si A tiene una cola de arte (etapas de obra, variantes, niños/ancianos, 4 direcciones, LOD).
- **Modelo y esfuerzo recomendados: Sonnet 5.5 · alto.** Necesita leer imágenes (`Read` de PNG) y escribir geometría con numpy; con esfuerzo medio se salta la revisión visual y repite los fallos de §10. **Opus 5.5 · alto solo** para hitos de dirección de arte nuevos que A decida (rediseñar el templo, otra civilización).
- Solo toca `tools/arte-pixel/` y `games/sedimento/public/recursos/pixel/`. **No toca código del juego ni `logic/`.**
- Recibe tareas de A con el formato de `sesiones.md` (`TAREA D3 para D: …`) y entrega con `HECHO D3 ✅|⛔`: hoja PNG ampliada, JSON del atlas (ancla, huella, frames), captura mirada y la lista de §10 marcada.
- Si una petición no la resuelve a la segunda, sube a A (regla de `sesiones.md`).

## 12. Presupuesto de rendimiento: mínimo 60 fps (R56)

**Regla:** el juego va **a 60 fps como mínimo** (≤ 16,6 ms por fotograma, p95 ≤ 16,6 ms y nunca por encima de 33 ms) en un portátil medio, con la ciudad «grande» de referencia (≥ 300 ciudadanos activos, ≥ 150 edificios, ≥ 600 árboles, agua y humo animados). **Una fase no se cierra si baja de eso.** La animación de la muestra (30 fps, GIF) es solo un entregable de vista previa: en el juego todo se actualiza a ≥ 60 fps (los sprites se dibujan a píxel entero; la lógica se interpola).

**Cómo se garantiza (se aplica desde la P2, no al final):**
1. **Simulación desacoplada del dibujo:** *fixed timestep* de lógica (10–20 Hz) con interpolación al dibujar; todo lo que dependa del tiempo usa delta acotado. El *pathfinding* se reparte en fotogramas (presupuesto de ms por tick) y puede ir en un *Web Worker*.
2. **Terreno horneado** en trozos PNG (sin recalcular); solo se dibujan los trozos visibles. El agua animada es un cambio de textura de 4 fotogramas, no un cálculo por píxel.
3. **Atlas y *batching*:** todos los sprites en pocos atlas; ninguna textura suelta; pocas llamadas de dibujo.
4. **Culling + y-sort solo de lo visible**; orden incremental (los objetos casi no cambian de orden entre fotogramas).
5. **Cero asignaciones en el bucle** (*pools* de sprites, partículas de humo y ciudadanos; reutilizar vectores/arrays). Vigilar el recolector de basura.
6. **Ciudadanos híbridos:** individuos completos solo cerca de la cámara; lejos, grupos agregados o puntos. **LOD por zoom** (3 niveles, §2).
7. **Rejilla y *hash* espaciales** para colisiones, selección y vecinos (nada de recorrer todas las unidades).
8. **Interfaz barata:** los paneles (HTML/CSS, R70) se redibujan solo cuando cambian, por eventos y nunca cada fotograma.
9. **Medición automática:** `exponer()` publica `fps`, `msFotoP95`, `msFotoMax`, `nSprites`, `nLlamadasDibujo`; un *script* de `shot`/Playwright carga la ciudad de referencia, la deja correr 20 s y falla si p95 > 16,6 ms. Un panel de depuración (tecla **F2**) muestra esas cifras. Usar la skill `performance-optimization` (medir primero con el perfilador, luego arreglar).
10. **Presupuesto orientativo por fotograma (16,6 ms):** lógica ≤ 3 ms, colisiones/navegación ≤ 2 ms, dibujo de mundo ≤ 6 ms, interfaz ≤ 1 ms, margen ≥ 4 ms.

## 13. Decisiones del usuario tras el pivote (20-10, mandan sobre lo anterior)

- **R58:** lo 3D no se borra, se aparta a `D:\Recursos GC\3d\` (fuera del proyecto). `prototypes/pixel-cimientos` se queda como referencia del mar.
- **R59** terreno procedural horneado al cargar · **R60** ratón RTS (izquierdo = caja, central/WASD/bordes = cámara, derecho = órdenes) · **R61** cámara sin giro ni inclinación; edificios en 4 orientaciones.
- **R65** mar como en `pixel-cimientos` (:5180) y río como en la muestra · **R66** campos en 6 etapas (boceto D2 aprobado) · **R69** gaviotas y sombras de nubes · obra en 6 etapas (boceto D1 aprobado).
- **R70 UI híbrida:** caja, anillos, barras flotantes y vista previa en Phaser; fichas, paneles, HUD y menús en **HTML/CSS superpuesto** (paleta como tokens CSS, fuente pixel OFL local, bordes 9-slice). Fase P2b.
- **R67:** todas las sesiones trabajan por tramos de ≤ 20 min y paran a informar. **R68:** las críticas del usuario se anotan siempre en `requisitos-usuario.md`.
