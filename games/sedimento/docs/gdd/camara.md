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
- Todo en `tuning.render.camara`, con nombres descriptivos y un comentario por parámetro en este documento cuando se implemente.

## 4. Terreno y obstáculos

- El objetivo de la cámara se apoya en `campo.alturaEn(x, z)` (G1/A5) suavizado: sigue las colinas sin brincos.
- **Sin atravesar:** la altura mínima de la cámara es el suelo bajo ella más un margen, comprobado con varias muestras a lo largo del rayo hasta el objetivo. Si hay colisión, se acorta la distancia de forma suave, sin teletransportes.
- **Oclusión** (cuando haya ciudad): solo si un edificio tapa el objetivo, ese edificio se atenúa con una transición. Nada desaparece en bloque.

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

- **Existe** (F02 y F02b, `render/camara.ts`): WASD, arrastre derecho y central, Q/E, R/F, zoom al cursor, doble clic para centrar, near proporcional y límites de mapa.
- **Falta:**
  - Arrastre izquierdo y bordes de pantalla.
  - Seguimiento del terreno continuo y colisiones.
  - Enfoque por tipo y seguimiento.
  - Modos y preferencias.
  - Módulos separados.
  - Escena de pruebas y pruebas documentadas.
