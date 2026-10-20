---
name: bench-60fps
description: Mide si el juego mantiene 60 fps con la aldea de referencia, en Chrome con GPU real y 20 s de marcha. Úsala al cerrar fases que añaden sprites, terreno o simulación, y cuando algo "va lento".
---

# Bench de 60 fps (R56)

Desde `games/sedimento` (cierra otras instancias de Chrome: usa ~400 MB):

```
npm run bench -- --zoom 1            # y --zoom 2 (3 y 4 también valen)
npm run bench -- --zoom 1 --sin-vsync --segundos 10 --nombre bench-x1-sinvsync   # diagnóstico
```

Abre Chrome **con ventana y GPU real** (sin SwiftShader), espera a `marcarListo` (el horneado no cuenta), reinicia el medidor, deja correr `--segundos` (20) y escribe `docs/evidencia/bench-<nombre>.json`.

## Umbrales (tuning.rendimiento)

`msFotoP95 ≤ 16,6` y `msFotoMax ≤ 33`. Código de salida: 0 ok, 1 supera un umbral, 2 sin GPU real o fallo de arranque.

## Leer el JSON

- `renderer`: debe ser la GPU (ANGLE … Direct3D11), nunca SwiftShader.
- `fps` / `fpsMin`, `msFotoP95` / `msFotoMax` = peor ventana de 300 fotogramas vista en las muestras (`muestras`, una por segundo).
- `nSprites` = máximo de sprites dibujados a la vez; `zoomReal` confirma el zoom medido.
- Trampa: en un monitor de 60 Hz el intervalo entre fotogramas oscila ~16,7 ± 1 ms, así que `p95` ≈ 17–18 con 60,1 fps perfectos. Compruébalo con `--sin-vsync`: si p95 allí es ≪ 16,6 (ahora ~3 ms), el juego tiene margen y lo que falla es el umbral, no el rendimiento.
- Un máximo suelto de cientos de ms en la primera ejecución suele ser calentamiento (shaders, GC): repite antes de concluir.

## Si falla de verdad

Aplica `performance-optimization`: medir antes de arreglar. Mira primero `nSprites` y `--sin-vsync` (¿CPU o GPU?), luego el culling y el pool de `render/aldeaVista.ts`, las asignaciones por fotograma y el tamaño de los trozos del terreno. Un cambio, vuelve a medir.
