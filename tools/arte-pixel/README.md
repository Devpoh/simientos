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
- Generadores: `edificios.py`, `edificios2.py`, `templo.py`, `personajes.py`, `personajes_extra.py`, `mitologicos.py`, `animales.py`, `caballo.py`, `arboles.py`, `barcos.py`, `props.py`, `fuente.py` (fuente 4×5).
- `catalogo.py`: **qué se exporta y con qué metadatos** (huella, bloqueo, puertas, etapas, orientaciones, fps). Para añadir un sprite, se añade una `Entrada` aquí.
- `exportar.py` (empaquetado y JSON), `verificar.py`, `vista.py`.

## Formato de `atlas.json` (tipos en `src/data/atlas.ts`)

- `sprites[id]`: `categoria`, `huella {w,d}` en tiles, `bloquea`, `altura` (px desde el ancla), `ancla {x,y}`, `puertas [{i,j,lado}]` (celda de acceso fuera de la huella), `etapas` (estados de obra en orden) y `estados`.
- `estados[nombre]`: `fps` (0 = imagen fija) y `orientaciones[ori]` = lista de claves de `frames`.
- `frames[clave]`: `atlas`, `x`, `y`, `w`, `h`, `ancla` (propia de cada fotograma) y, si procede, `puntos` (p. ej. `chimenea`).
- Orientaciones: ciudadanos `se` (frente), `sw` (frente volteado), `ne` (espaldas), `nw` (espaldas volteado); animales y criaturas solo `se` (mira a la derecha) y `sw`; `u`/`v` = eje del sprite en la rejilla (cumbrera, eslora, valla); `unica` = sin variantes. Una orientación puede repetir los fotogramas de otra.
- **Ancla:** pies en lo puntual; centro de la huella en lo que ocupa tiles. En estructuras, colocar el ancla en el centro de la huella reproduce la colocación de la muestra (esquina trasera de la huella = origen del sprite).

## Reglas de estilo (ver `.claude/docs/pivote-pixel-art.md` §3 y §10)

Luz única desde la izquierda, sin antialiasing, contorno selectivo (no negro), tejados con ambos faldones, estilo de criaturas = v1 aprobada. El estilo no se cambia sin que lo valide el usuario con un boceto.

## Cambios respecto al prototipo `imperium-muestra`

- `tablas.py` extrae `RID/TABLA/a_indice` de `render.py` para no arrastrar el código de terreno.
- `props.valla(eje="v")` recortaba los postes por la izquierda (el origen estaba demasiado a la izquierda); ahora el origen se desplaza `largo` px.
