# Requisitos del usuario

Lo que el usuario ha pedido de forma explícita. **Toda sesión que trabaje en SEDIMENTO lo respeta.** Si una tarea choca con algo de esta lista, para y pregunta a la sesión A, que lo consulta con el usuario. Cada petición nueva se añade aquí con su fecha y su estado.
Los textos largos del usuario están literales en `docs/prompts/` y mandan sobre este resumen.

**Estados:** ✅ vigente · 🔁 sustituido (dice por cuál) · ⏳ pendiente de decidir con evidencia

> **R34 (19-10), aclaración del usuario: todas las ideas del juego se mantienen** (civilización viva, economía física, sociedad, presión, versiones, **biomas por clima**, mapa aleatorio, simulación, combate…). Lo único que cambia es **el diseño artístico** (por decidir en el laboratorio) y **lo nuevo de los textos del 19-10** (terreno continuo, construcción libre y progresiva, cámara y laboratorio). Si dudas de si algo anterior sigue en pie: sigue, salvo que esta tabla lo marque como 🔁.

## Concepto y proceso

| # | Fecha | Requisito | Estado | Dónde se concreta |
|---|---|---|---|---|
| R1 | 18-10 | **Visión completa del prompt maestro y del anexo creativo:** civilización viva, economía física, sociedad con intereses, historia emergente y presión creciente. | ✅ | `vision.md`, `gdd/README.md` |
| R2 | 18-10 | **El progreso tiene que sentirse bien, pero el jugador nunca debe estar cómodo.** | ✅ | `gdd/README.md` §15, `gdd/simulacion.md` |
| R3 | 18-10 | **Lanzamiento por versiones:** primero algo jugable en pocas semanas y luego actualizaciones. | ✅ | `versiones.md` |
| R4 | 18-10 | **Nombre: SEDIMENTO.** No debe parecer una copia de «Imperium». Los textos del usuario dicen «IMPERIUM» como nombre de trabajo. | ✅ | `brief.md` |
| R5 | 18-10 | **Dureza: exigente pero justa.** Las crisis siempre se anuncian. | ✅ | `brief.md` |
| R11 | 18-10 | **Trabajo con sesiones A, B y C.** Solo se delega lo que el rol puede hacer bien. | ✅ | `/.claude/docs/sesiones.md` |
| R12 | 18-10 | **Seguir siempre las reglas de las skills y revisarlo todo:** en cada cambio visible, captura → mirarla → corregir → repetir. | ✅ | `/.claude/skills/fase/SKILL.md` §4 |
| R27 | 19-10 | **Jerarquía de prioridades:** 1) diversión y mecánicas que funcionan; 2) construcción y simulación coherentes; 3) estilo atractivo y consistente; 4) rendimiento; 5) efectos avanzados, solo si aportan. Nada de pulir reflejos si aún no se puede construir. | ✅ | `prompts/direccion-artistica.md` §11 |

## Mundo y terreno

| # | Fecha | Requisito | Estado | Dónde se concreta |
|---|---|---|---|---|
| R6 | 18-10 | «Más bonito, como Civ 6, con hexágonos 3D low-poly». | 🔁 por R20 y R24 | — |
| R8 | 18-10 | **El mapa tiene todo lo que tiene uno real:** montañas, árboles, ríos, lagos, mares… | ✅ | `gdd/mapa.md` |
| R9 | 18-10 | **Mapa siempre aleatorio** (semilla nueva, visible y reutilizable). | ✅ | `gdd/mapa.md` §1 |
| R10 | 18-10 | **Todos los biomas reales con un orden lógico.** | ✅ | `gdd/mapa.md` §3–4 |
| R20 | 19-10 | **Terreno continuo y natural, sin hexágonos ni cuadrícula visibles.** Colinas, valles, cauces, costas en pendiente y playas. El relieve influye en la construcción, la agricultura, el transporte, la navegación y la guerra. Si hay una rejilla interna, es solo de datos. | ✅ innegociable | `gdd/mapa.md`, fase A5 |
| R16b | 18-10 | **No poner pantano en toda la costa** (solo en el delta). | ✅ | `tuning.mapa.radioDelta` |

## Construcción

| # | Fecha | Requisito | Estado | Dónde se concreta |
|---|---|---|---|---|
| R17 | 18-10 | **Construcción libre como en Imperium o Tropico, con carreteras.** | ✅ ampliado por R21–R22 | `gdd/construccion.md` |
| R21 | 19-10 | **Colocación libre:** posición y giro libres, vista previa transparente, válida o inválida con motivo, colisiones, pendiente, acceso, distancias mínimas, mover, demoler y reubicar. La rejilla de ajuste es opcional e invisible. Caminos trazados con puntos y curvas que siguen el relieve y participan en la simulación. Preparar y nivelar el terreno, con coste. | ✅ innegociable | `gdd/construccion.md` §1–3 |
| R22 | 19-10 | **Los edificios se construyen poco a poco:** plano → preparación → cimientos → estructura → cubierta y acabados → terminado. La secuencia depende del edificio y del progreso real, con trabajadores, materiales y tiempo. Transporte visible. Motivo del retraso a la vista. Cancelar, suspender y priorizar. El edificio no funciona hasta terminarse. | ✅ innegociable | `gdd/construccion.md` §4 |

## Arte y recursos

| # | Fecha | Requisito | Estado | Dónde se concreta |
|---|---|---|---|---|
| R13 | 18-10 | Mejorar mucho el agua (ríos, costas). | ✅ (entra en la comparación de estilos) | `gdd/arte.md` |
| R14 | 18-10 | Montañas, agua y árboles que se vean bien también de cerca. | ✅ | `gdd/arte.md` |
| R16 | 18-10 | Usar modelos 3D gratuitos de internet y adaptarlos si no combinan. | ✅ ampliado por R25 | `recursos/catalogo.md` |
| R19 | 18-10 | Estilo realista con texturas y gráficos primero. | 🔁 por R23 y R27: el realismo con texturas es el **estilo B** que se compara en el laboratorio, no una decisión | — |
| R23 | 19-10 | **No decidir el estilo artístico por gusto ni por facilidad:** comparar A (low-poly), B (3D con texturas), C (pixel art isométrico) y D (híbrido justificado) con 13 criterios y escenas equivalentes, y **no implementar un sistema gráfico definitivo antes de comparar**. Nada de mezclar estilos incoherentes. Hipótesis del usuario: A con terreno continuo, con C como alternativa real. | ⏳ se decide en la fase A7 | `gdd/arte.md` |
| R24 | 19-10 | **Art Direction Lab en http://localhost:4400/** (el panel del estudio, ampliado), con estas secciones: portada, estilos, modelos 3D (visor), pixel art, materiales y terreno, construcción progresiva y comparador con favoritos y comentarios. Debe distinguir entre referencia, demo provisional y recurso integrado, y no tener tarjetas rotas. | ✅ | `gdd/arte.md` §3, fases A3–A4 |
| R25 | 19-10 | **Registro de licencias por recurso** (13 campos: autor, enlace, licencia, uso comercial, atribución, popularidad con fuente y fecha, estado…). Nada «aprobado» sin licencia verificada. Popularidad nunca inventada. | ✅ | `recursos/catalogo.md` |
| R26 | 19-10 | **Estructura ordenada de recursos** por categorías y un registro de lo integrado, para poder sustituirlo. Verificar escala, pivote, materiales y coherencia antes de integrar. | ✅ | `public/recursos/` + `recursos/catalogo.md` |
| R18 | 18-10 | Poder ver los modelos para compararlos. | ✅ absorbido por R24 | — |

## Cámara

| # | Fecha | Requisito | Estado | Dónde se concreta |
|---|---|---|---|---|
| R15 | 18-10 | Cámara libre: ir a cualquier sitio, girar, inclinar y zoom al cursor. Arrastrar con el botón izquierdo y llevar el ratón al borde, como en Tropico. | ✅ ampliado por R28 | `gdd/camara.md` |
| R28 | 19-10 | **Cámara de estrategia ideal** (texto completo en `prompts/camara.md`): WASD relativo al giro con diagonales normalizadas, bordes opcionales, arrastre central para desplazar, derecho para girar, Q/E, inclinación regulable con límites, zoom al cursor desactivable, suavizado configurable con respuesta inmediata, velocidad adaptada al zoom y parámetros centralizados. | ✅ | `gdd/camara.md`, fases C1–C6 |
| R29 | 19-10 | **La cámara respeta el terreno y los edificios:** no los atraviesa, sigue el relieve con suavidad y gestiona la oclusión sin hacer desaparecer la ciudad. | ✅ | `gdd/camara.md` §4 |
| R30 | 19-10 | **Enfocar, centrar (F) y seguir** edificios, obras, trabajadores y ejércitos sin cortar la simulación. Prioridad n.º 1 del usuario: acercarse a una obra, rodearla, alejarse y ver la ciudad sin cambiar de modo. | ✅ | `gdd/camara.md` §5 |
| R31 | 19-10 | **Cámara y construcción sin conflictos de entrada**, con modos (construcción, administración, militar, observación), accesibilidad (sensibilidades, invertir ejes, FOV, atajos) y preferencias guardadas. Escena de pruebas y 18 comprobaciones documentadas. | ✅ | `gdd/camara.md` §6–8 |

## Combate

| # | Fecha | Requisito | Estado | Dónde se concreta |
|---|---|---|---|---|
| R7 | 18-10 | **Combate por turnos al estilo Civ dentro de un mundo en tiempo real** (batallas tácticas por turnos y campaña en tiempo real). | ⏳ compatible con R20 si la rejilla táctica solo existe durante la batalla; se decide en la v0.5 | `gdd/README.md` §11 |

## Estudio y panel

| # | Fecha | Requisito | Estado | Dónde se concreta |
|---|---|---|---|---|
| R32 | 19-10 | **Panel del estudio limpio y desde cero:** quitar las fases viejas y lo que ya no sirve. | ✅ | `estado.json` (lo viejo, en `docs/archivo/`) |
| R33 | 19-10 | **Panel más intuitivo y mejor organizado:** iconos de leído, no leído y nuevo en todo lo que aparece, y **probado a fondo**. | ✅ | `studio/panel/`, fase P1 |
