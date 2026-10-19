# Auditoría del proyecto (A1 · 19-10-2026)

Inventario de qué funciona, qué es provisional y qué hay que rehacer frente a los textos del 19-10 (R20 terreno continuo, R21 construcción libre, R22 construcción por etapas, R23 estilo sin decidir).
Estado de partida: `npm run check` en verde (10 archivos, 117 tests), three 0.186, ~5 800 líneas en `src/`.

**Leyenda:**
- ✅ **funciona**: se conserva.
- 🟡 **provisional**: funciona, pero se sustituirá.
- 🔴 **a rehacer**: choca con R20–R23.

## 1. Lógica (`src/logic/`, sin three)

| Módulo | Estado | Notas |
|---|---|---|
| `azar.ts`, `ruido.ts` | ✅ | Deterministas y portables. Sirven igual en cualquier estilo y en cualquier motor. |
| `clima.ts` (biomas Whittaker) | ✅ | Independiente de la forma del terreno. |
| `mapa.ts` (valle, río, lago, golfo) | ✅ como **datos** | Las celdas hexagonales se quedan como rejilla **invisible** de datos (bioma, fertilidad, agua, recursos). R20 lo permite: «si hay una rejilla interna, es solo de datos». |
| `hex.ts` | ✅ interno | Solo para indexar las celdas de datos. Nada visible debe depender de él. |
| `alturas.ts` (campo continuo) | 🟡 **sin tests** | Ya convierte las celdas en una superficie suave, con cauces que solo bajan, lagos nivelados y costa en pendiente. Le faltan los tests de A5 y conectarlo al render. |
| `geometria2d.ts` (SAT, polilíneas) | ✅ | Es la base de R21: solapes en coordenadas libres y caminos curvos. |
| `camara.ts` | ✅ | Hecha en C1. Ya acepta `alturaEn`. |
| `reloj.ts` | ✅ | — |
| `rutas.ts` (A* sobre hexágonos) | 🟡 | Sirve mientras las personas no caminen libremente. Con R21 los caminos son polilíneas: habrá que pasar a A* sobre la red de caminos más una rejilla de coste del terreno continuo (versión de la simulación, no ahora). |
| `sim/` (simulación por ticks, raciones, hechos) | ✅ | Núcleo sano y serializable. |
| `sim/obras.ts` + `tipos.ts` | 🔴 parcial | Las obras se guardan por `hex` y tienen 3 etapas (`cimientos → materiales → trabajo`). R21 pide `x, z, giro` y huella, y R22 pide 6 etapas (plano → preparación → cimientos → estructura → cubierta → terminado). La contabilidad de materiales y trabajo se conserva; cambian la ubicación y la máquina de etapas (fase A6). |

## 2. Render (`src/render/`)

| Módulo | Estado | Choque con R20–R23 y sustituto |
|---|---|---|
| `terreno.ts` (prismas hexagonales instanciados) | 🔴 | Hexágonos visibles con borde oscuro que dibuja la rejilla. Lo sustituye `terrenoContinuo.ts`: una malla de la rejilla de `alturas.ts` con color por vértice según bioma (A5). |
| `relieve.ts` (anillos por hexágono) | 🔴 | Las laderas se construyen hexágono a hexágono. Desaparece: el relieve ya está en el campo continuo. |
| `disposicion.ts` | 🔴 | Posición y cota de cada prisma. Lo sustituye `campo.alturaEn` y, para elegir con el ratón, un raycast contra la malla continua. |
| `agua.ts` (516 líneas, por hexágono) | 🔴 | Láminas por celda. Ya hay una versión continua a medias en `docs/archivo/wip/agua-continua.ts.txt` (cintas de río, lámina de lago y mar). Se retoma en A5. |
| `vegetacion.ts`, `decorado.ts` | 🟡 | La técnica (`InstancedMesh`, variación) se conserva, pero reparten por hexágono. Pasan a muestreo por densidad de bioma sobre `alturaEn`. El aspecto final depende del estilo (A7). |
| `paleta.ts` | 🟡 | Colores por bioma reutilizables como color de vértice del terreno continuo. Se quita el «borde de rejilla». |
| `seleccion.ts` | 🔴 | Resalta un hexágono. Pasa a elegir un punto, un edificio o una obra con raycast. |
| `edificios.ts`, `modelos.ts` | 🟡 | Modelos procedurales low-poly y cargador glTF con color de vértice. Son una pieza del **estilo A**, no el sistema definitivo (R23). Se conservan para el comparador. |
| `escena.ts` | ✅ | Renderer, luz, cielo y niebla. Necesitará el HDRI y el tono de la luz que elija A7. |
| `camara/` (rig, entrada, preferencias) | ✅ | Hecha en C1. C2–C6 en curso con B. |
| `mundo.ts` | 🟡 | Compositor: se recablea en A5 con `campo` en vez de `disposicion`. |

## 3. UI, entradas y herramientas

| Pieza | Estado | Notas |
|---|---|---|
| `ui/hud.ts`, `panelCiudad.ts`, `atajos.ts` | 🟡 | HUD mínimo funcional. Las expectativas (`espertativas/`) piden barra de recursos superior, objetivos, minimapa, menú inferior por categorías y tarjeta de obra con progreso: es trabajo de la versión de UI, no de la fase A. |
| `main.ts` | 🟡 | Doble clic «centra en el hexágono» y la fundación usa `hex`. Cambia con A5 y A6. |
| `galeria.ts` (`?galeria`), `exportarModelos.ts` (`?exportar`) | ✅ | Útiles para el laboratorio. |
| `core/test-hooks.ts` + `shot.mjs` | ✅ | — |
| Panel `studio/panel` (server 105 líneas, index 774, `probar.mjs` con 34 comprobaciones) | ✅ | La pestaña «Laboratorio de arte» es mínima. A3 y A4 la amplían. Si crece mucho, conviene separar `index.html` en módulos. |
| `public/modelos` (KayKit hex 0,7 MB, Kenney nature 0,6 MB, propios 0,7 MB) | 🟡 | `kaykit-hex` son piezas **hexagonales**: chocan con R20 y solo valen como referencia en el laboratorio. |

## 4. Dependencias

`three ^0.186.1`, `typescript ^7`, `vite ^8`, `vitest ^5` y `playwright ^1.64`. Están al día, sin dependencias de runtime extra. three se mantiene hasta la v0.9 (R37).

## 5. Qué choca con R20–R23 y orden de sustitución

1. **Hexágonos visibles** (`terreno`, `relieve`, `agua`, `seleccion` y `disposicion`): se sustituyen por el campo continuo en **A5**, que pasa a la partida en **F101**. Las celdas siguen como datos.
2. **Edificios en celdas** (`Obra.hex`, `Edificio.hex`, `Hogar.casa`, fundación): pasan a `{x, z, giro}` con huella y validación SAT, pendiente y agua en **A6**.
3. **Obras en 3 etapas**: la máquina de 6 etapas de R22 llega en **A6**, con la contabilidad actual por debajo.
4. **Estilo fijado de hecho** (low-poly con color de vértice): se congela como «estilo A» y se compara en **A3, A4 y A7**. No se pule más el arte final hasta A7.
5. **Rutas por hexágono**: siguen como provisionales hasta la versión de movimiento de personas.

## 6. Riesgos técnicos y de rendimiento por estilo

| Estilo | Riesgo principal | Coste estimado en three.js | Mitigación |
|---|---|---|---|
| **A · low-poly con color de vértice** | Que se vea plano frente a las expectativas, que son ricas y cálidas. | Bajo: sin texturas, todo en `InstancedMesh`, pocas *draw calls*. | Luz cálida, AO de vértice, niebla y sombras suaves. |
| **B · 3D con texturas PBR** (el favorito por las imágenes) | Memoria de texturas (cada material PBR ocupa de 3 a 4 mapas de 1–2k), *draw calls* con muchos edificios distintos y coherencia entre paquetes de autores distintos. | Alto: con miles de casas hacen falta atlas o `KTX2`, LOD e *instancing* por tipo. Terreno con *splatting* de 3–4 capas en un shader propio. | Presupuesto por escena (≤ 300 *draw calls*, ≤ 1,5 M triángulos, ≤ 256 MB GPU), atlas compartidos, LOD a 2 niveles e impostores lejanos. Medirlo en A7 con una ciudad representativa. |
| **C · pixel art isométrico** | Choca con la cámara libre (giro e inclinación de C1) y con el terreno continuo en 3D: los *sprites* solo se ven bien desde 4 u 8 ángulos fijos. | Bajo en GPU, alto en producción de arte (cada edificio × ángulos × 6 etapas de obra). | Si se elige, la cámara se limita a giros de 90°. Hay que decidirlo antes de C3–C6. |
| **D · híbrido** | Mezcla incoherente (R23 lo prohíbe si no se justifica). | Variable. | Solo con una regla escrita (p. ej. terreno PBR y edificios estilizados con la misma paleta). |

**Riesgos transversales:**
- `vegetacion.ts` ya pinta miles de ejemplares. En el terreno continuo hay que mantener el *instancing* y añadir *culling* por trozos (*chunks*).
- La resolución del campo de alturas (`paso`) fija el coste de la malla. Hay que medirlo en A5 y, si hace falta, dividir el terreno en *chunks* con LOD.
- El cambio de `hex` a coordenadas libres en la simulación toca guardado, tests y panel. Conviene hacerlo de una sola vez en A6.

## 7. Siguiente paso

A5 (terreno continuo en el prototipo), después A3 y A4 (laboratorio) y A6 (construcción libre). A7 decide el estilo con métricas reales.

## Estado tras A5 (19-10)

Lo que la sección 2 marcaba como 🔴 (choca con R20–R23) ya está sustituido:

| Módulo 🔴 original | Sustituto (A5) | Estado |
|---|---|---|
| `terreno.ts` (prismas hexagonales) | `render/terrenoContinuo.ts`: una malla de la rejilla de `alturas.ts`, color por vértice | ✅ hecho |
| `relieve.ts` (anillos por hexágono) | El relieve ya vive en el campo continuo (`alturas.ts`) | ✅ hecho (el archivo se eliminó) |
| `agua.ts` (516 líneas, por hexágono) | `render/agua.ts` continuo: lagos y ríos sobre la rejilla de alturas, mar como plano a `nivelMar` | ✅ hecho |
| `seleccion.ts` (resalta un hexágono) | Raycast contra el terreno continuo; marca un círculo en el punto exacto | ✅ hecho |
| `disposicion.ts` (prisma por hexágono) | Sigue existiendo, pero solo como celdas de datos **invisibles** (bioma, fertilidad…), no como geometría | ✅ hecho |

**Deuda técnica cerrada en A5-limpieza (reco R003):** números mágicos de `alturas.ts`, `terrenoContinuo.ts` y `seleccion.ts` pasados a `tuning.json`; `VECINDAD` exportado una sola vez desde `hex.ts`.

**Sigue pendiente (no era parte de A5):**
- `sim/obras.ts` + `tipos.ts`: las obras todavía se guardan por `hex` con 3 etapas. R21 pide `{x, z, giro}` + huella y R22 pide 6 etapas. Pasa a **A6a**, en curso con A.
- `vegetacion.ts`, `decorado.ts`: la técnica (`InstancedMesh`) se conserva, pero el aspecto (R46: «los árboles, las flores y el decorado no van con la estética») queda para **A5b**.
- Estilo artístico definitivo: sigue sin decidirse (R23), a la espera de A7.
