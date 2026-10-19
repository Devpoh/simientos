# IMPERIUM — El nacimiento y la caída de las civilizaciones · Prompt maestro + anexo creativo

> Documento guía original del usuario: la visión completa del juego. Recibido de nuevo el 2026-10-19 y guardado **tal cual** (sin el índice de secciones).
> **Cómo convive con los textos posteriores (decisiones del 19-10 con el usuario, R35–R38 en `requisitos-usuario.md`):**
> - **Nombre:** provisional **CIMIENTOS** (ni IMPERIUM ni SEDIMENTO, hasta que el usuario lo decida).
> - **Guerra:** campaña, economía y diplomacia en **tiempo real**, pero las **batallas tácticas son por turnos** (R7, confirmado). Esto sustituye solo lo que §11 y el anexo §28 dicen de las batallas.
> - **Motor:** se sigue con **three.js** (web), con la lógica portable; la comparación de motores de §21 se hace en la v0.9.
> - **Construcción y terreno:** mandan `direccion-artistica.md` (sin casillas, terreno continuo, construcción progresiva) y `camara.md`.
> - El resto del documento está **vigente** (R34).

---

## PARTE I · PROMPT MAESTRO

### 1. Tu misión

Actúa como un equipo de desarrollo profesional especializado en videojuegos de estrategia y simulación de gran profundidad. Asume los roles de director creativo, diseñador de sistemas, historiador, economista, especialista en inteligencia artificial, diseñador de combate, arquitecto de software y experto en optimización.

Quiero diseñar y desarrollar un videojuego de estrategia, construcción de ciudades y gestión de civilizaciones antiguas que combine la libertad de construir y gobernar, una economía compleja, una población simulada que tenga vida propia, conflictos políticos, diplomacia, guerras, desarrollo cultural y decisiones difíciles que puedan cambiar el destino de una civilización entera.

El proyecto tendrá como nombre provisional IMPERIUM. Podrás proponer un nombre mejor si encuentras uno más original y apropiado.

No quiero un documento superficial lleno de ideas atractivas pero desconectadas. Quiero diseñar un juego cuyas mecánicas estén cuidadosamente conectadas, tengan reglas claras, creen situaciones emergentes y puedan implementarse técnicamente.

Tu responsabilidad es transformar esta visión en un proyecto realista, coherente, profundo, escalable y técnicamente viable.

### 2. Los videojuegos que definen la inspiración

Estudia las siguientes referencias y extrae sus principios de diseño más valiosos. Úsalos como inspiración, no como una plantilla que debas copiar literalmente. El resultado debe tener identidad propia.

**Tropico 6 — Gobierno y política.** Inspírate en la gestión política, el equilibrio entre facciones, la economía nacional, el comercio exterior, las demandas de los ciudadanos, la corrupción, la legitimidad del gobernante y las consecuencias de las decisiones gubernamentales. Traslada estas ideas a un contexto de civilizaciones antiguas: faraones, reyes, emperadores, repúblicas, oligarquías, consejos religiosos, aristocracias y otras formas de organización política.

**Civilization VI — Civilizaciones, expansión y estrategia.** Inspírate en las civilizaciones asimétricas, la expansión territorial, la investigación tecnológica, la cultura, la religión, la diplomacia, las ciudades rivales, las guerras y el desarrollo de imperios. La diferencia fundamental es que el juego NO debe desarrollarse por turnos. Todo debe ocurrir en un mundo que continúa evolucionando en tiempo real. Conserva la profundidad estratégica, pero permite observar las consecuencias físicas de las decisiones mientras suceden.

**Frostpunk — Supervivencia y decisiones morales.** Inspírate en la presión constante sobre los recursos, las leyes difíciles, los conflictos de intereses, el sacrificio de derechos por supervivencia, el descontento social y las consecuencias a largo plazo de las decisiones. Adapta este enfoque a las civilizaciones antiguas. La supervivencia podrá depender del clima, las sequías, las inundaciones, las plagas, las malas cosechas, las invasiones, las epidemias, el agotamiento de recursos o la inestabilidad política. El jugador nunca debe sentirse completamente seguro de que su ciudad sobrevivirá.

**Songs of Syx — Simulación de población y economía.** Inspírate en la simulación de grandes poblaciones, los sistemas de producción, las cadenas de suministro, las necesidades de los habitantes, los distintos grupos sociales, el crecimiento urbano y los problemas derivados de administrar ciudades cada vez mayores. Quiero que la población no sea simplemente una cifra en una interfaz. Debe representar personas que necesitan alimentos, agua, viviendas, protección, oportunidades económicas, servicios y estabilidad.

**Mitologías y civilizaciones históricas.** Incorpora la riqueza cultural, los relatos, las creencias, las criaturas mitológicas y las amenazas sobrenaturales procedentes de distintas tradiciones históricas. Estos elementos deben integrarse en el juego mediante un sistema opcional y coherente, respetando la identidad de cada cultura. El resultado debe combinar la profundidad histórica y estratégica con la posibilidad de que existan acontecimientos legendarios capaces de cambiar el destino de un imperio.

### 3. La experiencia central del jugador

El jugador empieza con un asentamiento pequeño y recursos limitados. Decide dónde construir, qué producir, cómo alimentar a la población, qué leyes establecer, cómo organizar el gobierno y qué dirección seguirá su civilización.

Con el paso del tiempo, el asentamiento puede transformarse en una ciudad próspera, una capital monumental, una república comercial, una potencia militar, un centro religioso o el corazón de un imperio.

Sin embargo, crecer también implica nuevos problemas.

Más habitantes requieren más comida, agua, viviendas, empleos, infraestructuras y protección. Las clases sociales desarrollan intereses distintos. Las élites pueden conspirar. Los comerciantes pueden exigir privilegios. Los generales pueden acumular poder. Las ciudades rivales pueden bloquear rutas comerciales o iniciar una guerra. Una sequía puede destruir las cosechas y obligar al gobernante a elegir quién recibe los alimentos disponibles.

El jugador debe administrar tanto el crecimiento como las consecuencias del crecimiento.

Quiero que cada partida genere una historia propia a partir de las decisiones del jugador, las circunstancias del mundo y el comportamiento de las demás civilizaciones.

### 4. Un mundo en tiempo real y visualmente vivo

El juego debe funcionar en tiempo real, con la posibilidad de pausar, acelerar o ralentizar la simulación.

No debe utilizar turnos tradicionales para gestionar la ciudad, la economía, la diplomacia o la guerra.

**Población visible.** Los habitantes deben desplazarse por la ciudad, trabajar, transportar productos, acudir a mercados, construir edificios, cultivar campos, comerciar, rezar, descansar, socializar, enfermar, huir y participar en conflictos. Cada individuo o grupo simulado debe tener una función dentro de la economía y de la sociedad. La simulación debe ser suficientemente profunda para que sus acciones tengan sentido, pero también lo bastante eficiente como para manejar grandes poblaciones. No es necesario representar cada operación económica con una animación individual cuando la población crezca enormemente. Diseña un sistema híbrido que combine individuos visibles, grupos de trabajadores y cálculos agregados, manteniendo la coherencia del mundo.

**Construcción dinámica.** Los edificios no deben aparecer instantáneamente cuando el jugador los coloca. Quiero ver terrenos preparados, materiales transportados, trabajadores construyendo, obras que avanzan por etapas, edificios terminados y estructuras que evolucionan según las necesidades de la ciudad. Si faltan trabajadores, herramientas, materiales o dinero, una construcción debe detenerse o avanzar más lentamente. Los edificios deberían tener funciones, capacidad, costes de mantenimiento, necesidades de trabajadores, niveles de mejora y efectos concretos sobre la ciudad.

**Ciudades con identidad visual.** La arquitectura debe evolucionar con la tecnología, la riqueza, la cultura, el clima y las tradiciones de cada civilización. Los barrios residenciales, mercados, templos, fortificaciones, puertos, talleres, monumentos, palacios, caminos y edificios administrativos deben reflejar la evolución histórica y económica del asentamiento. Quiero contemplar una ciudad que pase de ser un asentamiento humilde a una metrópolis antigua llena de actividad.

**El mundo no se detiene.** Aunque el jugador observe una ciudad, el resto del mapa continúa desarrollándose. Las ciudades rivales producen, comercian, investigan, construyen, negocian, compiten por territorios y se enfrentan a problemas internos. El mundo debe funcionar como un sistema de sociedades independientes, no como un escenario que solo reacciona cuando el jugador actúa.

### 5. Un sistema económico profundo y coherente

La economía debe ser uno de los pilares fundamentales. No quiero un sistema simplificado en el que los edificios generen dinero automáticamente sin explicar de dónde procede la riqueza.

**Recursos y producción.** Diseña una economía basada en recursos naturales, trabajo, transporte, transformación de materias primas, almacenamiento, consumo y comercio. Incluye categorías como:

- Alimentos: cereales, frutas, pescado, carne, aceite y otros productos adecuados a cada región.
- Recursos naturales: madera, piedra, arcilla, hierro, cobre, estaño, metales preciosos y otros minerales.
- Bienes elaborados: herramientas, cerámica, tejidos, armas, barcos, materiales de construcción y productos de lujo.
- Recursos estratégicos: caballos, madera naval, sal, minerales específicos, productos medicinales y otros recursos pertinentes según la época.
- Servicios y bienes intangibles: administración, educación, conocimiento, religión, cultura y servicios urbanos.

La disponibilidad debe depender del mapa, el clima, la tecnología, las instalaciones y las circunstancias históricas.

**Cadenas de producción.** Cada industria debe depender de insumos, trabajadores, instalaciones y transporte. Por ejemplo: la extracción de mineral genera materia prima. El mineral debe trasladarse a un taller o fundición. Los trabajadores procesan el material. La producción necesita combustible y herramientas. El producto terminado se almacena, se consume o se comercia. Si una parte de la cadena falla, las consecuencias deben propagarse por el sistema económico. Quiero que puedan existir interrupciones por falta de materias primas, trabajadores, rutas comerciales, seguridad o capacidad de almacenamiento.

**Oferta, demanda y precios.** Diseña un mercado dinámico en el que los precios respondan a la disponibilidad y demanda de los productos, las rutas comerciales, los impuestos, las guerras, las malas cosechas y las políticas gubernamentales. La escasez debe encarecer determinados productos. La sobreproducción puede reducir sus precios. Una ciudad puede prosperar especializándose en una industria y comerciando con regiones que producen otros bienes. Evita que el dinero aparezca sin una fuente económica identificable.

**Finanzas del Estado.** Incluye impuestos, tasas comerciales, aranceles, salarios públicos, gasto militar, costes administrativos, obras públicas, mantenimiento, reservas estatales, deuda si encaja con el sistema histórico elegido y mecanismos para financiar emergencias. Un aumento de impuestos puede mejorar los ingresos a corto plazo, pero reducir el bienestar, la actividad comercial o la legitimidad política. Los efectos deben depender del contexto y no ser siempre iguales.

**Recursos limitados.** Los recursos naturales deben existir en cantidades, ubicaciones y ritmos de renovación definidos. Algunos recursos, como determinados minerales, pueden agotarse. Otros, como los bosques o las poblaciones de peces, pueden recuperarse si se gestionan adecuadamente. La sobreexplotación, el deterioro ambiental y la competencia por los recursos deben tener consecuencias reales. Los recursos estratégicos deben generar motivos para establecer alianzas, colonizar territorios, construir rutas comerciales, negociar tratados o declarar guerras.

### 6. Una población que tenga vida propia

Crea un sistema social en el que la satisfacción no dependa exclusivamente de un número global llamado felicidad. Cada habitante debe tener, según el nivel de simulación, necesidades, ocupación, ingresos, acceso a bienes, condiciones de vivienda, creencias y relación con el gobierno.

**Necesidades de los habitantes.** Considera alimentación, agua, vivienda, salud, seguridad, empleo, descanso, pertenencia social, religión, cultura y otros factores apropiados para la época. Las necesidades deben depender de la cultura, la clase social, la tecnología y las circunstancias. Un habitante puede estar alimentado, pero descontento porque paga demasiados impuestos. Otro puede disfrutar de buenos ingresos, pero vivir en un barrio inseguro. Un trabajador puede aceptar temporalmente condiciones difíciles durante una guerra, pero rebelarse cuando la situación se prolonga.

**Clases y grupos sociales.** Incluye categorías históricamente plausibles como campesinos, artesanos, comerciantes, trabajadores especializados, soldados, sacerdotes, aristócratas, funcionarios, esclavos allí donde sea históricamente pertinente y otras categorías propias de cada civilización. No impongas una estructura universal a todas las culturas: cada sociedad debe poseer reglas e instituciones que puedan cambiar con el tiempo. Los grupos sociales deben tener intereses, privilegios, obligaciones, expectativas y capacidad de ejercer presión política.

**Felicidad, estabilidad y legitimidad.** Distingue claramente entre:

- Bienestar individual.
- Satisfacción con los servicios.
- Seguridad material.
- Confianza en el gobernante.
- Legitimidad política.
- Estabilidad social.
- Lealtad a la ciudad o al imperio.
- Cohesión cultural y religiosa.

Una ciudad puede ser rica y, al mismo tiempo, inestable. También puede ser pobre, pero mantener una elevada cohesión social. Estos valores deben responder a las condiciones reales de la población y a las decisiones gubernamentales.

**Protestas, rebeliones y revoluciones.** Cuando existan agravios suficientes, los ciudadanos deben poder protestar, organizar movimientos, realizar huelgas, resistirse a las autoridades, conspirar o rebelarse. Las rebeliones no deben aparecer mediante eventos aleatorios sin explicación. Quiero que se desarrollen a partir de causas identificables: hambre, discriminación, desigualdad, corrupción, represión, crisis económica, derrotas militares, conflictos religiosos, abusos de las élites o pérdida de legitimidad. El jugador debe disponer de varias respuestas, como negociar, reformar las leyes, realizar concesiones, cambiar ministros, redistribuir recursos o utilizar la fuerza. Cada respuesta debe tener riesgos y consecuencias posteriores.

### 7. Gobierno, leyes y decisiones difíciles

La política debe ser un sistema jugable, no una colección de botones decorativos. Permite que las civilizaciones evolucionen mediante diferentes formas de gobierno, como monarquías, repúblicas, oligarquías, sistemas teocráticos, imperios centralizados y otras estructuras coherentes con la progresión histórica. Las formas de gobierno deben cambiar las instituciones, los poderes disponibles, los derechos, la distribución de recursos y las relaciones entre los grupos sociales.

**Políticas y legislación.** El jugador debe poder aprobar leyes sobre impuestos, comercio, servicio militar, propiedad, religión, ciudadanía, trabajo, justicia, educación, organización administrativa y uso de recursos. Cada ley debe tener requisitos, beneficiarios, perjudicados, costes, efectos inmediatos y consecuencias a largo plazo. Por ejemplo, aumentar el servicio militar obligatorio puede fortalecer el ejército, pero retirar trabajadores de las granjas y reducir la producción de alimentos. Una reforma agraria puede mejorar las condiciones de algunos grupos y provocar resistencia entre los terratenientes. La construcción de un monumento puede aumentar el prestigio cultural y religioso, pero consumir recursos necesarios para alimentar a la población. Quiero decisiones con ventajas y desventajas auténticas. No debería existir una opción que sea siempre la mejor en cualquier circunstancia.

**Facciones políticas.** Crea facciones con objetivos propios, capacidad de influencia y memoria de las acciones del jugador. Pueden incluir comerciantes, aristócratas, sacerdotes, generales, campesinos, reformistas, tradicionalistas y otros grupos específicos de cada sociedad. Las facciones deben negociar, presionar, retirar apoyo, financiar movimientos políticos, formar coaliciones o conspirar si las condiciones lo permiten. El jugador puede ganarse su apoyo, pero mantener contentos a todos debe ser prácticamente imposible en determinadas circunstancias.

**Consecuencias persistentes.** Las decisiones no deben olvidarse después de unos minutos. Una represión puede estabilizar una ciudad a corto plazo y crear resentimiento durante años. Una reforma beneficiosa puede mejorar progresivamente la confianza. Una promesa incumplida puede debilitar futuras negociaciones. La memoria política debe influir en la evolución del mundo.

### 8. Espionaje, conspiraciones y cambios de poder

Diseña un sistema de espionaje que permita obtener y proteger información estratégica. Las acciones pueden incluir reconocimiento militar, infiltración, contraespionaje, robo de conocimientos, sabotaje de infraestructuras, obtención de secretos comerciales, descubrimiento de conspiraciones y apoyo encubierto a facciones rivales. Los espías deben tener costes, riesgos, posibilidades de detección y consecuencias diplomáticas. Los dirigentes rivales también deben utilizar estas herramientas.

Las conspiraciones políticas pueden surgir de conflictos sucesorios, ambiciones militares, rivalidades entre élites, crisis de legitimidad o luchas entre facciones. Incluye, cuando sea coherente con el sistema histórico, golpes de Estado, disputas sucesorias, asesinatos políticos, guerras civiles y cambios de gobierno. Estas mecánicas deben estar integradas con la diplomacia, la estabilidad y la inteligencia artificial, no funcionar como minijuegos aislados.

### 9. Diplomacia e inteligencia artificial de civilizaciones rivales

Cada civilización controlada por la IA debe tener personalidad, intereses estratégicos, limitaciones y objetivos propios. No quiero que todas las civilizaciones actúen igual ni que ataquen únicamente porque el juego necesita crear dificultades. Cada una debe evaluar factores como:

- Sus necesidades económicas y militares.
- Su posición geográfica y acceso a recursos.
- Sus objetivos territoriales.
- Su relación comercial con otras potencias.
- Su cultura, religión y estructura política.
- Su memoria histórica de guerras y tratados.
- La reputación, fiabilidad y conducta del jugador.
- Su percepción de amenazas y oportunidades.
- Los costes y riesgos de un conflicto.
- La posibilidad de obtener beneficios mediante la cooperación.

**Relaciones dinámicas.** Las civilizaciones deben poder establecer alianzas, tratados comerciales, pactos de no agresión, acuerdos defensivos, intercambios tecnológicos, relaciones diplomáticas y alianzas contra enemigos comunes. También deben poder competir económicamente, imponer bloqueos, reclamar territorios, exigir concesiones, romper tratados, declarar guerras y organizar coaliciones. Una civilización comerciante puede preferir una relación pacífica cuando obtiene beneficios del intercambio. Una potencia expansionista puede aprovechar una frontera debilitada. Otra podría tolerar grandes diferencias culturales si comparte suficientes intereses estratégicos. Estas son tendencias que deben surgir de los intereses y circunstancias de la IA, no reglas rígidas.

**Memoria y reputación.** La IA debe recordar las acciones importantes del jugador. Traicionar a un aliado debe afectar la confianza futura. Cumplir acuerdos puede facilitar nuevas alianzas. Atacar repetidamente a vecinos débiles puede provocar coaliciones defensivas. Sin embargo, las civilizaciones deben poder cambiar de postura si sus intereses cambian.

**Inteligencia estratégica.** La IA necesita información imperfecta, capacidades de evaluación de riesgos, planificación y objetivos a corto y largo plazo. No debe conocer mágicamente todos los movimientos, recursos y planes del jugador. Debe distinguir entre lo que sabe, lo que sospecha y lo que desconoce. Diseña un sistema en el que las civilizaciones rivales también puedan sufrir crisis económicas, rebeliones, derrotas, escasez y decisiones equivocadas.

### 10. Expansión territorial, ciudades y fronteras

El mapa debe ofrecer oportunidades geográficas y conflictos estratégicos. El jugador debe poder fundar asentamientos, expandir fronteras, controlar pasos montañosos, ríos, costas, valles agrícolas, minas, bosques y otros lugares de importancia. Las ciudades deben tener su propio desarrollo, población, economía local, infraestructuras, seguridad e intereses. Decide cómo se gestionarán la autonomía urbana, la administración de provincias, los costes de mantener territorios lejanos y las dificultades logísticas de gobernar un imperio extenso. Las fronteras deben ser importantes. Compartir territorio, controlar rutas o competir por recursos puede crear tensiones diplomáticas. El jugador debe poder negociar fronteras, reclamar territorios, conquistar ciudades o integrarlas mediante mecanismos políticos cuando corresponda. La expansión nunca debe ser gratuita: los territorios nuevos necesitan defensa, administración y recursos.

### 11. Guerra y estrategia militar

Diseña un sistema militar en tiempo real que permita organizar ejércitos, trasladar unidades, proteger ciudades, asediar fortalezas, defender rutas y librar batallas. Las tropas deben necesitar suministros, equipamiento, entrenamiento y financiación.

**Ejércitos diferenciados.** Incluye unidades apropiadas para las tecnologías y circunstancias históricas de cada sociedad: infantería, arqueros, lanceros, caballería cuando esté disponible, tropas especializadas, máquinas de asedio y unidades navales. Cada unidad debe tener fortalezas, debilidades, costes y requisitos. El resultado de una batalla debe depender de varios factores, no exclusivamente del número de soldados:

- Terreno y condiciones ambientales.
- Formación y composición del ejército.
- Calidad de las armas y armaduras.
- Experiencia y disciplina.
- Liderazgo y moral.
- Suministros y fatiga.
- Reconocimiento e información.
- Clima y visibilidad.
- Fortificaciones y preparación defensiva.

**Logística y consecuencias.** Un ejército que se aleja demasiado de sus líneas de suministro puede sufrir escasez, enfermedades, deserciones y pérdidas de capacidad de combate. Los asedios deben implicar tiempo, reservas alimentarias, fortificaciones, maquinaria y decisiones tácticas. Las guerras deben tener costes económicos y sociales: impuestos extraordinarios, reclutamiento, destrucción, refugiados, pérdida de producción, endeudamiento y malestar político. El jugador debe poder ganar una batalla y perder la guerra por falta de recursos o estabilidad interna.

**Diplomacia militar.** Incluye declaraciones de guerra con justificaciones posibles, tratados de paz, reparaciones, cesiones territoriales, liberación de territorios, alianzas militares, capitulaciones y consecuencias diplomáticas. La IA debe considerar si una guerra le conviene, no limitarse a atacar cuando tiene suficiente fuerza.

### 12. Navegación, barcos y comercio marítimo

El mar debe ser una infraestructura estratégica y un espacio de oportunidades y riesgos. Incluye puertos, embarcaciones comerciales, transportes militares, rutas navales, exploración, expediciones, bloqueo de puertos y enfrentamientos navales cuando la época y tecnología lo permitan. Las civilizaciones deben desarrollar barcos según su acceso a costas, conocimientos técnicos, recursos y tradición histórica. El comercio marítimo puede ser más eficiente en determinadas rutas, pero debe presentar riesgos relacionados con piratas, enemigos, tormentas, bloqueos, pérdida de embarcaciones y costes portuarios. La navegación debe depender de la disponibilidad de materiales, instalaciones, trabajadores especializados y conocimientos.

El transporte terrestre también debe ser importante. Los caminos, puentes, pasos, ríos navegables y rutas caravaneras pueden cambiar el equilibrio económico y militar de una región. Los productos deben tardar un tiempo razonable en llegar a su destino. Una ciudad no debe beneficiarse inmediatamente de recursos situados al otro lado del mapa.

### 13. Civilizaciones asimétricas e históricamente fundamentadas

Quiero jugar con civilizaciones diferentes, cada una con ventajas, limitaciones y posibilidades estratégicas propias. No quiero que sean simples variaciones estéticas de una misma facción. Investiga y diseña las civilizaciones utilizando referencias históricas fiables. Sus características deben reflejar, con los matices adecuados, sus instituciones, geografía, conocimientos, actividades económicas, tradiciones y prácticas militares documentadas.

Entre las posibles civilizaciones iniciales pueden encontrarse:

- Egipto antiguo.
- Ciudades y culturas de Mesopotamia, incluidas Sumeria y Babilonia en sus respectivos contextos históricos.
- Ciudades-Estado griegas.
- Roma.
- Fenicia.
- Persia.
- China antigua.
- Civilizaciones del subcontinente indio.
- Cartago.
- Civilizaciones mayas.

La lista no es definitiva. Evalúa qué civilizaciones ofrecen experiencias de juego realmente distintas y cuáles conviene reservar para futuras expansiones.

**Diferencias reales entre civilizaciones.** Cada civilización debe diferenciarse mediante combinaciones de:

- Ventajas económicas.
- Capacidades administrativas.
- Tradiciones comerciales.
- Organización militar.
- Conocimientos científicos.
- Arquitectura y urbanismo.
- Instituciones políticas.
- Religión y cultura.
- Unidades o edificios característicos.
- Condiciones geográficas iniciales.
- Dificultades y oportunidades particulares.

No asignes bonificaciones históricas arbitrarias solo para hacerlas interesantes. Cada ventaja debe tener una justificación histórica o una explicación claramente identificada como interpretación de diseño. Evita presentar pueblos históricos distintos como si hubieran existido simultáneamente o compartido las mismas instituciones. Define una cronología y un marco histórico coherentes, o explica cómo funcionará la mezcla de épocas si el juego permite una evolución alternativa.

### 14. Árboles de progresión: ciencia, tecnología, cultura, religión y política

Crea varios árboles de desarrollo interconectados.

**Tecnología y ciencia.** La investigación debe abrir nuevas capacidades: herramientas, agricultura, metalurgia, arquitectura, navegación, administración, ingeniería, medicina, logística y tecnologías militares. Las investigaciones deben tener requisitos, costes, tiempo, efectos, dependencias y aplicaciones concretas. No quiero una lista lineal de mejoras sin contexto. Las prioridades de investigación deben permitir estrategias diferentes.

**Cultura y conocimiento.** La cultura puede proporcionar prestigio, cohesión, difusión de ideas, atracción de población, influencia exterior y capacidad diplomática. Incluye tradiciones, artes, educación, literatura, arquitectura monumental y otros elementos que encajen históricamente.

**Religión y creencias.** Las religiones deben tener doctrinas, instituciones, tradiciones, lugares de culto, prácticas y relaciones con el poder político. El jugador puede favorecer una religión, permitir distintas creencias, promover reformas o modificar la relación entre la autoridad civil y la religiosa, dependiendo de las instituciones existentes. Las decisiones religiosas pueden afectar a la cohesión social, la legitimidad, las relaciones exteriores y los conflictos internos.

**Políticas e instituciones.** Las reformas políticas deben desbloquearse por condiciones históricas, económicas, sociales o tecnológicas apropiadas. No todo debe investigarse con puntos de ciencia. Diferencia entre conocimiento científico, desarrollo cultural, cambios institucionales y transformaciones religiosas.

**Progresión con consecuencias.** Cada avance debe modificar las posibilidades reales del jugador. Una nueva tecnología agrícola puede aumentar la producción y sostener una población mayor. Una mejora naval puede abrir nuevas rutas comerciales. Una reforma administrativa puede facilitar la gestión de provincias, pero incrementar el coste burocrático. Los árboles deben contener decisiones interesantes y oportunidades de especialización. No quiero que una partida permita desbloquear absolutamente todo sin costes de oportunidad. Define claramente qué elementos son obligatorios, opcionales, excluyentes o dependientes de decisiones anteriores.

### 15. Evolución histórica y paso del tiempo

La civilización debe atravesar etapas de desarrollo coherentes: desde sociedades tempranas y asentamientos agrícolas hasta reinos, ciudades complejas e imperios, según el alcance histórico que definas. No quiero que todas las sociedades deban seguir exactamente la misma trayectoria. La progresión debe surgir de las condiciones de cada partida, los conocimientos disponibles, las decisiones políticas, el entorno y los contactos con otras culturas. El paso del tiempo debe transformar la arquitectura, las capacidades productivas, la organización militar, las instituciones y las relaciones internacionales. Determina una escala temporal jugable para que la construcción, el crecimiento demográfico, la producción, los viajes, la investigación y las guerras avancen a velocidades compatibles entre sí. Evita que una tecnología avance en meses mientras una construcción equivalente requiere décadas, salvo que exista una explicación mecánica clara.

### 16. Mitología y criaturas legendarias

Quiero incorporar criaturas, relatos y amenazas procedentes de diversas tradiciones mitológicas. Estas criaturas pueden incluir, entre otras, la Esfinge y figuras asociadas al imaginario egipcio, el grifo y criaturas vinculadas a distintas tradiciones del Mediterráneo, seres de la mitología griega y criaturas de las tradiciones mesopotámicas, persas, chinas, indias o mesoamericanas. Investiga cuidadosamente la procedencia y las características tradicionales de cada criatura. No mezcles mitologías sin justificación ni presentes interpretaciones modernas como hechos históricos.

**Integración en el juego.** Las criaturas pueden aparecer como amenazas regionales, encuentros excepcionales, acontecimientos legendarios, guardianes de lugares especiales o elementos relacionados con misiones y tradiciones religiosas. Sus apariciones deben tener señales previas, causas o condiciones comprensibles, riesgos, posibles respuestas y consecuencias. Por ejemplo, una amenaza legendaria puede interrumpir una ruta comercial, provocar una expedición militar o crear disputas religiosas y políticas sobre cómo debe responder la sociedad. No quiero que los monstruos aparezcan constantemente ni que se conviertan en una mecánica arbitraria que destruya el equilibrio económico.

**Modo histórico y modo mitológico.** Diseña dos configuraciones claramente diferenciadas. **Modo histórico:** el mundo se fundamenta en procesos históricos y los mitos aparecen principalmente como creencias, relatos, tradiciones, interpretaciones religiosas, nombres, arte y acontecimientos culturales. No se afirma que las criaturas sobrenaturales existan físicamente. **Modo mitológico:** algunas criaturas y amenazas legendarias pueden existir realmente dentro del universo ficticio del juego e interactuar con las ciudades, los ejércitos y la economía. Este segundo modo debe integrar la mitología con coherencia y evitar convertir todas las civilizaciones en una fantasía genérica.

### 17. Desastres naturales y catástrofes

El entorno debe poder cambiar de manera significativa. Incluye acontecimientos como sequías, inundaciones, terremotos, tormentas, incendios, epidemias, malas cosechas, plagas, erupciones volcánicas y fenómenos regionales adecuados al mapa. No todos los desastres deben ser aleatorios ni imposibles de prevenir. La geografía, el clima, la infraestructura, la planificación urbana, la tecnología y la preparación pueden modificar la probabilidad de sufrir daños o la capacidad para recuperarse. Las decisiones preventivas deben tener costes. El jugador podría construir canales y diques, crear reservas alimentarias, mejorar la sanidad, diversificar cultivos, reforzar edificios o desarrollar rutas alternativas. Una catástrofe debe provocar efectos encadenados: pérdida de cosechas, encarecimiento de alimentos, desplazamiento de población, problemas fiscales, descontento, tensiones diplomáticas e incluso guerras por recursos. Las ciudades que se preparan bien deben tener mejores posibilidades de recuperación que aquellas que ignoran los riesgos.

### 18. Dificultad y desafío a largo plazo

Quiero varios niveles de dificultad, desde una experiencia accesible hasta una simulación exigente para jugadores expertos. Toma como referencia la progresión de dificultad de Civilization, pero adapta sus principios a una simulación continua. La dificultad no debe limitarse a aumentar los costes del jugador o proporcionar recursos gratuitos a sus enemigos. Diseña distintos niveles de exigencia para:

- Gestión económica.
- Necesidades de la población.
- Frecuencia e impacto de las crisis.
- Inteligencia y planificación de las civilizaciones rivales.
- Costes logísticos y militares.
- Complejidad diplomática.
- Gestión de territorios y provincias.
- Efectos de las decisiones equivocadas.
- Disponibilidad de información y ayudas al jugador.

En niveles superiores, las civilizaciones rivales deben ser más competentes y aprovechar oportunidades estratégicas. No deben convertirse en adversarios omniscientes que ignoren las reglas del mundo.

**Escalado de los desafíos.** La dificultad debe aumentar de manera natural conforme crece la civilización. Un pequeño asentamiento tiene problemas de supervivencia y recursos básicos. Una ciudad mediana debe resolver problemas de urbanismo, abastecimiento, empleo y desigualdad. Un reino necesita instituciones, ejército, diplomacia y administración. Un imperio debe gestionar provincias, fronteras, grandes ejércitos, élites poderosas y amenazas simultáneas. El éxito genera nuevas responsabilidades. Una expansión demasiado rápida puede provocar sobreextensión, problemas fiscales, separatismo y dificultades logísticas. Quiero crisis que puedan anticiparse parcialmente, mitigarse y, a veces, superar con un coste elevado. No hagas que cada partida siga una secuencia fija de desgracias. Los acontecimientos deben depender de las condiciones y los riesgos acumulados.

### 19. Condiciones de victoria, derrota y supervivencia

No quiero que la única forma de ganar sea conquistar todas las ciudades enemigas. Diseña diferentes caminos potenciales hacia el éxito:

- Dominio territorial y militar.
- Prosperidad económica y comercial.
- Liderazgo científico y tecnológico.
- Influencia cultural y religiosa.
- Supremacía diplomática.
- Supervivencia y estabilidad a largo plazo.
- Construcción de una sociedad excepcionalmente desarrollada.

Estas condiciones deben ser compatibles con la duración y escala de la partida. También debe ser posible que una civilización fracase, se fragmente, sea conquistada, pierda su independencia, sufra una guerra civil o colapse por sus propias contradicciones. Cuando sea coherente con el diseño, una ciudad o civilización derrotada puede sobrevivir de otra forma: como provincia, estado vasallo, aliado subordinado o cultura integrada en otro imperio. La derrota no siempre tiene que equivaler a perder una batalla.

### 20. Interfaz y legibilidad de la simulación

La profundidad no debe convertir el juego en una interfaz imposible de comprender. Diseña paneles para economía, población, producción, necesidades, leyes, facciones, investigación, religión, diplomacia, espionaje, ejército, comercio, territorio y acontecimientos. El jugador debe poder entender por qué ocurre cada problema. Cuando una ciudad sufra escasez de alimentos, debe ser posible identificar las causas, las rutas de suministro, los almacenes afectados, la población perjudicada y las medidas disponibles. Cuando una facción se radicalice, debe ser posible consultar sus agravios y los acontecimientos que la llevaron a esa situación. Cuando un enemigo declare la guerra, la interfaz debe mostrar información disponible sobre sus posibles motivos, objetivos y capacidades, sin revelar mágicamente sus secretos. Incluye mapas y filtros para visualizar territorios, recursos, producción, densidad de población, rutas, riesgos, influencia política y otros datos estratégicos. Prioriza una interfaz intuitiva, informativa y coherente con la estética del mundo antiguo.

### 21. Arquitectura técnica y rendimiento

No asumas que todos los sistemas pueden simular cada habitante individualmente en todo momento. Diseña una arquitectura capaz de manejar una población creciente, varias ciudades, economías interdependientes, ejércitos, navegación, diplomacia e inteligencia artificial.

Antes de recomendar un motor, compara las opciones adecuadas para un juego de estrategia 3D con muchas entidades y simulación económica, explicando sus ventajas, limitaciones, herramientas de desarrollo y consecuencias para el proyecto. Evalúa motores como Godot y Unity, así como Unreal Engine si resulta adecuado. No elijas únicamente por popularidad.

Define una arquitectura que separe, cuando corresponda:

- Simulación económica.
- Simulación de población.
- Construcción y urbanismo.
- Territorio y navegación.
- Diplomacia e inteligencia artificial.
- Combate.
- Tecnología y progresión.
- Eventos y catástrofes.
- Interfaz y presentación visual.
- Persistencia y guardado de partidas.

La simulación debe tener reglas reproducibles y una estructura que permita detectar errores. Los subsistemas deben comunicarse mediante contratos claros. Investiga estrategias como simulación por niveles de detalle, actualización por frecuencias, sistemas orientados a datos, planificación por eventos y agregación de entidades cuando sean apropiadas. Las animaciones y los gráficos no deben decidir los resultados económicos. El sistema lógico debe permanecer coherente aunque se desactiven temporalmente detalles visuales. Define objetivos de rendimiento medibles para el prototipo y establece cómo probarlos con poblaciones y mapas de diferentes tamaños.

### 22. Alcance realista: construir el juego por etapas

Comprende que esta visión es ambiciosa. No intentes construir todas las mecánicas al mismo tiempo. Quiero que dividas el desarrollo en fases con objetivos verificables, dependencias y criterios de aceptación.

- **Fase 1: diseño fundamental.** Define los pilares del juego, el ciclo principal, la escala temporal, el sistema de mapa, la primera civilización, las características del jugador, los riesgos principales y los requisitos técnicos. Crea un documento de diseño del juego coherente. Identifica las decisiones que condicionan toda la arquitectura.
- **Fase 2: prototipo jugable mínimo.** Desarrolla un pequeño mundo con terreno, un asentamiento, población visible, edificios, trabajadores, recursos, producción, consumo de alimentos, transporte básico y construcción por etapas. El jugador debe poder comprobar las conexiones entre las decisiones y sus consecuencias. Este prototipo debe ser realmente jugable, no solo un menú, una escena decorativa o una demostración donde los recursos aparecen automáticamente.
- **Fase 3: economía y sociedad.** Incorpora cadenas de producción, almacenamiento, necesidades, clases sociales, impuestos, satisfacción, problemas de abastecimiento y primeras formas de conflicto interno. Prueba que las crisis puedan surgir a partir de las reglas del sistema.
- **Fase 4: gobierno y política.** Añade leyes, instituciones, facciones, legitimidad, protestas y rebeliones. Comprueba que las decisiones políticas interactúen de verdad con la economía y las necesidades sociales.
- **Fase 5: diplomacia y civilizaciones rivales.** Introduce varias ciudades autónomas controladas por la IA, relaciones diplomáticas, memoria de acciones, comercio, conflictos por recursos, espionaje y objetivos estratégicos.
- **Fase 6: guerra, ejército y navegación.** Introduce unidades militares, reclutamiento, suministros, combate, fortificaciones, asedios, puertos, embarcaciones y rutas comerciales.
- **Fase 7: progresión y acontecimientos.** Añade árboles tecnológicos y culturales, instituciones, religiones, desastres naturales, eventos históricos y el sistema mitológico opcional.
- **Fase 8: dificultad, equilibrio y expansión.** Equilibra la economía, la progresión, las crisis, la IA, las civilizaciones y las condiciones de victoria. Optimiza el rendimiento, desarrolla herramientas de diagnóstico y comprueba que las partidas largas sigan siendo estables.

Las fases pueden reajustarse si las pruebas demuestran que hay una secuencia técnicamente mejor, pero toda modificación debe justificarse.

### 23. Reglas para la IA que desarrolle el proyecto

Trabaja como un desarrollador responsable que debe entregar software funcional, no como un generador de conceptos. Cumple estas reglas:

1. No afirmes que una mecánica está implementada hasta que exista código funcional y se haya probado.
2. No generes todo el juego de una sola vez. Prioriza sistemas fundamentales y construye sobre ellos.
3. No reestructures innecesariamente el proyecto, no elimines código funcional sin justificación y mantén una arquitectura comprensible.
4. Antes de modificar un proyecto existente, inspecciona su estructura, sus dependencias, sus convenciones y su estado actual.
5. Cuando escribas código, utiliza implementaciones completas y coherentes con el motor seleccionado. Evita pseudocódigo presentado como software terminado.
6. Divide el código en componentes y módulos con responsabilidades definidas. Evita crear un único archivo gigantesco que contenga todo el juego.
7. Después de cada hito, ejecuta las pruebas disponibles y comprueba que las funcionalidades anteriores continúan funcionando.
8. Crea pruebas automáticas para los sistemas económicos y sociales cuando sea posible, incluyendo casos extremos, falta de recursos, bloqueos logísticos y simulaciones prolongadas.
9. Documenta los supuestos, las limitaciones y las decisiones de arquitectura que condicionan el resto del desarrollo.
10. No añadas mecánicas por el simple hecho de que parezcan interesantes. Cada sistema debe aportar valor, integrarse con los demás y justificar su coste de implementación.
11. No presentes datos históricos inventados como hechos. Diferencia las fuentes históricas, las interpretaciones y las decisiones ficticias de diseño.
12. Si trabajas con una herramienta que permite crear archivos y ejecutar proyectos, úsala para construir y verificar entregas reales. Si no dispones de esa capacidad, proporciona los archivos completos y explica cómo ejecutarlos y comprobarlos.
13. No intentes impresionar mediante la cantidad de sistemas anunciados. Prioriza profundidad, coherencia, rendimiento y calidad real.
14. Cada funcionalidad añadida debe contar con una definición de comportamiento esperado, dependencias y criterios de aceptación.

### 24. Cómo debes comenzar

No comiences escribiendo miles de líneas de código ni diseñando veinte civilizaciones. Primero, transforma toda esta visión en un diseño que permita identificar los riesgos y validar si el juego principal es divertido. Entrega los siguientes resultados, en este orden:

- **Entregable A. Visión del juego.** Resume qué hace único a IMPERIUM, qué experiencia promete y cuáles son sus cinco pilares fundamentales.
- **Entregable B. Documento de diseño del juego (GDD).** Define el ciclo principal de juego, la escala histórica, el tiempo, la población, la economía, la política, la guerra, la diplomacia, la progresión, los desastres y la mitología. Explica cómo se conectan los sistemas.
- **Entregable C. Modelo de simulación.** Presenta diagramas o esquemas que expliquen cómo los recursos, las personas, los edificios, las facciones, los estados políticos y las civilizaciones se afectan mutuamente. Describe los principales cálculos, estados, reglas, dependencias y condiciones que provocan cambios.
- **Entregable D. Diseño de una primera civilización.** Elige una civilización inicial apropiada para construir y probar los sistemas básicos. Explica por qué la eliges, sus características históricas pertinentes, su economía inicial, su entorno y sus ventajas y dificultades jugables. No intentes implementar todo el catálogo histórico en esta fase.
- **Entregable E. Prototipo mínimo viable.** Define exactamente qué podrá hacer el jugador, qué sistemas estarán realmente implementados, qué elementos quedarán fuera y qué demostrará que el prototipo funciona.
- **Entregable F. Arquitectura técnica.** Compara los motores adecuados y recomienda uno justificadamente. Presenta la estructura inicial del proyecto, los principales módulos, sus relaciones y el enfoque de rendimiento.
- **Entregable G. Hoja de ruta.** Organiza el desarrollo en hitos ordenados por dependencias y riesgo. Para cada hito, establece funcionalidades, pruebas y criterios objetivos de finalización.
- **Entregable H. Primer paso ejecutable.** Después de completar el diseño inicial, comienza con el prototipo mínimo viable. Explica los archivos que deben crearse o modificarse, proporciona el código necesario y verifica los resultados con las herramientas disponibles antes de afirmar que funciona.

### 25. Principios innegociables del proyecto

Todo sistema importante debe responder a cuatro preguntas:

1. ¿Qué lo provoca?
2. ¿Cómo funciona?
3. ¿Qué consecuencias produce en otros sistemas?
4. ¿Cómo puede el jugador comprenderlo y responder?

Una cosecha perdida no debe limitarse a reducir un indicador. Puede causar inflación alimentaria, hambre, enfermedades, migraciones, malestar político, menores ingresos fiscales y conflictos con regiones vecinas. Una guerra no debe limitarse a mover unidades y reducir puntos de vida. Debe implicar suministros, decisiones diplomáticas, costes económicos, riesgos militares y efectos sociales. Una religión no debe limitarse a producir puntos de fe. Debe tener relación con las instituciones, las tradiciones, la cohesión, la legitimidad y las relaciones entre sociedades. Una tecnología no debe limitarse a aumentar estadísticas. Debe abrir nuevas opciones económicas, sociales, arquitectónicas o militares. Una ciudad no debe ser solo un conjunto de edificios. Debe ser una sociedad que necesita recursos, desarrolla intereses, reacciona a las políticas y puede prosperar, resistir o colapsar.

El objetivo final es construir un simulador de civilizaciones vivas donde el jugador no controle cada acontecimiento del mundo, sino que intente gobernarlo, comprenderlo y sobrevivir a las consecuencias de sus propias decisiones. La experiencia debe recompensar tanto la planificación estratégica como la capacidad de adaptarse a crisis inesperadas.

Empieza con el Entregable A, el Entregable B y el Entregable C. Sé crítico con la ambición del proyecto, identifica las principales dificultades técnicas y propone soluciones concretas antes de avanzar a la implementación.

---

## PARTE II · ANEXO CREATIVO — El alma, la visión y la identidad de IMPERIUM

### 1. La idea central: no gobiernas una ciudad, gobiernas una civilización viva

Quiero que comprendas la esencia más profunda de este proyecto antes de tomar cualquier decisión de diseño o desarrollo.

IMPERIUM es un videojuego de estrategia, construcción, simulación social, gestión económica, política y desarrollo de civilizaciones antiguas. Su principal característica no es la cantidad de edificios, tecnologías, recursos o unidades que contiene, sino la manera en que todos estos elementos se relacionan para crear un mundo que parece tener vida propia.

Quiero que el jugador pueda observar el nacimiento, el crecimiento, la prosperidad, la transformación y, eventualmente, la decadencia de una civilización que ha contribuido a construir.

Al principio, el jugador dispone de poco más que un grupo de personas, un territorio, unos recursos naturales y la necesidad de sobrevivir. Con el paso del tiempo, ese asentamiento puede convertirse en una aldea agrícola, una ciudad comercial, una capital religiosa, una potencia militar o un imperio que domina regiones enteras.

Sin embargo, cada etapa de crecimiento debe introducir nuevos problemas.

Cuantas más personas habiten la ciudad, más difícil será abastecerlas. Cuantas más riquezas acumule el Estado, mayores serán las ambiciones de quienes desean controlarlas. Cuanto más territorio conquiste el jugador, más difícil será administrarlo. Cuanto más poderoso sea el ejército, mayor será el coste de mantenerlo. Cuanto más centralizado esté el gobierno, mayor podrá ser su capacidad de actuar, pero también su vulnerabilidad ante una crisis política o sucesoria.

La civilización debe convertirse en un organismo complejo: una estructura formada por millones de pequeñas decisiones, necesidades, intereses y relaciones que producen resultados que ningún gobernante puede controlar completamente.

Quiero que el jugador pueda contemplar su ciudad y pensar: «Yo decidí construir este lugar, desarrollar esta economía y aprobar estas leyes. Ahora tengo que afrontar las consecuencias de todo aquello que he creado».

Este es el corazón de IMPERIUM.

### 2. La fantasía que debe experimentar el jugador

La experiencia debe combinar varias fantasías que normalmente aparecen separadas en diferentes géneros.

- **La fantasía del constructor:** poder transformar un paisaje en una ciudad monumental, observar cómo se levantan los edificios, cómo aparecen nuevos barrios y cómo las calles se llenan de actividad.
- **La fantasía del gobernante:** tomar decisiones que afectan a miles de personas, establecer leyes, recaudar impuestos, negociar con los poderosos, resolver conflictos sociales y decidir el rumbo de la sociedad.
- **La fantasía del estratega:** desarrollar tecnologías, planificar expansiones, controlar rutas comerciales, preparar ejércitos, defender fronteras y anticiparse a los movimientos de otras civilizaciones.
- **La fantasía del superviviente:** afrontar crisis en las que no existen recursos suficientes para satisfacer todas las necesidades y es necesario decidir qué sacrificar para salvar el conjunto.
- **La fantasía del fundador de una civilización:** comenzar con muy poco y construir algo que perdure durante generaciones, desarrollando instituciones, tradiciones, conocimientos y una identidad cultural propia.
- **La fantasía del historiador de su propio mundo:** observar cómo las decisiones del jugador y los acontecimientos imprevistos producen una historia particular, diferente en cada partida.

No quiero que estas experiencias estén divididas en modos aislados. Deben coexistir dentro de una misma partida y afectarse mutuamente.

El jugador puede pasar de contemplar tranquilamente la construcción de un templo a descubrir que la obra está consumiendo las reservas de alimentos, que la población comienza a protestar y que una facción política utiliza la crisis para debilitar al gobernante.

Puede pasar de organizar una expedición comercial a descubrir nuevas tierras, reclamar recursos y provocar tensiones diplomáticas con una civilización rival.

Puede ganar una guerra y descubrir que su victoria ha destruido las cosechas, agotado el tesoro y dejado al ejército en una posición peligrosa.

El objetivo es que las grandes historias surjan de la simulación, no únicamente de acontecimientos escritos de antemano.

### 3. El mundo debe estar vivo incluso cuando el jugador no interviene

Una de las diferencias más importantes entre un constructor de ciudades tradicional y lo que quiero crear es la autonomía del mundo.

La ciudad del jugador no debe ser el único lugar donde suceden cosas. Las demás ciudades, civilizaciones, poblaciones y territorios deben poseer sus propias dinámicas.

Mientras el jugador está mejorando las carreteras de su capital, otra civilización puede sufrir una mala cosecha. Sus gobernantes podrían aumentar los impuestos para financiar reservas de alimentos. Los comerciantes perjudicados podrían presionar al gobierno. Una facción militar podría oponerse a la reducción del presupuesto del ejército. Al mismo tiempo, una ciudad vecina podría ofrecer ayuda alimentaria a cambio de privilegios comerciales.

Esta cadena de acontecimientos debería poder surgir sin intervención directa del jugador.

También quiero que los mundos tengan cierta independencia respecto a la presencia humana. Los bosques crecen o se degradan, los ríos condicionan las rutas, los animales ocupan determinados ecosistemas, las estaciones modifican la producción y las catástrofes alteran temporalmente regiones enteras.

El mundo no tiene que estar lleno de acontecimientos extraordinarios constantemente. Su vitalidad debe proceder, principalmente, de las actividades cotidianas de sus habitantes y de la interacción continua de sus sistemas.

Las personas trabajan, comen, transportan productos, comercian, envejecen, forman familias si el modelo demográfico lo contempla, cambian de ocupación, migran y responden a las condiciones de su entorno.

Los gobiernos toman decisiones, las economías cambian, los conflictos aparecen y las alianzas evolucionan.

Quiero que el jugador pueda observar durante varios minutos una ciudad sin dar órdenes y seguir viendo actividad significativa.

Esa observación debe ser entretenida por sí misma, pero también útil: debe permitir detectar problemas, comprender el funcionamiento de los barrios y descubrir consecuencias que no siempre son evidentes en los paneles de gestión.

### 4. La diferencia entre observar una ciudad y entenderla

La simulación visual debe ser hermosa, pero también debe comunicar información.

Si observo a un trabajador llevando madera desde un almacén hasta una obra, esa acción debe representar una actividad económica real o una aproximación visual coherente de ella.

Si observo barcos entrando a un puerto, esos barcos deben estar relacionados con rutas comerciales, transporte, importaciones, exportaciones o actividad militar.

Si veo construir una muralla, su avance debe depender de materiales, trabajadores, tiempo y condiciones de trabajo.

Si una zona comercial está prosperando, la actividad debe reflejar circulación de productos, presencia de trabajadores, consumidores y conexiones de transporte.

Quiero evitar que el mundo sea un decorado animado que no tenga ninguna relación con las reglas internas del juego.

No obstante, la simulación tampoco debe exigir que cada individuo represente un cálculo independiente para cada operación a escala imperial. Es aceptable utilizar representaciones agregadas, trabajadores colectivos y niveles de detalle diferentes según la importancia de cada zona.

La prioridad es que lo que el jugador observa resulte coherente con lo que sucede realmente en el sistema.

La simulación debe permitir responder a preguntas como:

- ¿De dónde vienen los alimentos que consume este barrio?
- ¿Por qué se ha detenido la construcción de este edificio?
- ¿Qué rutas utiliza una fábrica para obtener sus materiales?
- ¿Por qué esta zona de la ciudad está creciendo más que otras?
- ¿Qué sucedería si cerrara este puerto?
- ¿Qué productos faltarían si una mina dejara de funcionar?
- ¿Por qué los ciudadanos de este distrito están descontentos?
- ¿Qué consecuencia tendría aumentar los impuestos a esta actividad?
- ¿Qué parte del territorio es realmente capaz de abastecer al ejército?

El jugador debe poder pasar de la observación visual al análisis de los sistemas sin perderse en interfaces innecesariamente complicadas.

### 5. El tiempo real debe transformar la forma de tomar decisiones

IMPERIUM debe desarrollarse en tiempo real, con pausa y control de velocidad.

Esta decisión no es solo una preferencia de presentación. Cambia la naturaleza de la estrategia.

El jugador debe poder detener el tiempo para estudiar una crisis, examinar las rutas comerciales, reorganizar sus tropas, comparar políticas o planificar una ampliación urbana.

Después puede reanudar la simulación y observar cómo sus decisiones se convierten en acontecimientos.

Quiero que exista una diferencia entre planificar correctamente y actuar a tiempo.

Una ciudad puede tener suficientes alimentos en sus almacenes y, aun así, sufrir hambre si los productos no llegan a los barrios que los necesitan. Una reserva de soldados puede existir sobre el papel, pero estar demasiado lejos de la frontera para detener una invasión. Una tecnología puede estar disponible, pero tardar tiempo en convertirse en una industria productiva.

El tiempo de viaje, la producción, las obras, las comunicaciones, la movilización militar y la propagación de las crisis deben importar.

La pausa debe proporcionar una herramienta de análisis, no eliminar la importancia de comprender los sistemas. El jugador tiene que ser capaz de tomar decisiones deliberadas sin verse obligado a ejecutar cientos de acciones bajo presión artificial.

La tensión debe proceder de las consecuencias y de la evolución del mundo, no de una interfaz que impida leer la información.

### 6. La ciudad debe construirse como consecuencia de las necesidades

Quiero libertad de construcción, pero no una ciudad en la que cualquier estructura funcione mágicamente en cualquier lugar.

El jugador debe elegir dónde fundar asentamientos, cómo organizar los barrios, dónde situar las industrias, qué rutas abrir y qué infraestructuras priorizar.

Sin embargo, las decisiones urbanísticas deben tener consecuencias.

Una ciudad junto a un río navegable puede disponer de ventajas de transporte y abastecimiento, pero sufrir inundaciones. Un asentamiento próximo a recursos minerales puede desarrollar una industria metalúrgica, pero necesitar alimentos y productos que no puede producir localmente. Una capital protegida por montañas puede resultar difícil de conquistar, pero tener problemas para conectar con otras regiones.

La ubicación de los edificios debe influir en los costes y la eficiencia según las reglas correspondientes.

Los talleres necesitan materiales y trabajadores. Los edificios públicos requieren financiación y mantenimiento. Los mercados necesitan conectividad y actividad económica. Los puertos necesitan condiciones geográficas adecuadas. Las murallas, canales y carreteras deben competir por recursos con otras prioridades.

La construcción debe tener etapas visibles: preparación del terreno, transporte de materiales, trabajo, progreso y finalización.

También quiero que las ciudades cambien con el tiempo. Un barrio inicialmente periférico puede convertirse en un centro comercial. Una antigua zona industrial puede necesitar modernización. Un asentamiento puede crecer alrededor de un templo, un puerto, una mina o una fortaleza.

El desarrollo urbano debe reflejar la evolución de la sociedad y no limitarse a ampliar una cuadrícula de edificios.

### 7. La economía es el sistema circulatorio de la civilización

La economía no debe ser una fuente abstracta de dinero que el jugador acumula para comprar mejoras.

Debe representar la circulación de materias primas, bienes elaborados, trabajo, servicios, transporte, riqueza e impuestos.

La ciudad debe producir cosas que alguien necesite, mediante trabajadores que consuman recursos y dependan de otros sectores económicos.

Quiero que el jugador pueda descubrir especializaciones económicas diferentes.

Una región puede convertirse en el granero del imperio. Otra puede desarrollar minas y metalurgia. Una ciudad costera puede vivir del comercio marítimo y la construcción naval. Una capital puede especializarse en administración, cultura, educación y servicios. Una región fronteriza puede desarrollar infraestructuras defensivas y producción militar.

Estas especializaciones deben proporcionar oportunidades, pero también dependencias.

Un territorio especializado en producir un único bien puede prosperar mientras exista demanda, pero resultar vulnerable si se bloquea su ruta comercial o cae el precio de sus productos.

Una capital muy poblada puede acumular riqueza, pero depender peligrosamente de la importación de alimentos.

Un ejército poderoso puede necesitar tanto dinero y materiales que debilite otras áreas del Estado.

Quiero que las crisis económicas se propaguen de manera comprensible entre diferentes sectores.

La ausencia de un recurso no debe producir únicamente una notificación de error. Puede detener una cadena productiva, reducir los ingresos, aumentar los precios, generar despidos, debilitar el abastecimiento y provocar descontento.

Del mismo modo, una nueva ruta comercial puede proporcionar acceso a materiales que permitan desarrollar nuevas industrias y transformar el equilibrio político.

La economía debe ser un sistema de interdependencias. Ninguna ciudad prospera de forma completamente aislada cuando alcanza una escala suficiente.

### 8. No existe la ciudad perfecta: existe la ciudad que mejor se adapta a sus circunstancias

Quiero que los distintos estilos de desarrollo tengan ventajas y desventajas reales.

Una ciudad puede priorizar la prosperidad comercial y mantener una población relativamente satisfecha, pero depender mucho de las rutas de intercambio.

Otra puede invertir en el ejército y fortificar sus fronteras, sacrificando parte de sus recursos económicos.

Otra puede concentrarse en la religión, el conocimiento o la cultura, obteniendo influencia y legitimidad, aunque deba afrontar gastos importantes para mantener sus instituciones.

Otra puede desarrollar una administración muy centralizada que le permita movilizar recursos rápidamente, pero que aumente su dependencia de una estructura burocrática compleja.

Otra puede distribuir mayor autonomía entre sus ciudades y provincias, reduciendo ciertos costes administrativos a cambio de tener menos control directo.

Estas formas de desarrollo no deben convertirse en categorías rígidas. Una civilización puede cambiar de orientación cuando su situación lo requiera.

La profundidad del juego debe proceder de los compromisos que implican las decisiones.

El jugador no debería preguntarse exclusivamente qué opción genera más recursos. También debería plantearse qué tipo de sociedad está construyendo, qué dependencias está creando y qué riesgos tendrá que afrontar en el futuro.

### 9. La población no es una barra de felicidad

Esta es una de las características más importantes del proyecto.

Quiero que la población tenga necesidades, intereses, diferencias, memoria y capacidad de responder a las decisiones del gobernante.

La felicidad general debe existir como indicador útil, pero no sustituir el funcionamiento de la sociedad.

Una persona puede estar satisfecha con su nivel de vida, pero descontenta con una política religiosa. Un comerciante puede prosperar y, al mismo tiempo, oponerse a unos aranceles que dificultan sus negocios. Un soldado puede apoyar al gobernante durante una guerra y perder su lealtad cuando no recibe su salario. Un campesino puede tolerar impuestos durante una buena cosecha y sufrir una crisis cuando llegan años de escasez.

Quiero que existan distintas capas de satisfacción, bienestar, confianza, lealtad, cohesión social y estabilidad política.

Los habitantes deben responder a su experiencia cotidiana y a sus circunstancias, no a un porcentaje global que cambia sin explicación.

La sociedad también debe tener cierta inercia. Una reforma no transforma inmediatamente las creencias de todos los habitantes. Una crisis prolongada puede dejar secuelas. La recuperación de una ciudad después de una guerra requiere tiempo.

Debe ser posible que grupos diferentes interpreten un mismo acontecimiento de formas distintas.

Una victoria militar puede aumentar el orgullo de una parte de la población, enriquecer a determinados comerciantes, provocar miedo entre los habitantes de una región fronteriza y generar oposición entre quienes soportan los costes de la guerra.

No necesito que cada habitante tenga una biografía extremadamente compleja. Lo importante es que el modelo social produzca consecuencias creíbles a escala individual y colectiva.

### 10. Las decisiones del jugador deben poder cambiar el destino de la sociedad

Quiero decisiones que generen conflictos reales entre objetivos legítimos.

No quiero un sistema en el que cada problema tenga una opción correcta claramente señalada.

Imagina una mala cosecha que reduce las reservas de alimentos. El ejército necesita provisiones porque una potencia rival moviliza tropas cerca de la frontera. La capital necesita comida para evitar una crisis social. Una región agrícola exige reducir sus impuestos para poder recuperarse. El tesoro estatal tiene recursos limitados.

El jugador tiene varias posibilidades.

Puede requisar alimentos para mantener al ejército, arriesgándose a provocar hambre y protestas. Puede reducir las operaciones militares, debilitando su posición estratégica. Puede importar alimentos, si existen rutas accesibles y recursos económicos suficientes. Puede distribuir las reservas de manera desigual, favoreciendo algunas regiones a costa de otras. Puede negociar una tregua o arriesgarse a continuar la guerra.

Ninguna solución debe ser universalmente correcta.

El resultado dependerá de las reservas, la logística, la duración de la crisis, los intereses políticos, las capacidades diplomáticas y las decisiones anteriores.

Quiero situaciones en las que el jugador pueda salvar su civilización, pero tener que aceptar un coste importante.

También quiero que algunas decisiones no tengan un resultado evidente de inmediato. Las reformas institucionales, la expansión territorial, la concentración de poder y los cambios económicos pueden generar beneficios a largo plazo y riesgos que solo aparecerán cuando cambien las circunstancias.

El juego debe recompensar comprender el mundo, no memorizar una estrategia óptima.

### 11. La política debe ser una lucha por los recursos, el poder y el futuro

El gobernante no debe ser el único actor político de la civilización.

Dentro del Estado existen grupos que compiten por recursos, privilegios, seguridad, reconocimiento y capacidad de decisión.

Los comerciantes desean condiciones favorables para el intercambio. Los terratenientes pueden defender determinados derechos sobre la tierra. Los sacerdotes pueden intentar conservar su influencia religiosa. Los generales pueden exigir recursos para el ejército. Los habitantes de una provincia pueden reclamar autonomía. Los funcionarios pueden defender la administración de la que depende su posición.

Estos intereses no tienen que expresarse siempre mediante conflictos violentos. Pueden negociarse, organizarse, intercambiar apoyos o competir por influir en las decisiones.

Quiero que las leyes modifiquen el equilibrio de poder.

Una reforma puede fortalecer al gobierno central y debilitar a las élites regionales. Otra puede mejorar las condiciones de determinados trabajadores y aumentar la oposición de sus empleadores. Una nueva política religiosa puede reforzar la legitimidad del gobernante entre algunos grupos y reducirla entre otros.

Los grupos perjudicados deben tener formas razonables de reaccionar según su poder, sus recursos y sus oportunidades.

Pueden retirar apoyo, promover protestas, financiar conspiraciones, bloquear reformas, amenazar con rebelarse o buscar aliados extranjeros.

La reacción de una facción debe depender de la magnitud de sus intereses afectados, la historia de su relación con el gobernante, su capacidad de organización y la situación general del Estado.

Quiero que el jugador pueda gobernar mediante negociación, concesiones, reformas, coerción, propaganda o combinaciones de estas herramientas, con limitaciones y consecuencias.

Una sociedad completamente satisfecha con el gobernante debería ser difícil de conseguir y, en ciertas circunstancias, imposible de mantener.

### 12. La caída de un imperio debe poder comprenderse

Una de las mayores oportunidades creativas de este juego es convertir la decadencia de una civilización en una historia que el propio jugador pueda analizar.

Quiero que los imperios puedan debilitarse por motivos económicos, militares, políticos, ambientales, administrativos y sociales.

Una expansión demasiado rápida puede producir un territorio difícil de administrar. La necesidad de mantener grandes ejércitos puede aumentar la presión fiscal. Los impuestos pueden perjudicar a determinados sectores. Las provincias lejanas pueden perder confianza en el gobierno central. Las élites locales pueden adquirir poder. Una derrota militar puede debilitar la legitimidad del emperador. Una crisis sucesoria puede convertir tensiones acumuladas en una guerra civil.

No quiero que el colapso sea un acontecimiento arbitrario que aparece porque el juego considera que ha llegado la hora de castigar al jugador.

Debe existir una cadena de causas que el jugador pueda investigar, aunque no siempre haya podido prever todas sus consecuencias.

Asimismo, el colapso no tiene que representar únicamente la destrucción completa del asentamiento.

Una civilización puede perder territorios, fragmentarse en varios Estados, cambiar de gobierno, convertirse en vasalla, abandonar una región o sufrir una transformación cultural.

También debe ser posible recuperarse.

Un gobernante que identifique los problemas a tiempo puede reformar las instituciones, reorganizar la economía, abandonar territorios demasiado costosos o aceptar la paz con un antiguo enemigo.

Las consecuencias deben ser importantes, pero no toda dificultad tiene que desembocar en una derrota inevitable.

Quiero que el jugador pueda estudiar retrospectivamente su partida y comprender cómo llegó a una situación determinada.

### 13. Las civilizaciones rivales deben parecer sociedades, no jugadores automáticos

Cada civilización debe disponer de intereses y prioridades propios, y tener la capacidad de cambiar de estrategia cuando cambien las circunstancias.

Una potencia comercial puede preferir la paz porque obtiene beneficios del intercambio, pero apoyar una guerra si otra civilización amenaza sus rutas marítimas.

Una sociedad con escasos recursos agrícolas puede intentar controlar valles fértiles o asegurar importaciones de alimentos.

Una civilización militarmente poderosa puede utilizar la intimidación para obtener concesiones, aunque una guerra prolongada también pueda debilitarla.

Una ciudad con instituciones políticas inestables puede comportarse de manera más imprevisible durante una sucesión.

Estas tendencias deben ser puntos de partida, no estereotipos permanentes.

La IA debe considerar los costes de sus decisiones, las capacidades de su propia sociedad y la información disponible.

Quiero que las demás civilizaciones puedan sufrir malas decisiones, guerras civiles, crisis de abastecimiento, pérdida de prestigio, fragmentación territorial y recuperación económica.

También quiero que recuerden acontecimientos importantes.

Un aliado que incumple tratados puede perder credibilidad. Una potencia que ayuda a una ciudad durante una catástrofe puede conseguir una relación más favorable. Una civilización que es constantemente amenazada puede buscar protección en una alianza defensiva.

Las relaciones internacionales deben surgir de los intereses, las oportunidades y la memoria del mundo, no de una simple puntuación de amistad.

### 14. La guerra debe ser una extensión de la economía y la política

El ejército debe representar el poder material y organizativo de una civilización.

No quiero que las unidades sean fichas que se desplazan sin relación con la sociedad que las sostiene.

Los soldados necesitan reclutamiento, entrenamiento, armas, equipamiento, suministros, transporte, mandos y financiación.

El reclutamiento puede reducir la mano de obra disponible. Las guerras prolongadas pueden perjudicar la agricultura y el comercio. Las fortificaciones requieren mantenimiento. Las campañas lejanas pueden resultar difíciles por falta de rutas de suministro.

La geografía tiene que influir en la guerra. Los ríos, montañas, desiertos, costas, bosques y pasos estratégicos pueden favorecer o dificultar el movimiento.

La diplomacia debe seguir siendo relevante durante los conflictos.

El jugador puede buscar aliados, negociar una tregua, aislar económicamente a un enemigo, proteger rutas comerciales o intentar resolver una disputa territorial sin recurrir a las armas.

Quiero que la conquista sea atractiva cuando tenga sentido, pero que nunca parezca una forma gratuita de conseguir territorios.

Ganar una guerra puede enriquecer a determinados grupos y proporcionar recursos estratégicos, pero también producir destrucción, desplazamientos, resistencia, gastos de ocupación y dificultades administrativas.

Una civilización puede ganar casi todas sus batallas y aun así fracasar porque su economía no soporta los costes de la expansión.

### 15. El mapa debe crear historias y conflictos

El mapa es uno de los principales generadores de situaciones estratégicas.

Quiero regiones con diferencias geográficas, climáticas y económicas que proporcionen ventajas e impongan limitaciones.

Los ríos pueden facilitar el transporte y la agricultura. Las costas pueden conectar mercados distantes. Las montañas pueden proteger territorios, pero dificultar las comunicaciones. Los valles fértiles pueden sostener grandes poblaciones. Los desiertos pueden crear rutas especializadas que dependan de conocimientos y suministros concretos.

Los recursos valiosos deben estar distribuidos de manera desigual.

Una región puede disponer de minerales esenciales para la metalurgia, mientras otra tiene tierras fértiles y una tercera controla una ruta marítima importante.

Esta distribución debe generar incentivos para comerciar, negociar, expandirse o entrar en conflicto.

Quiero que las fronteras tengan significado económico y político. Una ciudad puede reclamar tierras que considera históricamente suyas, competir por un paso comercial o temer que una potencia rival controle una fuente de agua.

La disponibilidad y el valor de los recursos pueden cambiar con el desarrollo tecnológico, el deterioro ambiental, la demanda y las circunstancias internacionales.

El mapa no debe ser únicamente el espacio sobre el que se colocan edificios. Debe ser una fuente continua de oportunidades, dependencias y conflictos.

### 16. La historia debe emerger de las mecánicas

IMPERIUM no necesita una campaña narrativa completamente predeterminada para contar historias memorables.

Quiero que cada partida genere acontecimientos cuya secuencia dependa de la simulación.

Una ciudad comercial puede crecer gracias al intercambio con sus vecinos, volverse rica y atraer trabajadores de otras regiones. Su prosperidad puede fortalecer a los comerciantes y debilitar a las élites tradicionales. El gobierno puede intentar regular los mercados. Parte de la población puede apoyar la reforma, mientras otros grupos organizan resistencia.

En otra partida, la misma ciudad puede depender de una ruta marítima que acaba siendo bloqueada por una guerra. La falta de importaciones encarece los alimentos. Los ingresos disminuyen y el gobernante debe negociar con una potencia que anteriormente consideraba enemiga.

En una tercera partida, una sucesión política conflictiva puede provocar que varias facciones compitan por controlar el puerto, convirtiendo la ciudad en el centro de una guerra civil.

La ciudad es la misma en términos geográficos, pero la historia es diferente.

Quiero un sistema de acontecimientos que pueda producir relatos interesantes a partir de estados, relaciones y decisiones reales.

Los eventos escritos a mano siguen siendo útiles para introducir contextos históricos, decisiones morales, acontecimientos excepcionales y contenido cultural. Sin embargo, deben complementar la simulación, no sustituirla.

El jugador debe poder sorprenderse por su propia partida.

### 17. La mitología debe ampliar el mundo, no convertirlo en un juego de fantasía genérico

Las mitologías antiguas pueden aportar una dimensión creativa muy poderosa.

Cada civilización debe tener tradiciones religiosas, relatos fundacionales, símbolos, criaturas, lugares sagrados y concepciones del mundo propias.

En el modo histórico, estas tradiciones pueden influir en la arquitectura, la política, la legitimidad, las ceremonias, los monumentos y las relaciones entre pueblos sin que sea necesario confirmar la existencia física de criaturas sobrenaturales.

En el modo mitológico, determinadas criaturas pueden existir realmente en el universo del juego.

Sin embargo, quiero que su presencia sea excepcional, relevante y coherente con las reglas del mundo.

Una criatura legendaria puede convertirse en una amenaza para una ruta, un asentamiento o una expedición. Su aparición puede provocar miedo, disputas religiosas, oportunidades políticas o decisiones sobre cómo proteger a la población.

También puede existir la posibilidad de investigar relatos, organizar expediciones, consultar tradiciones locales o descubrir que diferentes culturas interpretan un mismo fenómeno de maneras distintas.

No quiero que cada civilización posea simplemente un monstruo que funciona como una unidad militar adicional. La mitología debe expresar la identidad cultural y contribuir a crear acontecimientos únicos.

Las criaturas deben ser equilibradas y su aparición debe estar relacionada con condiciones, señales o consecuencias identificables.

### 18. Los desastres deben recordar al jugador que no controla la naturaleza

La naturaleza debe representar una fuente constante de oportunidades y riesgos.

La agricultura depende de condiciones climáticas. Las ciudades situadas cerca de los ríos pueden beneficiarse del agua y de las rutas de transporte, pero también exponerse a inundaciones. Las regiones áridas necesitan estrategias específicas para conservar y distribuir el agua.

Las enfermedades, las plagas, las sequías, las malas cosechas y las catástrofes geológicas pueden transformar una región.

No quiero un sistema donde los desastres sean únicamente animaciones espectaculares que destruyen edificios.

Quiero que provoquen problemas sistémicos.

Una inundación puede destruir cultivos, dañar carreteras, interrumpir el comercio y desplazar habitantes. La reducción de alimentos puede aumentar los precios, debilitar las reservas estatales y provocar conflictos distributivos.

El jugador debe poder prepararse: construir canales, reforzar infraestructuras, mantener reservas, diversificar la producción, mejorar la sanidad cuando exista el conocimiento necesario y desarrollar planes de emergencia.

La prevención debe tener un coste y competir con otras necesidades.

Un imperio que invierte constantemente en resiliencia puede perder menos durante una crisis. Otro que destina todos sus recursos al crecimiento inmediato puede prosperar rápidamente, pero quedar mucho más expuesto.

La resiliencia debe ser una decisión estratégica importante.

### 19. La progresión debe hacer que el jugador se sienta cada vez más poderoso y más responsable

Quiero que la evolución de la civilización resulte emocionante.

Al principio, el jugador debe preocuparse por construir refugios, producir alimentos, asegurar agua, desarrollar herramientas y mantener a su pequeño asentamiento.

Más adelante, puede establecer industrias, crear mercados, fundar nuevas ciudades, desarrollar instituciones y construir infraestructuras de transporte.

Conforme avanza la civilización, las nuevas tecnologías deben abrir posibilidades que antes no existían.

El desarrollo de la navegación puede conectar regiones y crear comercio marítimo. Los avances metalúrgicos pueden mejorar las herramientas y el armamento. Los conocimientos de ingeniería pueden permitir proyectos monumentales o defensas más complejas. Las reformas administrativas pueden facilitar la gestión de territorios distantes.

La ciencia, la cultura, la religión y la política deben tener árboles de progresión relacionados, pero no intercambiables.

Las tecnologías deben abrir posibilidades reales y crear nuevas decisiones estratégicas.

La progresión también debe aumentar la complejidad del gobierno.

Una aldea puede gestionarse mediante relaciones directas y unas pocas reglas. Una metrópolis necesita una estructura de servicios, almacenamiento, mercados, administración y transporte. Un imperio requiere delegación, diplomacia, logística, instituciones regionales y mecanismos de control político.

El jugador debe sentir que domina sistemas cada vez más sofisticados, no que el juego simplemente le obliga a pulsar más botones.

La dificultad debe aumentar porque su civilización se vuelve más compleja, porque aparecen adversarios capaces y porque sus decisiones tienen consecuencias a mayor escala.

### 20. La asimetría histórica debe cambiar la forma de jugar

Quiero que las civilizaciones se sientan diferentes desde el momento en que comienza la partida.

La identidad de cada civilización debe proceder de la combinación de su geografía, sus instituciones, su economía, sus tradiciones, sus conocimientos y sus posibilidades militares.

Una sociedad asentada en un valle fértil puede tener ventajas agrícolas, pero depender de infraestructuras hidráulicas y de la gestión de crecidas o sequías.

Una potencia marítima puede obtener riqueza mediante intercambios, exploración y control de rutas, pero ser vulnerable a bloqueos y guerras navales.

Una sociedad con importantes tradiciones administrativas puede gestionar grandes territorios de una manera diferente a otra basada en ciudades relativamente autónomas.

Una civilización con determinadas ventajas militares puede conquistar territorios con eficacia, pero necesitar instituciones y recursos para conservarlos.

No quiero aplicar bonificaciones arbitrarias que no tengan relación con la identidad histórica.

Tampoco quiero que las civilizaciones estén condenadas a representar exactamente el mismo desarrollo que tuvieron en nuestra historia. Una vez que empieza la partida, sus decisiones deben poder llevarlas a resultados alternativos.

La historia proporciona el punto de partida y la inspiración cultural. La simulación determina qué sucede después.

### 21. La libertad debe existir sin que el juego pierda su coherencia

El jugador debe disponer de múltiples estrategias viables.

Puede desarrollar una pequeña sociedad próspera, establecer una red comercial, construir un imperio militar, especializarse en tecnología, promover una gran tradición cultural, expandir una religión o combinar diferentes caminos.

No es necesario que todas las civilizaciones tengan acceso a todas las instituciones o tecnologías desde el principio. Algunas opciones pueden depender de condiciones históricas, descubrimientos, reformas, recursos o intercambios culturales.

La libertad consiste en poder tomar decisiones significativas dentro de un mundo cuyas reglas sean comprensibles.

No quiero un sistema que prohíba arbitrariamente las estrategias alternativas. Quiero que las dificultades surjan de las circunstancias y los costes reales.

Una civilización pacífica puede sobrevivir rodeada de potencias militares mediante alianzas, comercio, geografía, diplomacia y una defensa adecuada. No obstante, la paz no debe garantizarse si ignora amenazas evidentes.

Una civilización militar puede dominar regiones extensas, pero necesitar mecanismos para administrar y abastecer los territorios conquistados.

Una potencia comercial puede acumular una riqueza extraordinaria, pero no estará automáticamente protegida frente a una crisis política o un bloqueo.

El juego debe permitir estilos diferentes sin convertirlos en soluciones universales.

### 22. La experiencia debe tener ritmo: calma, crecimiento, crisis y recuperación

Quiero que las partidas posean un ritmo emocional.

No todo debe ser una emergencia constante.

Debe haber momentos de tranquilidad en los que el jugador observa una ciudad próspera, amplía barrios, construye monumentos, mejora rutas comerciales y contempla el resultado de sus decisiones.

También deben existir periodos de tensión: una cosecha insuficiente, una facción descontenta, una amenaza en la frontera o una ruta comercial interrumpida.

Algunas crisis serán locales y fáciles de gestionar. Otras podrán coincidir y crear situaciones difíciles.

La recuperación debe resultar tan importante como la crisis.

Después de una guerra, el jugador puede reconstruir ciudades, recuperar la producción, reintegrar territorios y restablecer las relaciones diplomáticas.

Después de una catástrofe, puede reorganizar las infraestructuras, reconstruir reservas y adoptar políticas preventivas.

Después de una rebelión, puede negociar reformas, rediseñar instituciones o restablecer el control mediante decisiones cuyos efectos perduren.

La experiencia ideal alterna expansión y consolidación, ambición y prudencia, riesgo y recuperación.

Quiero que el jugador tenga la sensación de estar dirigiendo una historia extensa, no sobreviviendo a una secuencia artificial de castigos.

### 23. La dificultad debe ser justa, profunda y creciente

El objetivo no es frustrar al jugador, sino ofrecer un desafío que recompense el aprendizaje.

En una dificultad accesible, los indicadores deben ser claros, las consecuencias más tolerantes y la IA menos agresiva cuando no existan motivos importantes para el conflicto.

En las dificultades avanzadas, la IA debe planificar mejor, aprovechar vulnerabilidades, competir por territorios estratégicos y responder con mayor eficacia a las decisiones del jugador.

Los costes logísticos, el equilibrio económico y la gestión de la información pueden adquirir mayor importancia.

Sin embargo, las reglas fundamentales deben mantenerse coherentes.

No quiero que una dificultad elevada consista exclusivamente en multiplicar los costes, reducir artificialmente la producción del jugador o permitir que sus rivales conozcan información que no podrían conocer.

La dificultad debe aumentar por la calidad de los adversarios, la complejidad de las circunstancias y la menor tolerancia a una gestión deficiente.

También quiero que el jugador pueda identificar sus errores.

Si pierde una guerra por falta de suministros, debe poder comprenderlo. Si su economía colapsa porque depende demasiado de las importaciones, debe poder identificar las dependencias. Si una facción se rebela porque sus intereses fueron ignorados durante años, debe poder reconstruir esa historia.

El fracaso debe enseñar algo, aunque no siempre permita recuperarse.

### 24. La identidad visual: una civilización que apetece contemplar

La presentación visual debe transmitir la sensación de observar un mundo histórico en miniatura, lleno de movimiento, actividad y detalles reconocibles.

Quiero ciudades que se distingan por sus materiales, arquitectura, distribución urbana, monumentos, vestimenta, embarcaciones y paisajes.

Las calles deben tener usos reconocibles. Los mercados deben concentrar actividad comercial. Las zonas industriales deben presentar movimientos de mercancías y trabajadores. Los puertos deben mostrar llegadas y salidas de embarcaciones. Los campos deben reflejar los ciclos agrícolas. Los barrios residenciales deben evolucionar cuando cambian la población y la prosperidad.

La arquitectura debe adaptarse a las distintas regiones y etapas históricas.

No todas las ciudades deben convertirse en una colección de edificios perfectamente ordenados. Quiero que la actividad cotidiana, la geografía y las decisiones urbanísticas creen lugares con personalidad.

La interfaz debe proporcionar información sin ocultar la belleza del mundo.

El jugador debería poder acercarse a los detalles para contemplar trabajadores y edificios, alejar la cámara para observar la distribución de la ciudad y utilizar vistas estratégicas para comprender un imperio completo.

No es necesario perseguir realismo gráfico absoluto a costa del rendimiento. La prioridad es una presentación consistente, legible y capaz de representar grandes ciudades de forma eficiente.

La belleza debe proceder tanto del estilo artístico como de la credibilidad de la simulación.

### 25. El sonido debe ayudar a sentir que la ciudad existe

El diseño sonoro debe reforzar la actividad del mundo.

Los barrios comerciales pueden tener conversaciones, vendedores y movimiento de mercancías. Las zonas de construcción pueden presentar herramientas, madera, piedra y actividad de los trabajadores. Los puertos pueden combinar agua, embarcaciones, órdenes de carga y descarga y conversaciones.

Los templos, celebraciones, asambleas, marchas militares y grandes ceremonias deben expresar diferencias culturales.

La música puede evolucionar con las circunstancias: tranquilidad durante el desarrollo urbano, tensión durante una crisis, solemnidad en acontecimientos políticos importantes y dramatismo durante una guerra.

Los acontecimientos relevantes deben comunicarse mediante una combinación de información visual, sonido e interfaz, sin saturar al jugador con alarmas.

Una crisis alimentaria debe percibirse como un problema importante por sus consecuencias y por cómo cambia la ciudad, no únicamente por una notificación roja.

### 26. El contexto histórico debe proporcionar profundidad, no limitar la creatividad

Las civilizaciones antiguas deben inspirarse en sociedades históricas reales, pero el juego no tiene que ser una reconstrucción rígida de cada acontecimiento.

Quiero que las culturas, las instituciones, las tecnologías y las formas de producción estén fundamentadas en referencias históricas sólidas.

Al mismo tiempo, el jugador debe poder crear una historia alternativa.

Una ciudad inspirada en una cultura comercial mediterránea puede convertirse en una gran potencia agrícola si dispone de las condiciones necesarias y toma las decisiones correspondientes.

Una sociedad que históricamente destacó en determinadas capacidades puede seguir una trayectoria diferente cuando se combina con otros recursos, instituciones y oportunidades.

Estas alternativas deben surgir de sistemas coherentes, no de una transformación instantánea que ignore las limitaciones materiales.

El juego también debe distinguir entre historia, interpretación y ficción mitológica.

Los pueblos históricos no deben tratarse como bloques homogéneos ni como civilizaciones que necesariamente compartieron una misma época.

La fidelidad histórica debe dar riqueza al diseño, mientras que la simulación proporciona libertad para construir nuevos futuros.

### 27. La experiencia central debería poder resumirse en una sola partida

Imagina el siguiente ejemplo.

Comienzas en un valle fértil, cerca de un río y de una región boscosa. Dispones de un grupo pequeño de habitantes, herramientas limitadas y reservas alimentarias modestas.

Decides establecer una aldea agrícola y construir viviendas, campos, un almacén y talleres básicos.

Conforme mejora la producción, aumenta la población. Algunos trabajadores se especializan. Aparece un mercado y el asentamiento empieza a intercambiar alimentos y productos elaborados con otras regiones.

Descubres depósitos de mineral en las proximidades. Decides invertir en extracción y metalurgia. La nueva industria genera riqueza y permite producir mejores herramientas y armamento.

Para transportar las mercancías, construyes caminos y amplías el asentamiento hasta convertirlo en una ciudad.

El crecimiento atrae más habitantes, pero también crea problemas. Los mercados comienzan a quedarse pequeños. La expansión industrial requiere madera y combustible. Algunos barrios carecen de servicios suficientes. Los impuestos generan tensiones entre comerciantes y agricultores.

Decides ampliar los mercados, crear nuevos distritos y modificar las políticas fiscales.

Mientras tanto, una ciudad vecina atraviesa una crisis alimentaria. Su gobernante intenta asegurar el control de tierras agrícolas situadas cerca de tu frontera.

Al principio, ambos gobiernos negocian. Establecen un acuerdo comercial que beneficia a las dos partes. Sin embargo, una sequía afecta a toda la región y reduce las cosechas.

El comercio deja de ser suficiente para cubrir las necesidades. Tu vecino exige importar una parte mayor de tus reservas. Tus propios ciudadanos comienzan a sentir el aumento de los precios. Una facción militar sostiene que debes reforzar la frontera, mientras los comerciantes presionan para mantener el acuerdo.

Tienes que decidir.

Puedes ayudar a la ciudad vecina y arriesgarte a crear escasez interna. Puedes limitar las exportaciones, perjudicando tu reputación comercial. Puedes negociar nuevas condiciones, buscar otras fuentes de alimentos o prepararte para un conflicto.

La decisión que tomes cambiará las relaciones diplomáticas y la evolución de ambas sociedades.

Si las negociaciones fracasan, puede comenzar una guerra. Tus ejércitos necesitarán suministros. Los trabajadores reclutados dejarán temporalmente sus puestos. La economía sufrirá las consecuencias y algunos grupos políticos comenzarán a cuestionar el coste del conflicto.

Incluso si ganas, la victoria puede dejarte con un tesoro agotado, regiones dañadas y una población cansada.

Años después, quizá reconstruyas tu economía, consolides una alianza con otra potencia y conviertas tu ciudad en el centro de una red comercial marítima.

Quizá, por el contrario, una crisis política provoque la fragmentación del territorio que conquistaste.

En otra partida, las mismas condiciones iniciales podrían conducir a un resultado completamente diferente.

Esa es la experiencia que quiero conseguir: que la historia de la civilización se convierta en una consecuencia natural de todo lo que sucede dentro del mundo.

### 28. Qué no debe ser IMPERIUM

Para proteger la identidad del proyecto, evita deliberadamente los siguientes errores:

- No debe ser simplemente un juego de colocar edificios y acumular cifras.
- No debe ser un juego por turnos disfrazado de tiempo real.
- No debe simular una población que existe únicamente como decoración visual.
- No debe utilizar una economía en la que los recursos aparecen mágicamente.
- No debe reducir todos los problemas sociales a un único indicador de felicidad.
- No debe convertir cada crisis en un acontecimiento aleatorio sin causas comprensibles.
- No debe hacer que todas las civilizaciones posean la misma estrategia con diferentes aspectos visuales.
- No debe permitir que la IA conozca mágicamente los planes y recursos del jugador.
- No debe convertir la guerra en una actividad sin consecuencias económicas y políticas.
- No debe tratar la mitología como una colección de monstruos sin relación con las culturas.
- No debe aumentar la dificultad haciendo que las reglas sean injustas u ocultando información indispensable.
- No debe intentar implementar todas las mecánicas al mismo tiempo.
- No debe sacrificar una simulación profunda por la cantidad de características anunciadas.
- No debe copiar literalmente sistemas, personajes, contenidos o identidades protegidas de otros videojuegos.

Las referencias a otros juegos deben ayudar a comprender la calidad, la profundidad y el tipo de experiencia buscada, pero IMPERIUM debe desarrollar sus propias reglas, personalidad visual y mecanismos distintivos.

### 29. Los cinco pilares innegociables de IMPERIUM

Todo el diseño debe respetar estos cinco principios.

1. **Un mundo que está vivo.** Las personas trabajan, las ciudades producen, los gobiernos toman decisiones, las civilizaciones compiten y el entorno cambia independientemente de la intervención inmediata del jugador.
2. **Una economía que tiene consecuencias.** Los recursos, las cadenas productivas, la logística, los precios y las necesidades deben estar conectados. Las decisiones económicas pueden provocar efectos sociales, políticos y militares.
3. **Una sociedad con intereses propios.** Los habitantes y los grupos sociales no existen únicamente para obedecer. Sus necesidades, expectativas, lealtades y conflictos condicionan el gobierno y la estabilidad.
4. **Una historia que emerge de las decisiones.** La diplomacia, las guerras, las crisis, las reformas y la evolución del mundo deben producir acontecimientos que tengan causas identificables y resultados variables.
5. **Una civilización que siempre exige algo más.** El crecimiento abre nuevas posibilidades, pero también aumenta la responsabilidad. Ningún sistema es completamente independiente de los demás y ninguna decisión importante carece de consecuencias.

### 30. La meta final

Mi visión definitiva es crear un videojuego en el que el jugador pueda fundar una civilización antigua, observar cómo su población trabaja y construye, desarrollar una economía compleja, establecer instituciones, tomar decisiones políticas difíciles, descubrir tecnologías, desarrollar una cultura, organizar ejércitos, comerciar con otras potencias, explorar los mares, afrontar desastres, enfrentarse a criaturas legendarias en el modo mitológico y competir con sociedades que tengan sus propios planes.

Quiero libertad estratégica, profundidad histórica, simulación económica, historias emergentes y una presentación visual que convierta la observación de una ciudad en una experiencia satisfactoria.

Pero, sobre todo, quiero que cada sistema tenga consecuencias sobre los demás.

Una ciudad no debe prosperar únicamente porque el jugador construye edificios adecuados, sino porque consigue organizar una sociedad capaz de sostenerlos.

Un imperio no debe ser poderoso únicamente porque dispone de muchas unidades militares, sino porque puede financiarlas, abastecerlas, mantener la cohesión de sus territorios y justificar el coste de sus guerras.

Una población no debe estar satisfecha porque el jugador alcanza una cifra determinada, sino porque sus condiciones materiales, sus intereses y sus relaciones con el gobierno producen un nivel de bienestar y estabilidad coherente.

Una civilización no debe fracasar porque se activa un evento de derrota, sino porque las circunstancias, las decisiones y las limitaciones de su sociedad la conducen a una situación de la que quizá no pueda recuperarse.

Y una civilización tampoco debe alcanzar el éxito simplemente acumulando riqueza o conquistando territorios. Debe demostrar que puede sostener su desarrollo, adaptarse a las crisis y encontrar una manera de sobrevivir en un mundo cambiante.

IMPERIUM debe permitir construir algo hermoso, ambicioso y extraordinario, pero también mostrar el esfuerzo, las tensiones y los sacrificios necesarios para mantenerlo.

No quiero que el jugador sea omnipotente. Quiero que sea responsable.

No quiero que el mundo espere sus órdenes. Quiero que responda a ellas.

No quiero que las dificultades existan únicamente para detenerlo. Quiero que surjan de las mismas fuerzas que hacen posible el crecimiento.

Y no quiero que todas las partidas terminen con un imperio perfecto. Quiero que cada partida cuente una historia diferente sobre cómo una sociedad intentó prosperar, qué estuvo dispuesta a sacrificar, qué decisiones tomó y qué legado dejó.

Ese es el alma de IMPERIUM: construir una civilización es solo el comienzo; el verdadero desafío es conseguir que siga viva.

---

## PARTE III · GUÍA DE APLICACIÓN — Recomendaciones prácticas para preservar la visión durante el desarrollo

### Cómo sacarle el máximo partido

Te recomiendo utilizar el prompt con una IA que pueda analizar código y archivos si tu objetivo es desarrollar el videojuego, no solo imaginarlo.

Hay una decisión especialmente importante: no intentar construir el juego completo desde el principio. La primera versión debería demostrar tres cosas: que los habitantes trabajan de verdad, que la economía funciona mediante cadenas de producción y que una crisis económica puede desencadenar problemas sociales de forma natural.

Cuando eso funcione, tendrás una base sobre la que añadir diplomacia, ejércitos, navegación, civilizaciones rivales y mitología sin que todo se convierta en una colección de sistemas desconectados.

Y conservaría una característica como distintivo principal de IMPERIUM: que las civilizaciones rivales tengan sus propios problemas internos y puedan prosperar o colapsar incluso cuando el jugador no intervenga. Eso haría que el mundo se sintiera mucho más vivo que un simple mapa con ciudades enemigas.

### La experiencia central: observar, administrar y descubrir

Hay una distinción que considero fundamental para que la IA entienda tu visión: el juego debe ser simultáneamente un simulador que se observa, un sistema que se administra y un mundo que se descubre.

- **Un mundo que se observa.** El placer de mirar las ciudades crecer, ver a las personas trabajar, seguir el movimiento de mercancías y contemplar la evolución de una civilización. La ciudad debe resultar interesante incluso cuando el jugador no está haciendo clic en ella.
- **Un sistema que se administra.** El placer de descubrir por qué algo funciona o fracasa. Comprender una cadena de suministro, ajustar impuestos, desarrollar un puerto, reformar instituciones o resolver un problema de abastecimiento debe ser intelectualmente satisfactorio.
- **Un mundo que se descubre.** El placer de no saber exactamente qué ocurrirá. Nuevas civilizaciones, recursos estratégicos, conspiraciones, oportunidades comerciales, amenazas naturales y criaturas mitológicas pueden transformar una partida de maneras inesperadas pero comprensibles.

La combinación de estas tres experiencias puede ser lo que haga especial a tu juego: no solo crear una ciudad hermosa, sino comprender cómo funciona, descubrir qué puede llegar a ser y enfrentarte a las consecuencias de convertirla en algo mucho más grande.

Mi segunda recomendación es que el desarrollo priorice desde el principio una simulación económica y social pequeña, pero real. Es preferible una sola ciudad con trabajadores, almacenes, alimentos, producción, necesidades y problemas sociales que funcionen de verdad a diez civilizaciones con cientos de mecánicas superficiales.

Cuando esa ciudad sea capaz de generar historias por sí misma, tendrás la base del juego que estás imaginando. A partir de ahí, la diplomacia, la guerra, la navegación, las tecnologías, las religiones y las civilizaciones rivales podrán ampliar el mundo sin perder su esencia.

---

**IMPERIUM** — No se trata solo de construir un imperio. Se trata de comprenderlo, gobernarlo y mantenerlo vivo.
