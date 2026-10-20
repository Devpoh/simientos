# arte-pixel: generadores de sprites → atlas

Los sprites se dibujan con código (Python + Pillow + numpy + scipy) y se exportan a un atlas para el juego. **El juego no genera arte en ejecución: carga el atlas.** Salida: `games/sedimento/public/recursos/pixel/` (`atlas-N.png`, `atlas.json`, `paleta.png`, `paleta.txt`).

| Comando (desde `games/sedimento`) | Qué hace |
|---|---|
| `npm run arte` | `python ../../tools/arte-pixel/exportar.py`: genera el catálogo y escribe el atlas. Determinista: dos ejecuciones dan los mismos bytes |
| `npm run arte:verificar` | `verificar.py`: 0 colores fuera de la paleta, alfa binario, ampliación x2/x4 exacta, fotogramas dentro del atlas, sin solaparse y con las referencias resueltas |
| `python exportar.py --vista <carpeta>` | además escribe hojas de revisión x1 y x4 con el ancla (cruz roja) y la huella (rombo magenta). Úsalas fuera del repo (carpeta temporal) |

## Archivos

- `paleta.py`: paleta cerrada de 59 colores (máx. 64). Todo se dibuja con `c(rampa, tono)`. **No añadir colores sin permiso de A.**
- `iso.py`, `util.py`, `tablas.py`: motor de sprites isométricos (caras con mapeo afín, contorno selectivo) y utilidades.
- `ui.py`: marcos 9-slice de los paneles HTML (R70). `obra_casa.py`: las **etapas de obra de las casas** (R22): 1 replanteo, 2 preparación, 3 cimientos, 4 estructura, 5 cubierta (la 6 es `edificios.casa()`). Parametrizado por tamaño; la cubierta de la 5 usa las mismas tejas que la casa terminada. `campos.py`: campo de cebada en 6 etapas (boceto aprobado, aún fuera del catálogo).
- Generadores: `edificios.py`, `edificios2.py`, `templo.py`, `personajes.py`, `personajes_extra.py`, `mitologicos.py`, `animales.py`, `caballo.py`, `arboles.py`, `barcos.py`, `props.py`, `fuente.py` (fuente 4×5).
- `catalogo.py`: **qué se exporta y con qué metadatos** (huella, bloqueo, puertas, etapas, orientaciones, fps). Para añadir un sprite, se añade una `Entrada` aquí.
- `exportar.py` (empaquetado y JSON), `verificar.py`, `vista.py`.

## Formato de `atlas.json` (tipos en `src/data/atlas.ts`)

- `sprites[id]`: `categoria`, `huella {w,d}` en tiles, `bloquea`, `altura` (px desde el ancla), `ancla {x,y}`, `puertas [{i,j,lado}]` (celda de acceso fuera de la huella), `etapas` (estados de obra en orden) y `estados`.
- `estados[nombre]`: `fps` (0 = imagen fija) y `orientaciones[ori]` = lista de claves de `frames`.
- `frames[clave]`: `atlas`, `x`, `y`, `w`, `h`, `ancla` (propia de cada fotograma) y, si procede, `puntos` (p. ej. `chimenea`).
- Orientaciones: ciudadanos `se` (frente), `sw` (frente volteado), `ne` (espaldas), `nw` (espaldas volteado); animales y criaturas solo `se` (mira a la derecha) y `sw`; `u`/`v` = eje del sprite en la rejilla (cumbrera, eslora, valla); `unica` = sin variantes. Una orientación puede repetir los fotogramas de otra.
- **Ancla:** pies en lo puntual; centro de la huella en lo que ocupa tiles. En estructuras, colocar el ancla en el centro de la huella reproduce la colocación de la muestra (esquina trasera de la huella = origen del sprite).

## Obras: `etapas` y `huellaObra`

- `etapas` lista los estados de obra en orden; **la última es la estructura terminada**. Las casas con obra (hoy `casa_2x2_a`) tienen `etapa1…etapa6`; el resto, solo `etapa3` (terminada) hasta que lleguen sus etapas.
- `huellaObra[etapa]` = `{u0, v0, u1, v1}` en **subceldas** (1 tile = 4 subceldas = 16 px de suelo), relativo a la esquina trasera de la huella: la huella + lo que sobresale (andamio, material). Para casas 2×2 la huella pura es `{0, 0, 8, 8}`. La **bloqueada** durante la obra es `huellaObra`; la huella pura sigue siendo la de la casa terminada. Los márgenes se calculan al dibujar (cada pieza que sobresale se registra) y el exportador falla si algo sobresale más de 1 subcelda.
- La etapa 5 existe en orientación `u` y `v` (cumbrera); las etapas 1-4 son iguales en ambas (alias).

## Marcos de paneles HTML (9-slice, `ui.py`)

`ui/marco-madera.png`, `ui/marco-piedra.png` y sus variantes `-resaltado.png` (hover/selección): 16×16 px, esquinas de 6×6 con remache (oro en madera, lapislázuli en piedra; el resaltado pasa a oro), lados que repiten cada 4 px y centro de un solo color (el fondo del panel). Entrada `ui` del `atlas.json`: `ancho`, `alto`, `corte {arriba,derecha,abajo,izquierda}`, `repetir: "round"`, `relleno: true` y `estados {normal, resaltado}` con la ruta de cada PNG. CSS (k = 2, 3, 4…, siempre entero):

    .panel { border: calc(6px * 2) solid transparent; border-image: url(/recursos/pixel/ui/marco-madera.png) 6 fill / calc(6px * 2) / 0 round; image-rendering: pixelated; }
    .panel:hover, .panel.sel { border-image-source: url(/recursos/pixel/ui/marco-madera-resaltado.png); }

Revisión: `python bocetos/render_ui.py` (los marcos a ×16 y aplicados como panel a ×4). `validar.py` comprueba cada PNG de `ui/` (paleta, alfa, centro de un solo color), que coincida con su entrada del JSON y que no haya PNG huérfanos.

## Escritura atómica

`exportar.py` escribe todo en `.tmp-arte-*` dentro de la salida y sustituye cada archivo con `os.replace` (con reintentos por Windows), el `atlas.json` el último: quien lea el atlas mientras se regenera nunca ve un JSON a medias.

## Revisión de obras

`python bocetos/render_obra_casa.py [w d [u|v [variante]]]` escribe en `bocetos/` la fila de las 6 etapas (x1 y x4) y comprueba paleta y ampliación exacta. Mira siempre la hoja x4 y la etapa 5 en `u` y en `v`.

## Reglas de estilo (ver `.claude/docs/pivote-pixel-art.md` §3 y §10)

Luz única desde la izquierda, sin antialiasing, contorno selectivo (no negro), tejados con ambos faldones, estilo de criaturas = v1 aprobada. El estilo no se cambia sin que lo valide el usuario con un boceto.

## Cambios respecto al prototipo `imperium-muestra`

- `tablas.py` extrae `RID/TABLA/a_indice` de `render.py` para no arrastrar el código de terreno.
- `props.valla(eje="v")` recortaba los postes por la izquierda (el origen estaba demasiado a la izquierda); ahora el origen se desplaza `largo` px.
