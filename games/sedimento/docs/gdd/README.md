# Entregable B — Documento de diseño (GDD general)

Marcas de procedencia: **[H]** dato histórico documentado · **[I]** interpretación o hipótesis académica debatida · **[D]** decisión de diseño (ficción).
Versión que lo implementa: **v0.1**, **v0.2**… (ver `../versiones.md`). Las reglas con números concretos están en `simulacion.md` y, más adelante, en un GDD por sistema.

---

## 1. Marco histórico y cronología

- **Arranque:** Sumer, periodo Dinástico Arcaico (~2900–2350 a. C.) [H]. En esa época conviven ciudades-estado independientes (Uruk, Ur, Lagash, Umma, Kish…), cada una con su dios patrón, su templo y su gobernante (*ensi* o *lugal*) [H].
- **Por qué Sumer:** su presión es *estructural* y está documentada. El río crece en el peor momento del año agrícola [H], el riego saliniza la tierra [I], no hay piedra, madera buena ni metales [H] y los vecinos se disputan las tierras de cultivo (el conflicto de un siglo entre Lagash y Umma por el Gu-edena, que recoge la Estela de los Buitres) [H].
- **Cómo se mezclan épocas y pueblos [D]:** el juego no pone a Roma junto a Sumer. Cada **escenario regional** respeta su época (Mesopotamia ~2600 a. C. con Sumer, Elam y Akkad; Egipto y Levante; el Mediterráneo del I milenio…). Un modo **«Mundo alternativo»**, declarado como ficción, permite mezclar civilizaciones en un mapa común con la misma tecnología inicial. La historia da el punto de partida y la simulación decide qué pasa después.

## 2. Escala temporal [D]

| Unidad | Valor | Por qué |
|---|---|---|
| Día de juego | ~1 s real a velocidad ×1 (ajustable) | Unidad del tick económico. |
| Mes | 30 días · **Año** | 12 meses = 360 días (~6 min a ×1) | El año administrativo de 360 días aparece en la contabilidad sumeria [H]. |
| Velocidades | pausa · ×1 · ×2 · ×4 | Hay pausa activa: con el juego en pausa se puede inspeccionar y dar órdenes. |
| Desplazamiento local | 1 hexágono ≈ 50 m. Un habitante cruza la ciudad en 1 a 3 días | **Compresión declarada:** el viaje local se hace lento a propósito para que la logística importe y se vea. |
| Viaje regional (v0.4) | Caravana ~25 km/día, barco fluvial ~40 km/día | Velocidades plausibles. Un bien al otro lado del mapa tarda semanas. |
| Obras | Casa de adobe: 10–20 días · canal: 5 días por tramo · templo: 1–2 años | Comparables con la siembra (1 estación) y con la población (crece en años). |
| Progreso (v0.6) | Avances en 2–10 años | Una innovación tarda lo mismo que su infraestructura. |

**Partida v0.1:** de 10 a 20 años de juego (≈ 60–120 min a ×1, unos 30–40 min a ×4 en los tramos tranquilos).

## 3. Ciclo de juego en cuatro escalas

| Escala | Ritmo | Qué hace el jugador |
|---|---|---|
| Micro | 10–60 s | Colocar una obra, priorizar un acarreo, inspeccionar un hogar quejoso. |
| Estación | ~90 s | Prepararse para la siguiente fase del año agrícola. |
| Año | ~6 min | Balance: cosecha frente a consumo, salinidad, crecida, crecimiento. Planear los proyectos del año siguiente. |
| Época | Partida | Hitos aldea → pueblo → ciudad (v0.1). Después: reino, imperio, caída o recuperación. |

**El año sumerio es el corazón del ritmo** [H con simplificación D]:

| Estación | Agricultura | Río | Tensión típica |
|---|---|---|---|
| **Verano** (meses 4–6) | Campos en barbecho; calor extremo | Bajo | **Calma:** tiempo de obras, dragado de canales y moldeo de adobe. |
| **Otoño** (7–9) | Siembra de cebada; cosecha de dátiles | Mínimo | Hace falta agua en los campos → los canales tienen que estar limpios. |
| **Invierno** (10–12) | La cebada crece con riego | Sube | Las reservas bajan. Se mira el pronóstico de la crecida. |
| **Primavera** (1–3) | **Cosecha de cebada** | **Crecida máxima** | **Crisis potencial:** la crecida llega cuando el grano está en el campo. |

Ese es el ritmo emocional que pides: calma constructiva en verano y tensión en primavera, cada año, con una intensidad que depende de lo bien que te hayas preparado.

## 4. Mapa

> Detalle completo (aleatoriedad, clima, biomas y perillas): **`mapa.md`**. Requisitos del usuario R8–R10.
- **Siempre aleatorio:** cada partida usa una semilla nueva, que se muestra y se puede reutilizar. Varían el relieve, 1–2 ríos, 1–2 lagos, la costa, la vegetación y el clima.
- **Biomas por clima (Whittaker):** temperatura por altitud y latitud, y lluvia. En Sumer: desierto en el valle → estepa → bosque → taiga → tundra → nieve en las cumbres. En el mapa mundial (v0.4) aparecen los 10 biomas en franjas lógicas, también los tropicales.

- **v0.1:** mapa de **hexágonos** procedural de ~48×40 (≈ 2 000 hexágonos, unos 2,4 × 2 km), en **3D con relieve** (las montañas se elevan y el río va encajado) y con semilla reproducible. **Un hexágono = una parcela:** un campo, una casa, un taller o un tramo de canal, como los barrios de Civ 6, pero con gente dentro. Contiene un **río principal** con meandros, brazos y un **lago** o laguna; **marismas** con cañaverales y pesca; el **mar** (el golfo) en un borde; **estepa y desierto** lejos del agua; **colinas y montañas** en el borde contrario (no se cultivan; dan algo de piedra y madera de mala calidad); **palmerales** y bosque ribereño escaso.
- **Atributos por hexágono:** tipo de terreno, elevación, fertilidad (0–1), salinidad (0–1), humedad o acceso al agua, y recursos (arcilla, caña, peces, madera, piedra).
- **El mapa crea las decisiones:** la mejor tierra está junto al río, que también es el que se inunda. La arcilla está en las orillas. La piedra queda lejos, en las colinas. Las marismas dan comida, pero también enfermedad.
- **Más adelante:** mapa regional con varias ciudades (v0.4) y mapas por escenario, con desiertos, pasos de montaña, rutas marítimas y estrechos (v0.7).

## 5. Población

- **Unidad social: el hogar** (de 3 a 8 personas). Tiene miembros (adultos que trabajan y dependientes), vivienda, ocupación principal, despensa propia, necesidades, bienestar con memoria y, en v0.2, clase y agravios.
- **Simulación híbrida [D]:** solo es «agente visible» quien está haciendo una tarea física (acarrear, construir, cultivar, pescar, ir a comer). El resto del hogar se simula en agregado. Con 300 habitantes, unos 100 a 150 agentes andan a la vez. A escala de imperio, las ciudades que no se miran se simulan **solo en agregado** con el mismo modelo de flujos (ver `simulacion.md` §6).
- **Demografía:** nacimientos según el bienestar y la comida; muertes por edad, hambre y enfermedad. **Inmigración** si la ciudad prospera y es conocida; **emigración** si un hogar pasa hambre o sufre agravios graves durante mucho tiempo (se va con sus bienes).
- **Ocupaciones en v0.1:** campesino, pescador, palmicultor, alfarero o adobero, porteador y constructor. El jugador **asigna puestos a los edificios**, no a las personas. Los hogares cercanos los cubren.

## 6. Economía

**Principio:** todo bien existe físicamente en un sitio (campo, taller, almacén, despensa o, más adelante, una caravana) y solo se mueve si alguien lo lleva.

- **v0.1 — economía de templo redistributiva, sin dinero** [H]. En el Dinástico Arcaico, los grandes «hogares» del templo y del palacio organizan buena parte de la producción y pagan **raciones de cebada** a sus trabajadores dependientes. Los textos de raciones son abundantes [H]. **[D]** En v0.1, el jugador *es* el templo: recibe la cosecha de los campos comunales, la guarda y la reparte.
- **Bienes de la v0.1:** cebada, dátiles, pescado (alimento); arcilla, caña, paja, adobe (construcción); hoces de arcilla cocida (herramienta que se gasta) [H: hay hoces de arcilla cocida documentadas en los periodos El Obeid y Uruk].
- **Escasez local [H]:** no hay piedra ni buena madera, y el metal solo llega por comercio (el cobre de Magan, la actual Omán; la madera de las montañas). En v0.1 eso se traduce en que **todo se construye con barro y caña** y las herramientas son frágiles. En v0.4, el comercio exterior se convierte en una dependencia estratégica.
- **v0.3 — plata y mercado [H/D]:** la plata funciona como medida de valor y la cebada como medio de pago cotidiano. Aparecen hogares privados que comercian, precios por oferta y demanda (`simulacion.md` §4), impuestos en especie y en plata, y tasas.
- **Cadenas (v0.2):** cebada → **cerveza** (con un horno), lana → **tejido** (un gran producto de exportación sumerio [H]), arcilla → **cerámica**, junco → esteras y barcas.
- **Finanzas del Estado (v0.3):** ingresos por la parte de la cosecha, los tributos y las tasas al comercio. Gastos en raciones, mantenimiento de canales, ofrendas y milicia. En Mesopotamia hay deuda y préstamos con interés documentados [H], así como **condonaciones de deudas** decretadas por reyes (una ley con consecuencias políticas muy jugosas).

## 7. Construcción y urbanismo

- **Por etapas, siempre:** se coloca la obra → se marcan los cimientos → los porteadores acarrean los materiales → los constructores trabajan (progreso = días-persona aportados) → queda terminada. Sin materiales o sin brazos, la obra **se detiene y lo dice**.
- **Adyacencia al estilo Civ 6, pero física:** el hexágono vecino importa porque cambia distancias, agua y riesgos reales. El almacén pegado a los campos acorta los acarreos, la casa junto a un canal tiene agua, la adobería junto a la orilla tiene arcilla y el templo da servicio a las casas a ≤ 2 hexágonos. No hay bonus mágicos sin causa.
- **El emplazamiento importa:** el campo rinde según la fertilidad, el agua y la salinidad; la casa junto a la marisma tiene más riesgo de enfermedad; el almacén lejano alarga los acarreos; la orilla baja se inunda.
- **Edificios de la v0.1:** casa de adobe, campo de cebada, palmeral, puesto de pesca, adobería, alfar (hoces), almacén, **canal**, **dique** y templo (el hito para ser ciudad).
- **Evolución visual (v0.2+):** las casas mejoran si el hogar prospera (choza de caña → casa de adobe → casa con patio) y empeoran si no.
- **Mantenimiento:** los canales se **colmatan** de limo y hay que dragarlos cada año; el adobe se erosiona. *Crecer obliga a mantener más.*

### 7.1 Construcción libre y carreteras (R17, 2026-10-18)

**Dos capas.** Los **hexágonos** son el terreno (bioma, fertilidad, agua, altura) y el mapa estratégico (territorio, viajes largos y, en la v0.5, el combate). La **ciudad** se construye en coordenadas libres, como en Imperium, Pharaoh o Tropico: un edificio no ocupa «un hexágono», ocupa su huella real.

- **Colocación libre:** posición continua y giro libre (pasos de 15°; con Mayús, sin pasos). Cada tipo tiene una **huella** (rectángulo ancho × fondo): choza 0,5 × 0,35, casa 0,6 × 0,55, almacén 1,0 × 0,8, templo 1,6 × 1,2… Los campos se **dibujan arrastrando** un rectángulo: el área determina el rendimiento y el trabajo.
- **Validez:** la huella no puede solaparse con otras huellas ni con carreteras, todo el terreno bajo ella tiene que estar permitido y no puede cruzar un escalón de terraza. Los requisitos («junto al agua», «arcilla cerca») se miden en distancia real desde la huella. El fantasma se pinta verde o rojo y **dice por qué**.
- **Carreteras:** el jugador las traza como una línea con varios puntos que se suaviza en curva.
  - Tipos: senda (solo trabajo), camino de tierra apisonada y, en la v0.2+, calzada de ladrillo. Hay **puentes** de caña o madera sobre canales y ríos.
  - Coste por tramo, que se construye como cualquier obra.
  - Efecto físico: quien va por carretera camina ×1,5 (senda) o ×2 (camino) más rápido, lo que acorta los acarreos.
- **Orden sin rejilla:** si colocas un edificio cerca de una carretera, se **alinea a ella** (giro paralelo y puerta hacia el camino), como en Tropico. Así la ciudad sale ordenada por calles sin imponer una cuadrícula.
- **Movimiento:** las personas usan el grafo de carreteras cuando les compensa y, si no, van a campo traviesa con A* sobre los hexágonos (`rutas.ts`).
- **Fundación:** el almacén junto al río, una senda inicial hacia el agua y las chozas alineadas a ambos lados. La aldea empieza ordenada.

**Por qué:** con un edificio por hexágono la ciudad se veía desordenada y rígida (lo dijo el usuario). La colocación libre con calles da ciudades orgánicas y legibles, y deja los hexágonos para lo que hacen bien: el terreno y la estrategia.

## 8. Sociedad: capas de satisfacción (no hay una barra única)

| Capa | Qué mide | Fuente | Versión |
|---|---|---|---|
| **Bienestar** | Necesidades cubiertas frente a lo que se espera | Comida, agua, vivienda, salud y, después, cerveza, ropa y fiestas | v0.1 |
| **Seguridad material** | Si cree que comerá el mes que viene | Despensa del hogar + reservas del templo + pronóstico | v0.1 |
| **Expectativa** | El listón contra el que compara | Tiende al nivel de vida de los últimos meses: **la prosperidad sube el listón** | v0.1 |
| **Agravios** | Ofensas concretas y fechadas | Raciones recortadas, trabajo forzoso, represión, promesas incumplidas | v0.2 |
| **Confianza en el gobernante** | Si cree que cumples | Promesas cumplidas o rotas, reparto justo o injusto | v0.2 |
| **Legitimidad** | Derecho a mandar, distinto según el grupo | Sanción religiosa, prosperidad, victoria, tradición | v0.3 |
| **Cohesión** | Grado de unidad de los grupos | Religión común, desigualdad, origen (inmigrantes) | v0.3 |
| **Estabilidad** | Riesgo agregado de desorden | Agravios − (legitimidad + coerción + esperanza) | v0.2–v0.3 |

Respuestas escalonadas cuando aprieta (v0.2): **quejas → petición formal → protesta → huelga (dejan de trabajar) → disturbios → rebelión**. Cada paso enseña sus agravios causantes, y el jugador puede negociar, conceder, redistribuir, reprimir o esperar. Todas las opciones dejan su huella en la memoria.

## 9. Gobierno, leyes y facciones (v0.3)

- **Instituciones iniciales [H simplificado]:** el ensi, el templo (con su administrador, el *sanga*) y una asamblea de ancianos u hombres libres (la tradición de las asambleas mesopotámicas tiene base documental, aunque su peso real se discute [I]).
- **Facciones de partida:** Templo, Linajes terratenientes, Campesinos libres y Guerreros. Comerciantes y artesanos aparecen cuando su ocupación alcanza cierto peso. Cada facción tiene **intereses (pesos sobre variables), poder (riqueza, gente, armas, sanción religiosa) y memoria**.
- **Leyes:** cada ley define requisitos, beneficiados, perjudicados, coste, efecto inmediato y efecto a largo plazo. Ejemplos con base histórica: **condonación de deudas**, **leva de trabajo** (corvea para canales), **límite a las tasas del templo** (inspirado en las reformas de Uruinimgina de Lagash, ~2350 a. C. [H], cuyo alcance real se discute [I]), reparto de tierras del templo y ración mínima garantizada.
- **Formas de gobierno** que cambian por presión o reforma: gobierno de templo, realeza hereditaria, oligarquía de linajes, asamblea fuerte… Cada una cambia qué leyes existen y quién tiene poder de veto.

## 10. Diplomacia e IA rival (v0.4)

- Ciudades-estado vecinas simuladas con **el mismo modelo** que la tuya, en agregado. La IA no tiene trampas de recursos: sufre las mismas crecidas.
- **IA por utilidad con información imperfecta:** cada ciudad evalúa sus necesidades (comida, tierra, metal), su poder relativo *estimado* (lo que sabe por comerciantes, embajadas y espías), los costes de la guerra, el beneficio del comercio y su **memoria** (tratados cumplidos o rotos, ayudas, agravios). Distingue entre lo que *sabe*, lo que *sospecha* y lo que *ignora*.
- **Personalidad = pesos iniciales** que las circunstancias modifican. Una ciudad comerciante prefiere la paz mientras el comercio le compense.
- Acuerdos: comercio, frontera (con estelas de límite [H]), no agresión, alianza, tributo y vasallaje. Espionaje integrado (v0.4–v0.5): informar, sabotear canales o financiar facciones, con riesgo de que te descubran y consecuencias diplomáticas.

## 11. Guerra y navegación (v0.5)

- **Milicia** sacada de los hogares (deja huecos en el trabajo) o tropas del templo y del palacio. El equipo es lanza, escudo y casco de cobre [H, Estela de los Buitres]. Más adelante, carros de onagros [H].
- **Campaña en tiempo real, batallas por turnos [D, elegido por el usuario]:** los ejércitos se mueven, se abastecen y asedian en tiempo real. Cuando dos ejércitos hostiles entran en contacto, el mundo **se congela** y se abre una **batalla táctica por turnos** sobre los hexágonos reales del encuentro (río, colina, palmeral, canal).
  - **Coherencia temporal:** una batalla antigua duraba horas y en nuestra escala un día dura ~1 s. Congelar el mundo durante la batalla no rompe nada. Máximo **12 turnos** (un día); después, ambos se retiran a sus posiciones.
  - **Unidades = compañías** de 50–200 hombres, una por hexágono. Tienen movimiento, ataque, defensa, moral, fatiga y munición (honderos y arqueros). Hay zona de control, flanqueo (+ por cada aliado adyacente al enemigo), bonus de terreno (colina, ribera, palmeral) y ruptura por moral (huida antes que muerte).
  - **Conectada a la economía:** los soldados salen de los hogares (sus puestos quedan vacíos), el equipo sale del almacén, la moral y la fatiga iniciales dependen del suministro y de la marcha, y los muertos y heridos vuelven como hechos a la crónica y a los agravios.
  - **Resolución automática** opcional con la fórmula de **fuerza efectiva** = número × equipo × moral × experiencia × terreno × suministro × sorpresa, la misma que usa la IA entre rivales.
- **Suministro:** el ejército consume raciones que deben llegar por ruta. Si se aleja de la ruta, llegan las deserciones y la enfermedad. **Asedio:** las reservas de la ciudad frente a la paciencia y el suministro del sitiador.
- **Barcos fluviales y de cabotaje** para el comercio con el golfo (Dilmún, Magan) [H]. Riesgos: tormentas, piratas y bloqueos.

## 12. Progresión (v0.6) y motor

- **Cuatro árboles distintos, no intercambiables:** *Conocimiento* (técnicas: arado sembrador [H], torno de alfarero [H], metalurgia del bronce), *Instituciones* (escritura administrativa, tribunales, provincias: se desbloquean por condiciones sociales, no por puntos), *Cultura y culto* (festivales, epopeyas, monumentos) y *Doctrinas religiosas* (relación templo-palacio).
- **Coste de oportunidad real:** la investigación consume escribas y tiempo, que salen de otras tareas. Hay ramas excluyentes (por ejemplo, centralización frente a autonomía de las ciudades).
- **Motor:** el prototipo se hace en **three.js** (3D low-poly sobre hexágonos).
- **Motor final:** el desarrollo sigue en web hasta que el diseño esté probado, porque la lógica en TS puro es portable. La comparación completa Godot / Unity / Unreal es el **Entregable F**. Mi inclinación provisional es **Godot 4 + C#** (gratuito, ligero, 2D y 3D sólidos, sin regalías). La alternativa es Unity si hiciera falta un ECS para decenas de miles de agentes. Unreal es excesivo para un equipo de uno. La decisión se toma en v0.9 con datos de rendimiento.

## 13. Desastres

Ninguno es puramente aleatorio: tienen **probabilidad × exposición × preparación**.

| Desastre | Causa | Preparación | Cadena de efectos |
|---|---|---|---|
| **Crecida alta** | Deshielo (variable cada año, pronosticable) | Diques, edificar en alto, cosechar pronto | Campos y casas dañados → menos cosecha → raciones → bienestar → emigración |
| **Crecida baja / sequía** | Igual | Canales profundos y limpios, reservas | Campos sin agua → hambre diferida (se nota meses después) |
| **Salinización** | Riego sin drenaje ni barbecho [I] | Barbecho, rotación, lavado de suelos | El rendimiento cae año tras año → hay que expandirse (más canales, más mantenimiento) |
| **Epidemia** (v0.2) | Hacinamiento, agua estancada, hambre | Distancia a las marismas, pozos, reservas | Muertes → falta mano de obra → obras paradas |
| **Plaga de langosta** (v0.6) | Regional, estacional | Reservas, diversificar | Pérdida de cosecha a escala regional → tensiones con los vecinos |
| **Incendio** (v0.2) | Densidad de casas de caña | Adobe, separación | Pérdida de viviendas y bienes |

## 14. Mitología (v0.8)

- **Modo histórico** (por defecto): la mitología es creencia. Presagios (la adivinación está documentada [H]), festivales, dioses patronos cuya «ira» es una *interpretación social* de los desastres, que mueve la legitimidad y las facciones. No existen criaturas físicas.
- **Modo mitológico:** criaturas raras, cada una con su procedencia cultural correcta. Ejemplos mesopotámicos: **Humbaba**, guardián del Bosque de los Cedros en la *Epopeya de Gilgamesh* [H, fuente literaria], que bloquea el acceso a la madera de las montañas; y los **Anzû**, el ave leontocéfala que roba la Tablilla de los Destinos [H, fuente literaria]. Tienen señales previas, condiciones de aparición, varias respuestas (expedición, ofrendas, evitar la ruta) y consecuencias políticas y religiosas. Nunca son unidades de combate de catálogo.

## 15. Presión y dificultad: «nunca cómodo, nunca injusto»

**Fuentes de presión sistémicas** (en v0.1 no hay un «director» que lance desgracias):
1. **Expectativas que suben:** la prosperidad sube el listón y el bienestar cae si te estancas.
2. **El mantenimiento crece con el tamaño:** cada canal hay que dragarlo y cada casa repararla.
3. **Rendimientos decrecientes:** la mejor tierra se agota primero y la salinidad avanza.
4. **Varianza del río:** cada año es distinto y la media no protege contra la cola.
5. **Más gente = más bocas, más enfermedad y (v0.2) más grupos con intereses.**
6. (v0.4+) Vecinos que también pasan hambre y miran tus campos.

**Antifrustración:** las crisis **se anuncian** (pronóstico de la crecida con margen de error, reservas en días, tendencia del bienestar). Las caídas tienen inercia (da tiempo a reaccionar) y siempre hay al menos una respuesta, aunque sea cara.

**Dificultad (v0.9)** por ejes, no por multiplicadores tramposos: varianza del río, velocidad de las expectativas, tolerancia de los hogares, calidad del pronóstico, competencia de la IA y ayudas de la interfaz.

## 16. Victoria, derrota y supervivencia

- **v0.1:** gana quien sostiene el rango de ciudad 3 años seguidos; pierde quien ve abandonada la ciudad. Hay puntuación de legado.
- **v1.0:** caminos de hegemonía (territorio y vasallos), prosperidad (riqueza sostenida), legado cultural (monumentos, epopeya y prestigio), diplomacia (liga de ciudades) y supervivencia (llegar al final de la era). **Derrotas parciales:** convertirse en vasallo, fragmentarse o sufrir un cambio de dinastía. Se puede seguir jugando desde la nueva posición.

## 17. Interfaz y legibilidad

- **El botón «¿por qué?» en todo.** Cada número abre su desglose causal: *«Reserva de cebada: 41 días. Consumo: 12/día (300 hab.). Entradas previstas: cosecha en 38 días, estimada en 380 ± 120 (la crecida puede dañar los campos del este)»*.
- **Inspector** de hexágono, edificio, hogar y agente: qué hace, por qué y qué le falta.
- **Capas del mapa:** fertilidad, salinidad, agua, riesgo de inundación, bienestar por barrio y rutas de acarreo.
- **Crónica:** acontecimientos con fecha, causa y consecuencias enlazadas. Es la historia de la partida y la herramienta para entender la caída.
- **Alertas sobrias:** pocas, con una acción sugerida. El estado del mundo se ve en la ciudad misma (colas en el almacén, campos amarillos, gente sentada en huelga).

## 18. Riesgos técnicos y soluciones

| Riesgo | Por qué es serio | Solución concreta |
|---|---|---|
| **Rendimiento con muchos agentes** | Pathfinding y lógica por agente escalan mal | Datos en arrays tipados (SoA), rutas cacheadas y *flow fields* hacia almacenes, sistemas a distintas frecuencias, simulación en un Web Worker si hace falta, ciudades lejanas en agregado. Objetivo v0.1: **500 agentes a 60 FPS, tick < 4 ms a ×4**. |
| **Simulación opaca** | Si el jugador no entiende, parece aleatorio | **Registro causal:** cada cambio importante guarda su causa. El inspector y la crónica leen de ahí. Se diseña desde F02, no al final. |
| **Balance de sistemas acoplados** | Espirales de muerte o equilibrios cómodos | **Simulaciones headless de 20–50 años en tests**, con bandas: falla si la ciudad pasiva sobrevive cómoda y falla si la bien gestionada muere sin remedio. |
| **Determinismo** | Sin él, los bugs no se pueden reproducir | Tick fijo, RNG con semilla (nunca `Math.random`), la lógica no lee nada del render. Misma semilla + mismas órdenes = misma partida (test). |
| **IA rival cara** | Planificar para N ciudades | Decisiones por utilidad una vez por estación, no por frame; información imperfecta como datos simples. |
| **Alcance** | El proyecto infinito no se termina | Versiones cerradas y jugables (`versiones.md`). Lo que no entra se anota como `falta`. |
| **Migración de motor** | Reescribir todo | `src/logic/` sin Phaser, estado serializable plano y contratos en JSON. Se porta a C# sistema a sistema con los mismos tests como oráculo. |
| **Arte para muchas cosas** | Una persona no modela 200 edificios | Low-poly generado por código (primitivas combinadas, sombreado plano y paleta común). Más adelante, modelos glTF propios o con licencia CC0 con el mismo estilo. La legibilidad manda sobre el detalle. |
| **3D más caro que 2D** | Cámara, selección, sombras y rendimiento en GPU | `InstancedMesh` por tipo de terreno, edificio y habitante (pocas *draw calls*), selección de hexágono por coordenadas axiales (no raycast por malla), sombras solo de la luz principal. Objetivo: **< 150 draw calls, 60 FPS con 2 000 hexágonos y 500 habitantes**. |
