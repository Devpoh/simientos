# Cámara 2D (R60, R61)

> Reescrito el 20-10 para el pivote a pixel art: la cámara 3D (giro, inclinación, FOV, colisión con el relieve, oclusión) queda obsoleta y se borra de aquí — está archivada en `D:/Recursos GC/3d/docs-sedimento/` si hace falta consultarla. **Sin giro ni inclinación** (R61): vista isométrica fija, solo desplazar y hacer zoom. Los edificios sí giran en 4 orientaciones al colocarlos (`construccion.md`), la cámara no. Lógica pura y testeada en `logic/camara.ts` (`tests/camara.test.ts`); la escena solo lee ratón/teclado y aplica el resultado (`render/controlCamara.ts`).

## 1. Controles (R60 — el ratón es RTS, no de cámara)

| Acción | Entrada |
|---|---|
| Desplazar | **WASD**, **botón central** arrastrando, o **bordes de pantalla** (margen `margenBordePx`) |
| Zoom | Rueda, por **pasos enteros**, hacia el cursor (el punto bajo el ratón no se mueve) |
| Selección / órdenes | **Izquierdo** (caja de selección o coger unidad) y **derecho** (órdenes) — ver `seleccion.md`. El botón izquierdo ya **no** mueve la cámara (eso era R15, sustituido) |

## 2. Zoom por pasos enteros

- Pasos: `zoomPasos` = **1, 2, 3, 4** (nunca fraccionario, nunca por debajo de ×1 — pixel art con escalado entero). `zoomInicial` = 1.
- `pasoZoom(pasos, zoom, sentido)` avanza o retrocede un paso en la lista y se queda en los extremos.
- `zoomHaciaCursor` calcula el nuevo centro para que el punto del mapa bajo el cursor no se mueva, salvo que lo impidan los límites del mapa.
- `zoomEnfriamientoMs` = 60: tiempo mínimo entre dos pasos de zoom consecutivos (evita que la rueda dispare varios pasos de golpe).

## 3. Límites del mapa

- `limitesMundo(tilesU, tilesV, tile, margen, alturaPx)` calcula la caja del **rombo isométrico** (u hacia la derecha, v hacia la izquierda) más un margen para poder mirar un poco más allá del borde.
- Margen usado: `margenLimitePx` = **64 px**.
- `limitarCentro` mantiene la vista dentro de esa caja; si la vista es más grande que el mapa (mucho alejado), se centra en él en vez de forzar un límite imposible.

## 4. Velocidad y sensación

- `velocidadTeclado` = 520 px/s, `velocidadBorde` = 420 px/s (en píxeles de **pantalla**, igual a cualquier zoom — en el mundo es menor cuanto más acercado). Diagonal normalizada: no va más rápido que un solo eje.
- `deltaMaxMs` = 100: el `dt` de un fotograma se acota ahí, así un tirón tras una pausa larga no manda la cámara de un salto.
- Sin suavizado exponencial (eso era parte de la cámara 3D libre): el movimiento es directo, a velocidad constante — es una vista fija, no una cámara orbital.

## 5. Arquitectura

`logic/camara.ts` (puro, sin Phaser): `limitesMundo`, `limitarCentro`, `arrastrar`, `desplazar`, `direccionBordes`, `pasoZoom`, `aMundo`, `zoomHaciaCursor`. `render/controlCamara.ts` traduce eventos de ratón/teclado de Phaser a llamadas de estas funciones y aplica `EstadoCamara` a la cámara de la escena.

## 6. Pruebas Vitest (ya existen, `tests/camara.test.ts`)

Límites del mapa (rombo, mapas rectangulares, mapa menor que la vista), arrastre con botón central (a cualquier zoom, sin salirse del borde), desplazamiento con teclas y bordes (velocidad constante en pantalla, diagonal normalizada, independiente de los FPS), zoom por pasos (enteros, crecientes, el punto bajo el cursor no se mueve, los límites mandan sobre el cursor cerca del borde).
