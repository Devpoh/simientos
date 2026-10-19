# Cámara de estrategia

> Fuente: `prompts/camara.md` (literal: 22 secciones, 18 comprobaciones y 6 entregables). Requisitos R15 y R28–R31. Este documento fija los **valores de partida** y el estado; si algo no está aquí, manda el texto fuente.

## 1. Controles por defecto (todos reasignables)

| Acción | Entrada |
|---|---|
| Desplazar | WASD y flechas (relativas al giro, diagonal normalizada) · arrastre con el botón **central** · arrastre con el **izquierdo** si no hay herramienta activa (pedido por el usuario el 18-10) · **bordes de pantalla** (opcional, margen de 12 px) |
| Girar | Arrastre con el botón **derecho** · Q/E |
| Inclinar | Arrastre vertical con el botón derecho · R/F · Alt + arrastre |
| Zoom | Rueda, **hacia el cursor** (desactivable) |
| Enfocar la selección | F (doble clic sobre un objeto) |
| Seguir | Mayús + F; cualquier entrada de movimiento lo cancela |

Durante la construcción, el botón izquierdo es de la herramienta y Z/X giran el edificio. La cámara sigue con WASD, la rueda y el botón derecho. Las prioridades de entrada las decide un único `controlEntrada` según la herramienta activa.

## 2. Distancias y vistas

- **Cercana** (~4–10 unidades; 1 hexágono de datos ≈ 1,7): fachadas, obras y trabajadores, con inclinación de 30–45°.
- **Urbana** (10–30): la vista por defecto, a 45–55°.
- **Estratégica y panorámica** (30–maxima): 55–75°, el mapa entero.
- La inclinación por defecto depende de la distancia (curva suave), con un ajuste manual que se suma y se conserva. Límites: no atravesar el suelo y no ponerse por debajo de 20° de cerca.

## 3. Sensación

- Suavizado independiente para posición, giro y zoom con `1 − e^(−k·dt)`. La entrada se nota en el primer fotograma y la frenada dura menos de 0,25 s.
- Velocidad de desplazamiento ∝ distancia^0,9 (sin escalones), desactivable.
- Todo en `tuning.render.camara`, con nombres descriptivos. Cada parámetro está explicado abajo.

### Parámetros de `tuning.render.camara`

| Parámetro | Valor | Qué hace |
|---|---|---|
| `fov` | 34 | Campo de visión vertical (°). Bajo = vista más «de maqueta» |
| `margen` | 1,04 | Holgura al encuadrar el mapa entero (zoom máximo) |
| `cerca`, `cercaRelativa` | 0,1 · 0,02 | Plano cercano: el mayor entre `cerca` y `distancia × cercaRelativa` (evita parpadeos de profundidad) |
| `lejos` | 700 | Plano lejano; el zoom máximo nunca pasa del 90 % |
| `distanciaMin` | 6 | Zoom máximo hacia dentro (distancia al punto de mira) |
| `cabeceoCercaGrados`, `cabeceoLejosGrados` | 45 · 65 | Inclinación automática con el zoom al mínimo / al máximo (curva suave) |
| `cabeceoMinCercaGrados`, `cabeceoMinLejosGrados` | 20 · 20 | Inclinación mínima permitida (no atravesar el suelo ni perder el objetivo) |
| `cabeceoMaxGrados` | 88 | Inclinación máxima (casi cenital) |
| `umbralArrastrePx` | 5 | Píxeles que debe moverse el clic izquierdo para ser arrastre y no clic |
| `alturaMinimaSobreSuelo` | 0,4 | Margen mínimo entre el rayo de la cámara y la superficie (límite duro de la colisión, §4) |
| `velocidadPan` | 0,8 | Velocidad base: fracción de `distanciaReferencia` por segundo |
| `velocidadAdaptativa` | true | Si es false, la velocidad es constante e igual a la de la distancia de referencia |
| `exponenteVelocidad` | 0,9 | Velocidad ∝ distancia^exponente (1 = proporcional) |
| `distanciaReferencia` | 30 | Distancia a la que la velocidad vale exactamente `velocidadPan × distanciaReferencia` |
| `velocidadRotacion`, `velocidadInclinacion` | 1,8 · 0,9 | Rad/s con Q/E y R/F |
| `sensibilidadGiro`, `sensibilidadInclinacion` | 0,006 · 0,004 | Rad por píxel arrastrado |
| `sensibilidadZoom` | 0,0016 | Cambio de distancia (exponencial) por píxel de rueda |
| `zoomAlCursor` | true | El punto bajo el ratón se queda quieto al hacer zoom |
| `invertirRueda`, `invertirGiro`, `invertirInclinacion` | false | Inversiones de ejes |
| `factorPellizco` | 4 | Multiplicador de la rueda con Ctrl o pellizco de touchpad |
| `suavizado` | 13 | Ritmo (1/s) de la posición y de la altura del punto de mira |
| `suavizadoGiro` | 14 | Ritmo del giro y de la inclinación del jugador |
| `suavizadoZoom` | 13 | Ritmo del zoom |
| `topeTeclaFrame` | 0,5 | Segundos máximos de tecla que se cuentan en un fotograma (tras un tirón no se recupera todo de golpe) |
| `teclas` | — | Asignación por defecto de las acciones |
| `bordePantalla` | — | `activo`, `margen` (px) y `velocidad` del desplazamiento por borde |
| `colision.activa` | true | Si es false, la cámara ignora el terreno (útil para depurar) |
| `colision.muestras` | 28 | Puntos del rayo objetivo→cámara que se comparan con el terreno (más = detecta crestas más finas) |
| `colision.holguraBlanda` | 1,2 | Metros extra sobre `alturaMinimaSobreSuelo` para el límite blando: empieza a acortar antes de rozar el suelo |
| `colision.distanciaMinima` | 2,5 | La cámara nunca se acerca más que esto al objetivo, aunque el terreno estorbe |
| `colision.suavizadoAcortar` | 16 | Ritmo (1/s) al acercarse: rápido para no atravesar el terreno (95 % en 0,19 s) |
| `colision.suavizadoLiberar` | 4 | Ritmo (1/s) al recuperar la distancia: lento para que no rebote (95 % en 0,75 s) |
| `oclusion.activa` | true | Atenuar los edificios que tapan el objetivo |
| `oclusion.margen` | 0,12 | Se ensancha el cuerpo del edificio esta distancia: se atenúa un poco antes de rozar la línea de visión |
| `oclusion.opacidadMin` | 0,2 | Visibilidad (0–1) de un edificio atenuado: se sigue viendo su silueta |
| `oclusion.suavizado` | 10 | Ritmo (1/s) de la transición, en los dos sentidos (95 % en 0,3 s) |

**Cómo se mide el suavizado.** Cada eje avanza `1 − e^(−k·dt)` del camino que le queda, así que el resultado no depende de los FPS. Un ritmo `k` deja un 5 % del recorrido pendiente tras `ln(20)/k` s: con `k ≥ 12` la frenada dura menos de 0,25 s (con los valores actuales: 0,23 s, 0,21 s y 0,23 s). En el primer fotograma a 60 fps la cámara ya recorre `1 − e^(−k/60)` ≈ 19 % del camino. Los tests (`tests/camara.test.ts`) fijan ambas condiciones y que el mismo recorrido a 30, 60, 144 y 240 fps acaba en la misma posición (±1 %).

**Cómo se ajusta.** Un `k` más bajo da una cámara más «flotante» (frenada larga); más alto, más seca. Por debajo de ~8 el desplazamiento se siente con retardo. Por encima de ~25 deja de notarse el suavizado.

## 4. Terreno y obstáculos

- **El objetivo sigue la superficie** (`superficieEn` en `main.ts` = el mayor entre `campo.alturaEn` y el agua): la altura del punto de mira se suaviza con el mismo ritmo que la posición, sin brincos sobre las colinas ni al cruzar un lago.
- **Sin atravesar** (`logic/camara.ts: distanciaLibre`, `distanciaDeVista`; `render/camara/rig.ts: resolverColision`):
  1. Cada frame se muestrea el rayo del objetivo a la cámara (`colision.muestras` puntos) contra la superficie. El primer punto bajo la superficie más el margen se afina por bisección.
  2. Cerca del objetivo (que está en el suelo) el margen crece 0,3 m por metro hasta su valor completo; si no, una cámara tumbada a 20° estaría siempre «bloqueada».
  3. Hay dos límites: el **blando** (margen + `holguraBlanda`) mueve la distancia con suavizado (rápido al acortar, lento al recuperar) y el **duro** (solo `alturaMinimaSobreSuelo`) se aplica en el mismo fotograma, así que la cámara nunca queda bajo el suelo aunque el suavizado vaya detrás.
  4. Se suaviza la **proporción** distancia dibujada / distancia pedida, no la distancia: el zoom normal no se arrastra. El zoom y el cabeceo automático siguen usando la distancia pedida.
  - Limitación conocida: cuando una cresta cruza el rayo de golpe, la distancia salta del valor libre al acortado a velocidad `suavizadoAcortar`; la cámara puede rozar unos fotogramas la cresta. No se arregla elevando el cabeceo (cambiaría la inclinación que eligió el jugador).
- **Oclusión** (`logic/camara.ts: edificiosQueTapan`, `render/camara/oclusion.ts`, atenuación en `render/edificios.ts`): cada edificio es un cilindro (radio y alto salen de su modelo y su escala). Si el segmento cámara→objetivo lo atraviesa a su altura, se atenúa hasta `opacidadMin` con transición exponencial y vuelve a 1 cuando deja de tapar. El edificio sobre el que está el objetivo no se atenúa: es lo que se mira.
  - La atenuación usa un atributo por instancia y una trama de ruido ordenado (descarta píxeles), no transparencia: no hay problemas de orden y la sombra del edificio no cambia. Con `opacidadMin` bajo se ve como una silueta punteada.
  - Se expone en `camara.estado()`: `distanciaVista`, `acortada` y `ocluidos`.

## 5. Enfoque y seguimiento

- La distancia de llegada depende del tipo: casa ≈ 6, monumento ≈ 14, ejército ≈ 20.
- Transición suave; si el destino está muy lejos, primero se aleja, luego viaja y después se acerca.
- Seguimiento sin correcciones nerviosas (zona muerta), compatible con la simulación en marcha.

## 6. Modos, accesibilidad y preferencias

Hay cuatro modos: construcción, administración, militar y observación. Se puede ajustar la sensibilidad del ratón, el desplazamiento, el giro y el zoom, invertir los ejes y la rueda, activar los bordes, el suavizado y el zoom al cursor, y cambiar el FOV, los límites y los atajos. Las preferencias se guardan en `localStorage`, con un *fallback* seguro.

## 7. Arquitectura

En `src/render/camara/` (o un módulo equivalente): `entrada` (eventos y prioridades), `rig` (objetivo, distancia, giro e inclinación, suavizado), `terreno` (alturas y colisión), `enfoque` (enfocar y seguir), `oclusion` y `preferencias`. Sin un archivo monolítico.

## 8. Pruebas y entregables

- La **escena de pruebas** se abre con `?camara-test`: terreno continuo, edificios de alturas distintas, caminos, obstáculos y puntos de interés.
- Las 18 comprobaciones de `prompts/camara.md` §18 se apuntan en `docs/pruebas/camara.md` (qué se probó, cómo, el resultado y las limitaciones), con `shot` y sus acciones `wheel` y `drag`.
- Entregables A–F en las fases C1–C6. **Nunca** se da por probado lo que no se ha ejecutado.

## 9. Estado (19-10)

- **Hecho:**
  - C1: movimiento básico (WASD, arrastres, Q/E, R/F, zoom al cursor, bordes, preferencias) en módulos `rig`, `entrada` y `preferencias`.
  - C2: suavizado independiente de los FPS y velocidad adaptativa.
  - C3: el objetivo sigue la superficie, la cámara no atraviesa el terreno y se atenúan los edificios que tapan.
- **Falta:**
  - Enfoque por tipo y seguimiento (C4).
  - Construcción, modos y accesibilidad (C5).
  - Escena de pruebas y pruebas documentadas (C6).
