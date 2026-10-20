# Plan de versiones

Cada versión es un **juego cerrado y jugable** con su propio bucle de inicio, partida y final. Las fases de cada versión se registran en la bitácora al empezarla, y no antes, para replanificar con lo aprendido.

| Versión | Nombre | Qué añade | Por qué en este orden |
|---|---|---|---|
| **v0.0** | Cimientos en pixel art | Limpieza del 3D, pipeline de arte propio, Phaser 4 isométrico con cámara 2D, rejilla de ocupación, navegación, selección múltiple y formaciones, fichas de ciudadano y de estructura, construcción en 6 etapas, ambiente vivo y LOD a 60 fps (P0–P10) | Es la base técnica y visual de todo lo demás (R49–R66, `.claude/docs/pivote-pixel-art.md`). |
| **v0.1** | La aldea junto al río | Sobre la base de v0.0: habitantes visibles con logística, obras con porteadores, economía de templo (raciones), estaciones, crecida, salinidad, necesidades con expectativas, demografía, inspector «¿por qué?», crónica, victoria y derrota | Valida la pregunta clave: **¿es divertido sostener una ciudad física bajo presión?** Sin esto, nada de lo demás importa. |
| v0.2 | La casa del dios | Guardar y cargar, cadenas (cerveza, tejido, cerámica), grupos sociales, agravios con memoria, protestas y huelgas, epidemias e incendios, evolución de las casas | Pilar 3 (la sociedad tiene intereses) sobre una economía ya probada. |
| v0.3 | El ensi y los poderosos | Plata y mercado con precios, impuestos y tasas, leyes, facciones, legitimidad, rebelión y cambio de gobierno | La política necesita una economía y una sociedad que presionar. |
| v0.4 | Tierra entre ríos | Mapa regional y mundial con **todos los biomas por latitud** (de la tundra a la selva), ciudades-estado rivales con IA (modelo agregado L2), comercio de caravanas y barcos, fronteras, diplomacia con memoria, espionaje básico | Los rivales usan los mismos modelos, ya maduros, en agregado. |
| v0.5 | Lanzas de cobre | Milicia, suministro, campaña en tiempo real con **batallas tácticas por turnos** (R7: la rejilla táctica, si la hay, solo existe durante la batalla; la construcción nunca usa casillas), resolución automática, asedio, bloqueo de rutas, tratados de paz | La guerra solo es interesante si cuesta economía y política. |
| v0.6 | Tablillas y templos | Árboles de conocimiento, instituciones, cultura y doctrina; langosta y terremotos; eventos escritos | La progresión abre opciones sobre sistemas que ya existen. |
| v0.7 | Otras orillas | Segunda civilización jugable (candidata: Egipto, con presión muy distinta) y varias ciudades propias (provincias) | La asimetría se prueba con dos civilizaciones profundas. |
| v0.8 | Los que guardan los cedros | Modo mitológico opcional, presagios en el modo histórico | Va al final para que no tape los problemas de diseño de la base. |
| v0.9 | Equilibrio | Niveles de dificultad por ejes, balance de partidas largas, rendimiento y decisión de motor final (Phaser web o portar a Godot/Unity) con datos | |
| **v1.0** | — | Victorias múltiples, 3 civilizaciones, partida completa de era a era | |

Ritmo esperado: v0.1 en 2–4 semanas de sesiones. Las siguientes, en 1–3 semanas cada una, según lo que aparezca en las pruebas de juego.

## Fases por versión: alfa → beta (R38, 19-10)

Cada versión tiene un tramo **alfa** (las mecánicas funcionan y se prueban) y otro **beta** (equilibrio, rendimiento, pulido y cierre). Las fases completas, con sus criterios, están en `estado.json` y en el panel (`npm run panel`). Fuente de contenido: `prompts/maestro.md` + `prompts/camara.md` + `.claude/docs/pivote-pixel-art.md`, con las decisiones de `requisitos-usuario.md`.

| Versión | Nombre | Alfa | Beta | Fases |
|---|---|---|---|---|
| 0.0 | Cimientos en pixel art | P0–P10 | — | 11 |
| 0.1 | La aldea junto al río | F102–F116 | F117–F122 | 21 |
| 0.2 | La casa del dios | F201–F210 | F211–F214 | 14 |
| 0.3 | El ensi y los poderosos | F301–F308 | F309–F311 | 11 |
| 0.4 | Tierra entre ríos | F401–F408 | F409–F411 | 11 |
| 0.5 | Lanzas de cobre (batallas por turnos, R35) | F501–F508 | F509–F511 | 11 |
| 0.6 | Tablillas y templos | F601–F607 | F608–F609 | 9 |
| 0.7 | Otras orillas | F701–F705 | F706–F707 | 7 |
| 0.8 | Los que guardan los cedros | F801–F804 | F805–F806 | 6 |
| 0.9 | Equilibrio (incluye la decisión de motor final) | F901–F905 | F906–F908 | 8 |
| 1.0 | Lanzamiento | F1001–F1003 | F1004–F1006 | 6 |
| | | | **Total** | **115** (+ S1–S2 del panel) |

Las fases de versiones lejanas son un plan, no un contrato: al empezar cada versión, la sesión A las revisa con lo aprendido (máx. 5 criterios por fase; si crece, se divide).
