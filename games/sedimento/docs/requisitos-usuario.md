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
| R41 | 19-10 | **El laboratorio debe enseñar también lo descargado sin revisar** (`recursos-sin-revisar/`): sección de Materiales con cada textura en 3D, tarjetas de los 17 paquetes del catálogo con imagen de muestra, licencia y precio marcadas «sin revisar», y descargar los paquetes gratuitos para verlos en 3D. | ✅ | fase A3 |

## Decisiones del 19-10 sobre el documento maestro (`prompts/maestro.md`)

| # | Fecha | Requisito | Estado | Dónde se concreta |
|---|---|---|---|---|
| R35 | 19-10 | **Guerra:** la campaña, la economía y la diplomacia son en tiempo real, pero las **batallas tácticas son por turnos** (R7 confirmado por el usuario frente a §11 del maestro). La rejilla táctica, si la hay, solo existe durante la batalla. | ✅ | `gdd/README.md` §11, versión 0.5 |
| R36 | 19-10 | **Nombre provisional: CIMIENTOS** (ni IMPERIUM ni SEDIMENTO hasta que el usuario decida). El *slug* técnico sigue siendo `sedimento` (carpeta y bitácora) hasta tener nombre definitivo. | ✅ | `brief.md`, `estado.json` |
| R37 | 19-10 | ~~**Motor:** seguir con **three.js**~~ **(sustituido por R49: Phaser 4)** (web) con la lógica portable; la comparación formal de motores (§21 del maestro) se hace en la versión 0.9. | ✅ | `versiones.md` |
| R38 | 19-10 | **Versiones en dos tramos:** cada versión tiene una **alfa** (las mecánicas funcionan) y una **beta** (pulida, equilibrada y probada): 0.1 alfa → 0.1 beta → 0.2 alfa… → 1.0 beta → 1.0. **Todas las fases** del juego, hasta la 1.0, deben estar en el panel, organizadas por versión. | ✅ | `versiones.md`, panel (fase P2) |
| R39 | 19-10 | **Carpeta de expectativas `games/sedimento/espertativas/`:** el usuario sube imágenes de la meta visual. **Mirarlas de vez en cuando** (al empezar cada sesión A y antes de decidir sobre el arte) y tenerlas en cuenta en el laboratorio. | ✅ | `.claude/docs/traspaso.md` |
| R40 | 19-10 | **Dejar siempre todo documentado.** | ✅ | todas las sesiones |
| R42 | 19-10 | **Delegación nocturna del arte:** «escoge tú los diseños que más vayan acorde a lo que queremos, así mañana veo avances». A elige estilo y recursos gratuitos según `espertativas/` y avanza lo visual; lo de pago lo decide el usuario. | ✅ | decisión en la bitácora, fase A5 en adelante |
| R43 | 19-10 | **Cero gasto:** «no compro nada». Solo recursos gratuitos (CC0 o CC-BY) o propios. | ✅ innegociable | catálogo, A2 |
| R44 | 19-10 | **Prototipo sencillo en pixel art** para ver qué calidad gráfica se consigue en ese estilo, y abrírselo al usuario para que lo vea. | ✅ | `prototypes/pixel-cimientos/` |
| R45 | 19-10 | **Pixel art v2:** «nada mal», pero vista **más desde arriba**, **cámara que se pueda mover**, **terreno continuo** (en la v1 se notaban las casillas) y **pixel art más pulido, tipo 64×64**. | ✅ v2 hecha; cerrado a petición del usuario | `prototypes/pixel-cimientos/` v2 |
| R46 | 19-10 | **Los gráficos actuales de CIMIENTOS (terreno continuo) gustan más o menos, pero los árboles, las flores y el decorado no van con la estética.** Seguir con el proyecto, no con el pixel art. | ⏳ | fase A5b |
| R47 | 19-10 | **Valoración del pixel art:** gustó el **efecto del agua** (espuma, olas y destellos). No gustaron las casas, los humanos ni que las barcas pasaran por encima de la tierra; se ve «juego de 1990». **El 3D es la vía principal**; el pixel art solo es plan B si no hay modelos 3D buenos, y entonces debe verse como un juego de 2026. | ✅ registrado | `prototypes/pixel-cimientos/README.md`, A7 **(sustituido por R49 el 20-10)** |
| R48 | 19-10 | **Los gráficos actuales son provisionales y «horribles»: pasar YA a los gráficos de verdad.** Dirección: 3D cálido y realista como en espertativas/ (texturas PBR, luz de cielo real, agua realista, edificios con materiales de adobe, caña y madera). | ⏳ | A7 cerrada con esta decisión; fases G1–G4 **(sustituido por R49 el 20-10)** |
| R49 | 20-10 | **PIVOTE DEFINITIVO A PIXEL ART 2D.** Se abandonan el render 3D (three.js) y todos los modelos/texturas 3D descargados; el juego se hace **solo en pixel art**, como en la muestra `prototypes/imperium-muestra/`, **sobre la misma base de juego** (lógica, bitácora, panel, docs). Los sprites y generadores ya hechos **se usan, no se rehacen**. Sustituye a R47/R48. Optimizado para que no se vea lento. | ✅ decidido | `.claude/docs/pivote-pixel-art.md` |
| R50 | 20-10 | **Colisiones estrictas.** Los ciudadanos no pueden caminar por encima ni por debajo de las casas, y los objetos o edificios no pueden ponerse encima de casas, templos u otros edificios. Una única rejilla de ocupación manda en colocación, navegación y orden de dibujo; con pruebas. | ⏳ | `pivote-pixel-art.md` §4 |
| R51 | 20-10 | **Selección múltiple con el ratón** (caja, mayús, doble clic, grupos Ctrl+n) para **manejar ejércitos con facilidad** (órdenes a grupos con formaciones). | ⏳ | `pivote-pixel-art.md` §5 |
| R52 | 20-10 | **Ficha de ciudadano estilo Tropico 6:** al tocarlo muestra características, humor, personalidad, rol y si tiene familia; y se puede **coger con el ratón y llevar a donde se quiera**. | ⏳ | `pivote-pixel-art.md` §6 |
| R53 | 20-10 | **Las estructuras muestran su durabilidad, lo que producen** y el resto de su información (trabajadores, consumo, estado de obra). | ⏳ | `pivote-pixel-art.md` §7 |
| R54 | 20-10 | **Seguir nuestra documentación y el funcionamiento del panel del estudio** (bitácora, GDD, catálogo, panel con sección de pixel art propio). | ⏳ | `pivote-pixel-art.md` §9 |
| R55 | 20-10 | **Sesión D opcional (artista de sprites)** para la cola de arte que pida la sesión A; modelo y esfuerzo recomendados: Sonnet 5.5 · alto. | ⏳ | `pivote-pixel-art.md` §11, `sesiones.md` |
| R56 | 20-10 | **El juego tiene que ir a 60 fps como mínimo.** Requisito duro: se mide con pruebas automáticas (p95 ≤ 16,6 ms con la ciudad de referencia) y ninguna fase se cierra por debajo. | ⏳ | `pivote-pixel-art.md` §12 |
| R57 | 20-10 | **Eliminar toda la documentación y los recursos que ya no se necesiten** (todo lo 3D) para limpiar el contexto de las sesiones, que se llena de información obsoleta. No se archiva: se borra (tras un commit y una etiqueta de git para poder recuperarlo). | ⏳ P0 | `pivote-pixel-art.md` §1 |
| R58 | 20-10 | **Los recursos 3D no se borran: se mueven fuera del proyecto** («son recursos que para otros juegos nos vendrían súper bien»), a un sitio que no moleste ni consuma tokens. Matiza R57 para los recursos. | ✅ | `D:\Recursos GC\3d\` (con `LEEME.md`) |
| R59 | 20-10 | **Terreno procedural al cargar:** cada partida tiene un mapa nuevo con semilla; TS hornea los trozos PNG una vez al cargar (sin coste por fotograma). | ⏳ | P2 |
| R60 | 20-10 | **Ratón estilo RTS:** izquierdo arrastrando sobre el vacío = caja de selección; cámara con botón central, WASD y bordes; derecho = órdenes. Sustituye el arrastre izquierdo de R15. | ⏳ | P2, P5 |
| R61 | 20-10 | **Cámara sin giro ni inclinación** (vista isométrica fija, solo desplazar y zoom). Los edificios sí giran en 4 orientaciones al colocarlos. Sustituye el giro/inclinación de R28. | ✅ decidido | P2, P8 |
| R62 | 20-10 | **Control de calidad de sprites automático:** skill `sprite-qa` (paleta, ampliación, alfa limpio, píxeles sueltos, ancla que toca el suelo, hoja de contacto ×4 + revisión visual), `sprite-atlas` (empaquetado + JSON) y `bench-60fps` (falla por debajo de 60 fps). Librerías útiles: Pillow, numpy, rectpack, imageio. | ⏳ | P1, P2 |
| R63 | 20-10 | **El panel muestra la ruta nueva completa hasta la 1.0**, sin información falsa (nada de 3D). | ⏳ | P0 |
| R64 | 20-10 | **Ver el avance en el navegador** siempre que se pueda (panel y juego abiertos). | ⏳ | todas |
| R65 | 20-10 | **Agua:** el **mar** como el de `prototypes/pixel-cimientos` (http://localhost:5180: olas y espuma de costa «preciosas»); el **río** como el de la muestra actual (`imperium-muestra`), no el de pixel-cimientos. | ⏳ | P2, P9 |
| R66 | 20-10 | **Campos de cultivo:** los de la muestra no gustan; el estilo de `pixel-cimientos` (http://localhost:5180) va por buen camino pero «se queda corto». Tiene que haber **etapas de cultivo**: siembra → crecimiento con el tiempo → cultivo listo → cosecha. | ⏳ | D2 (boceto), P9 / F107 |
| R67 | 20-10 | **Tareas por tramos cortos:** a B, C y D se les dan tareas largas pero divididas en tramos de **≤ 20 min**; al cerrar cada tramo entregan un HECHO parcial y se detienen hasta el «sigue» de A. Nunca más de 30 min ni ~60k tokens seguidos: degrada el trabajo. | ✅ (el usuario lo recordó el 20-10 a las 10:57: «es uno de los requisitos… para que no se sature trabajando»; A parte cada tarea en tramos que quepan en 20 min y controla la hora de inicio) | `.claude/docs/sesiones.md` |
| R68 | 20-10 | **Anotar siempre las críticas constructivas del usuario** para que nunca se olviden (aquí, con fecha). | ✅ | este archivo |
| R69 | 20-10 | **Gaviotas y sombras de nubes que se mueven**, como en `prototypes/pixel-cimientos` (:5180). | ⏳ | P9 (sprites de D) |
| R70 | 20-10 | **Interfaz en HTML/CSS superpuesto al juego** (fichas de ciudadano, paneles de estructuras y de grupo, HUD, menús), decidido desde el principio. | ✅ decidido | P2b, `pivote-pixel-art.md` §13 |
| R71 | 20-10 | **Edificios de producción y mercados por tipo para mover la economía:** minas, leñadores, molinos, etc., y mercados distintos (comida, minerales, etc.) que abastecen a los ciudadanos. | ⏳ | F109, F203, cola de arte D8 |
| R72 | 20-10 | **Sistema militar con varios tipos de soldado** (arqueros, etc.), no solo el lancero de la muestra. | ⏳ | F501–F511 (v0.5), P5 (formaciones), cola de arte D9 |
| R73 | 20-10 | **Minerales y materiales:** oro, hierro, carbón, plata, mármol, etc., como yacimientos del mapa que se explotan con minas y canteras. | ⏳ | P2 t3 (datos del mapa), F109, F401, cola de arte D10 |
| R74 | 20-10 | **Sistema de estructuras completo para las ciudades:** no solo casa, templo y mercado. Delegado en A («te lo dejo a ti todo»). | ✅ diseñado | `docs/gdd/estructuras.md`, P7, faltante L008 |
| R75 | 20-10 | **Arena solo en la costa del mar**; ríos y lagos con ribera de hierba salvo algunos tramos. | ✅ | P2 tramo 3a (`tuning.horneado.umbralArenaDulce`) |
| R76 | 20-10 | **Nada borroso:** el escalado entero se calcula sobre píxeles físicos (zoom de pantalla de Windows) y la nieve va en bandas duras, sin difuminar. | ✅ | P2 tramo 3a |
| R77 | 20-10 | **El imperio se construye desde cero y TODO tiene progresión:** primero chozas de madera y paja, y solo con el material (mineral, adobe…) se mejoran; lo mismo con soldados y con todo lo demás. Delegado en A como diseñador sénior: dejarlo estudiado y explícito. | ✅ diseñado | `docs/gdd/progresion.md`, F102, F109b, F209, F501, F504, F601 |
| R78 | 20-10 | **Montañas nevadas sin rayas negras** («mejoró, pero ahora se ven con muchas rayas negras, no me convence»): relieve con detalle y luz, sin estratos oscuros ni manchas sueltas, y un llano que no sea un verde plano. Referencia de calidad: el terreno de la muestra (`imperium-muestra/salida/escena_base_960x540.png`). | ⏳ | P2 tramo 3d |
| R79 | 20-10 | «**El diseño de las montañas es muy feo, necesito que se vean mejor**» (refuerza R78): montañas con forma real (crestas, barrancos, picos) y luz coherente, al nivel de la muestra. | ⏳ | P2 tramo 3d |
| R80 | 20-10 | **Las casas de la primera era tienen que ser mucho más humildes:** no basta con cambiar el color de la pared; el techo tiene que ser de **paja o de madera**. «Recuerda: es desde totalmente cero.» (Visto en el boceto del almacén de era 1, que parecía la casa de era 2 con azotea.) | ✅ boceto del almacén de era 1 aprobado (20-10) | `gdd/progresion.md` §4, cola de arte de D |
| R81 | 20-10 | **Tener siempre presente el documento maestro** (`espertativas/IMPERIUM_Prompt_Maestro_y_Vision_Creativa.docx`, copia literal en `docs/prompts/maestro.md`): se ha quedado algo atrás por las novedades, pero **toda la parte jugable está ahí** y es una buena guía, saltando las incoherencias con lo decidido después. | ✅ | `prompts/maestro.md`, traspaso, prompts de relevo |
| R82 | 20-10 | **Lo que se sustituye no se borra:** «me gusta el almacén, pero el anterior no me gustaría eliminarlo, es un buen diseño; podríamos utilizarlo para otra cosa». Si un diseño ya hecho se sustituye por otro, se guarda (generador y PNG) y se le busca otra utilidad, porque hay mucho por diseñar. El almacén anterior (adobe enlucido con azotea) pasa a ser el almacén de era 2 (D031). | ✅ | `pivote-pixel-art.md` §10.12, `tools/arte-pixel/README.md` |
| R83 | 20-10 | **El juego ocupa todo el navegador:** «me gustaría que estuviera a lo grande en el navegador, que ocupe todo el espacio, no solo una parte». El lienzo llena la ventana con escala entera (R76) y resolución lógica variable (alto lógico ≈ 540); se ve más mundo, nunca píxeles de distinto tamaño (D032). | ⏳ | P2 tramo 4c |
| R84 | 20-10 | **Montañas como piezas dibujadas (vía B del boceto M1):** «escojo la montaña B piezas, pero que también haya cordilleras y demás; me gusta mucho la B». Las montañas son piezas de sprite de D colocadas sobre el relieve (no sombreado procedural), con variedad: cordilleras encadenadas, macizos, picos, crestas, colinas y acantilados. Sustituye la vía procedural de R78/R79. | ✅ decidido | `bocetos/montanas_comparativa_x2.png`, D033 |
| R85 | 20-10 | **Caminos, ya:** «en el juego hay mucho desorden porque no hay caminos hechos; dile a D que empiece también con el diseño de los caminos. Hay 2 tipos: uno de tierra normal y otro de roca». Tierra = senda o tierra apisonada (era 0–1), roca = empedrado (era 2+), según `progresion.md`. La aldea se ordena alrededor de sus calles (R004). | ⏳ | D (boceto CAM1), B (capa de caminos), D035 |
| R86 | 20-10 | **Cultivos animados:** «que le dé un poco de animación a los cultivos». Las etapas con planta (brotes, crecimiento, maduro) se mecen con el viento en un bucle de 4 fotogramas, con una onda que recorre el campo (§10.10: todo lo vivo se anima y cierra en bucle). | ⏳ | D (frames en el atlas), B (los reproduce en la aldea) |
