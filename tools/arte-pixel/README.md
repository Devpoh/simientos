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
- `relieve.py`: render por mapa de alturas para formas orgánicas (`almacen.py`). `ui.py`: marcos 9-slice de los paneles HTML (R70). `obra_casa.py`: las **etapas de obra de las casas** (R22): 1 replanteo, 2 preparación, 3 cimientos, 4 estructura, 5 cubierta (la 6 es `edificios.casa()`). Parametrizado por tamaño; la cubierta de la 5 usa las mismas tejas que la casa terminada. `campos.py`: campo de cebada en 6 etapas (en el catálogo como `campo_cebada`).
- Generadores: `edificios.py`, `edificios2.py`, `templo.py`, `personajes.py`, `personajes_extra.py`, `mitologicos.py`, `animales.py`, `caballo.py`, `arboles.py`, `barcos.py`, `props.py`, `fuente.py` (fuente 4×5).
- `catalogo.py`: **qué se exporta y con qué metadatos** (huella, bloqueo, puertas, etapas, orientaciones, fps). Para añadir un sprite, se añade una `Entrada` aquí.
- `exportar.py` (empaquetado y JSON), `verificar.py`, `vista.py`.

## Formato de `atlas.json` (tipos en `src/data/atlas.ts`)

- `sprites[id]`: `categoria`, `huella {w,d}` en tiles, `bloquea`, `altura` (px desde el ancla), `ancla {x,y}`, `puertas [{i,j,lado}]` (celda de acceso fuera de la huella), `etapas` (estados de obra en orden) y `estados`.
- `estados[nombre]`: `fps` (0 = imagen fija) y `orientaciones[ori]` = lista de claves de `frames`.
- `frames[clave]`: `atlas`, `x`, `y`, `w`, `h`, `ancla` (propia de cada fotograma) y, si procede, `puntos` (p. ej. `chimenea`).
- Orientaciones: ciudadanos `se` (frente), `sw` (frente volteado), `ne` (espaldas), `nw` (espaldas volteado); animales y criaturas solo `se` (mira a la derecha) y `sw`; `u`/`v` = eje del sprite en la rejilla (cumbrera, eslora, valla); `unica` = sin variantes. Una orientación puede repetir los fotogramas de otra.
- **Ancla:** pies en lo puntual; centro de la huella en lo que ocupa tiles. En estructuras, colocar el ancla en el centro de la huella reproduce la colocación de la muestra (esquina trasera de la huella = origen del sprite).

## Estado y cola (traspaso D, 21-10)

- **En el catálogo:** ciudadanos (5 oficios × 2 géneros, 4 orientaciones), criaturas, animales, árboles, props, barcos, 5 puestos de mercado, faro, puente, torre, templo (3 etapas), casas 2×2 a-d y 3×2 a-b con `etapa1…etapa6` (`obra_casa.py`), `campo_cebada` (6 etapas, `cultivo`) y los marcos `ui` (`ui.py`).
- **Etapas:** `etapaK` consecutivas y la última es la terminada (B lee `etapaFinal`). `huellaObra[etapa]` = {u0,v0,u1,v1} en subceldas (huella + 1 donde sobresale andamio o material), calculada al dibujar; la etapa final no la lleva. `cultivo: true` = interior sin pisar, linde de 1 subcelda sí.
- **Boceto sin catálogo:** `almacen.py` (almacén de era 1, R80) con `relieve.py` (mapa de alturas + un rayo por píxel: formas orgánicas, paja, barro, chozas redondas). Revisión: `python bocetos/render_almacen.py`. Falta: la puerta de esteras se lee poco, el muro derecho tiene rayas, los sacos son una pila; y las etapas 1-5 con barro y cantos, nunca sillar.
- **Cola en orden:** (1) pulir el almacén de era 1 y hacer sus etapas; (2) era 0: choza redonda de ramas y paja 1×1 y choza de troncos y barro con techo de paja 2×2 (boceto al usuario antes de seguir), luego hoguera, cobertizo, empalizada, altar de piedras, claro de entrenamiento y milicia; (3) D4: espaldas `ne`/`nw` con torso propio y variantes; (4) era 1: casa de barro con techo de paja, santuario, cuartel; (5) niños, ancianos, pose «colgando» y retratos 48×48; (6) gaviotas y nubes (R69); (7) LOD; (8) templo en 6 etapas.
- **Trampas:** ningún color nuevo sin permiso de A (59, máx. 64). Era 0-1: nada de teja, sillar ni enlucido liso (R80). Boceto a A antes de una familia nueva y tramos de ≤ 20 min (R67). `npm run arte` es atómico y determinista; mira `npm run check` antes de commitear y commitea solo `tools/arte-pixel` y `recursos/pixel`. En Windows usa `PYTHONIOENCODING=utf-8`; `Write` exige releer un archivo que cambió; un `rm -rf` o un comando compuesto largo puede denegarse.

## Obras: `etapas` y `huellaObra`

- `etapas` lista los estados de obra en orden; **la última es la estructura terminada**. **Todas las casas** (2×2 a-d y 3×2 a-b) tienen `etapa1…etapa6`. Los muros de la etapa 4 y el material apilado usan el de la pared de cada variante (sillar de piedra o ladrillo de adobe).
- `huellaObra[etapa]` = `{u0, v0, u1, v1}` en **subceldas** (1 tile = 4 subceldas = 16 px de suelo), relativo a la esquina trasera de la huella: la huella + lo que sobresale (andamio, material). Para casas 2×2 la huella pura es `{0, 0, 8, 8}`. La **bloqueada** durante la obra es `huellaObra`; la huella pura sigue siendo la de la casa terminada. Los márgenes se calculan al dibujar (cada pieza que sobresale se registra) y el exportador falla si algo sobresale más de 1 subcelda.
- La etapa 5 existe en orientación `u` y `v` (cumbrera); las etapas 1-4 son iguales en ambas (alias).

## Campos de cultivo (`cultivo: true`)

`campo_cebada`: 3×2 tiles, `etapa1…etapa6` (arado, siembra, brotes, crecimiento, maduro, cosecha), una sola orientación (`unica`), categoría `estructura`, `bloquea: true` y **`cultivo: true`**, sin `huellaObra` (no es obra). El interior no se pisa; la **linde** sí: es la cabecera de tierra pisada del borde, **1 subcelda** (4 px de suelo) por todo el perímetro de la huella. El ancla es el centro de la huella (comprobado: el rombo 3×2 sobre el ancla coincide con el borde del campo en las 6 etapas, `bocetos/campo_huella_x6.png`). Girarlo 90° (2×3, surcos en v) no está dibujado.

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
