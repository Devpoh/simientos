---
name: bench-60fps
description: Mide si el juego mantiene 60 fps con la aldea de referencia, en Chrome con GPU real y 20 s de marcha. Úsala al cerrar fases que añaden sprites, terreno o simulación, y cuando algo "va lento".
---

# Bench de 60 fps (R56, criterio D034)

Desde `games/sedimento` (cierra otras instancias de Chrome: usa ~400 MB):

```
npm run bench -- --maximizada --zoom 1     # y --zoom 2 (3 y 4 también valen); --maximizada = 1920×969, lienzo a pantalla completa
npm run bench -- --maximizada --zoom 1 --sin-vsync --segundos 10 --nombre bench-max-x1-sinvsync   # margen de CPU y GPU
```

Abre Chrome **con ventana y GPU real** (sin SwiftShader), espera a `marcarListo` (el horneado no cuenta), calienta 3 s, reinicia el medidor, deja correr `--segundos` (20) y escribe `docs/evidencia/bench-<nombre>.json`. Código de salida: 0 cumple, 1 no cumple, 2 sin GPU real o fallo de arranque.

## Umbrales (tuning.rendimiento)

- **Con vsync** (veredicto): fps medio ≥ 59,5, fotogramas perdidos (intervalo > 25 ms) ≤ 0,5 % y máximo ≤ 33 ms.
- **Sin vsync** (`--sin-vsync`, margen): p95 ≤ 8,3 ms. No se usa p95 con vsync: a 60 Hz el intervalo oscila 16,7 ± 1 ms y p95 sale 17–19 con 60 fps perfectos.

## Leer el JSON

- `renderer`: debe ser la GPU (ANGLE … Direct3D11), nunca SwiftShader. `lienzo` = tamaño lógico y zoom aplicados (R83).
- `fps` (media del periodo), `perdidos` y `perdidosPct`, `msFotoMax` (máximo del periodo), `msFotoP95` (peor ventana de 300 fotogramas); `muestras` trae una por segundo.
- `nSprites` = máximo de sprites dibujados a la vez; `zoomReal` confirma el zoom medido. Más ventana con k = 1 (p. ej. 1366×768) dibuja más sprites que a k ≥ 2.
- Un tirón suelto (decenas de ms) en una ejecución que no se repite es ruido del sistema (GC, otro proceso): repite antes de concluir (reco R005).

## Si falla de verdad

Aplica `performance-optimization`: medir antes de arreglar. Mira primero `nSprites` y `--sin-vsync` (¿CPU o GPU?), luego el culling y el pool de `render/aldeaVista.ts`, las asignaciones por fotograma y el tamaño de los trozos del terreno. Un cambio, vuelve a medir.
