# Catálogo de recursos visuales

> Sustituye al catálogo de modelos/texturas 3D (borrado en el pivote del 20-10). **Todo es propio: generado por código en `tools/arte-pixel/`, licencia «propio, generado por código».** Nada se descarga. Fuente: `public/recursos/pixel/atlas.json` (inventario real, 2026-10-20: 1196 fotogramas, tile 32×16).

| Familia | Generador | Variantes en el atlas | Estado |
|---|---|---|---|
| Ciudadanos | `personajes.py`, `personajes_extra.py` | 5 oficios (campesino, artesano, comerciante, soldado, sacerdote) × 2 géneros, idle + caminar + poses de oficio | Integrado · faltan niños/ancianos y 4 direcciones completas |
| Criaturas mitológicas | `mitologicos.py` | centauro, minotauro, sátiro (versión 1, aprobada) | Integrado · no cambiar de estilo |
| Animales | `animales.py`, `caballo.py` | caballo (blanco/castaño/negro/palomino), gallina (blanca/parda), oveja (2), vaca | Integrado |
| Vegetación | `arboles.py` | ciprés, encina, olivo, pino (4 variantes c/u), 3 arbustos | Integrado |
| Rocas | `arboles.py`/`props.py` | roca 1–4, roca grande 5–6 | Integrado |
| Viviendas | `edificios.py` | casa 2×2 (4 variantes), casa 3×2 (2 variantes) | Integrado · faltan las 6 etapas de obra (R22, `obra_casa.py` en marcha) |
| Templo | `templo.py` | templo de Júpiter | Integrado en 1 etapa · faltan las 6 etapas de obra |
| Otros edificios | `edificios2.py` | torre, faro, puente de piedra | Integrado |
| Puestos de mercado | `edificios2.py` | cerámica, fruta, pan, pescado, telas | Integrado |
| Barcos | `barcos.py` | galera, mercante, pesquero | Integrado · se colocan solo con `agua_valida()` |
| Props | `props.py` | barril, brasero, cajas (4), carretas (heno, mármol), estandarte, fardo, fuente, leña, pozo, sacos (harina, trigo), vallas (3) | Integrado |
| Ambiente | `animales.py` | gaviota (volar) | Integrado · faltan humo, banderas, agua animada |
| Terreno | `terreno.py`, `render.py`, `plano.py` | heightfield horneado en trozos PNG + máscaras (altura, material, agua, pendiente) | Pendiente de integrar en el juego (P2) |
| Fuente tipográfica | `fuente.py` | 4×5 con ñ y tildes | Integrado (HUD) |

## Herramientas de verificación

`entregables.py` / `npm run arte:verificar`: comprueba que no haya color fuera de la paleta de 59, que la rejilla sea correcta y que la ampliación sea exacta. Pasa antes de cualquier commit de arte (skill `sprite-qa`).

## Lo que no entra aquí

Las imágenes de referencia de ambiente y composición (R39) están en `games/sedimento/espertativas/`, no son un recurso que se integre: son objetivo visual, no sprites.
