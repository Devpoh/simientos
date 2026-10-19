# Prompt complementario — Dirección artística, terreno continuo, construcción libre y laboratorio visual

> Texto del usuario, recibido el 2026-10-19 y guardado **tal cual**. Es fuente de verdad: si un documento del juego lo contradice, manda este. En el texto, «IMPERIUM» es el nombre de trabajo del proyecto, que en el estudio se llama **SEDIMENTO** (R4).
> Resumen operativo: `docs/gdd/arte.md` (dirección artística y laboratorio) y `docs/gdd/construccion.md` (construcción libre y progresiva). Requisitos: R20–R27 en `docs/requisitos-usuario.md`.

---

Lo que añadiría al prompt maestro es un bloque especializado en dirección artística, construcción libre y selección de recursos visuales. Es importante porque ahora mismo tienes dos problemas diferentes: definir cómo quieres que se vea el juego y encontrar una forma realista de conseguir ese resultado sin tener que convertirte en artista 3D.

La decisión que tomaría desde el principio es esta: nada de mapas hexagonales ni edificios colocados obligatoriamente en casillas. El terreno debe ser continuo y las construcciones deben poder colocarse libremente, inspirándose en la flexibilidad de Tropico. A la vez, necesitamos comparar estilos visuales antes de comprometernos con uno.

## PROMPT COMPLEMENTARIO — IMPERIUM

**Dirección artística, terreno continuo, construcción libre y laboratorio visual de recursos**

### 1. OBJETIVO DE ESTE BLOQUE

Quiero ampliar el proyecto IMPERIUM con una definición mucho más precisa de su estilo visual, su sistema de construcción y su proceso de selección de recursos gráficos.

Debes entender que no soy artista profesional ni diseñador especializado en modelado 3D. Mi fuerte está en la programación y el diseño de sistemas. Una de las mayores dificultades que tengo es decidir qué estilo artístico debería utilizar y cómo conseguir que el juego tenga una apariencia atractiva sin tener que producir todos los modelos, texturas, edificios, personajes y animaciones desde cero.

Por eso, no quiero que te limites a recomendarme un estilo visual con palabras. Quiero que investigues recursos disponibles, compares alternativas reales, construyas una galería interactiva con ejemplos visuales y me ayudes a decidir qué dirección artística es la más apropiada para el juego.

El objetivo no es conseguir gráficos de nivel AAA. Quiero conseguir un juego visualmente bonito, coherente, agradable de contemplar, reconocible y capaz de funcionar correctamente con una simulación compleja.

La prioridad es que el juego sea divertido. Sin embargo, su presentación visual debe tener suficiente calidad y personalidad para que resulte satisfactorio observar una ciudad durante mucho tiempo.

No quiero sacrificar la jugabilidad, la simulación económica o el rendimiento para perseguir un realismo gráfico innecesario.

### 2. CONSTRUCCIÓN LIBRE: NADA DE MAPAS HEXAGONALES

Esta es una decisión fundamental e innegociable.

IMPERIUM NO debe utilizar el sistema tradicional de construcción de Civilization VI, basado en ciudades y mejoras colocadas sobre casillas hexagonales.

Quiero un sistema de construcción libre, inspirado en la flexibilidad de los constructores de ciudades como Tropico 6.

El terreno debe ser continuo. Las casas, los talleres, los almacenes, los mercados, los templos, las murallas, los puertos y las demás construcciones deben poder colocarse directamente sobre el terreno, utilizando posiciones y rotaciones libres dentro de las limitaciones físicas y jugables.

No debe existir una cuadrícula visible que divida artificialmente todo el mundo.

Tampoco quiero que el edificio deba encajar obligatoriamente en una celda cuadrada o hexagonal.

El jugador debe poder crear asentamientos orgánicos, distribuir los edificios de acuerdo con el paisaje, desarrollar barrios irregulares, construir cerca de los ríos, organizar plazas, trazar caminos y adaptar la ciudad a sus propias ideas.

Quiero libertad para crear ciudades que parezcan haber evolucionado a partir de su geografía y de las necesidades de sus habitantes, en lugar de ciudades que siempre parecen diseñadas sobre un tablero.

#### 2.1. Reglas de colocación

La libertad de construcción no debe significar que los edificios puedan atravesarse entre sí o flotar sobre el terreno.

Implementa un sistema de colocación que incluya:

- Posicionamiento libre sobre la superficie del terreno.
- Rotación de los edificios antes de confirmar su colocación.
- Vista previa transparente del edificio antes de construirlo.
- Indicadores claros de colocación válida o inválida.
- Detección de colisiones y solapamientos.
- Comprobación de pendientes y estabilidad del terreno.
- Requisitos de acceso, caminos o conexión con infraestructuras cuando corresponda.
- Distancias mínimas justificadas por el tamaño y la función del edificio.
- Herramientas para mover, demoler, sustituir o reubicar construcciones según las reglas del juego.
- Posibilidad de colocar edificios junto a caminos, plazas, ríos, costas y otros elementos geográficos cuando sea apropiado.

Permite un ajuste opcional a una cuadrícula invisible o a puntos de referencia cuando pueda facilitar la alineación, pero nunca obligues al jugador a construir mediante casillas.

La cuadrícula, si existe internamente por motivos técnicos, debe ser una ayuda opcional y no una limitación fundamental del diseño.

#### 2.2. Caminos y distribución urbana

Los caminos deben poder trazarse libremente mediante puntos, curvas o segmentos conectados, siguiendo el relieve del terreno.

Quiero poder crear calles rectas, caminos curvos, caminos rurales, rutas comerciales, senderos y conexiones entre barrios.

La red de caminos debe participar en la simulación: facilitar desplazamientos, conectar edificios, afectar al tiempo de transporte y ayudar a organizar la actividad económica.

Evita que los caminos se comporten como una simple textura pintada sobre el suelo. Deben ser infraestructuras reconocibles dentro del mundo.

Las plazas y otros espacios públicos también deben poder desarrollarse de forma orgánica, sin depender de una cuadrícula rígida.

#### 2.3. Adaptación al relieve

El terreno debe afectar a las posibilidades de construcción.

Los edificios pequeños pueden tolerar determinadas irregularidades, mientras que las estructuras monumentales, las fortificaciones, los puentes y algunas infraestructuras necesitan condiciones específicas.

Diseña herramientas razonables para preparar terrenos, nivelar superficies y realizar modificaciones del paisaje cuando el juego lo permita.

Estas modificaciones deben tener un coste coherente con su complejidad, y no deben permitir alterar instantáneamente cualquier montaña, río o costa sin consecuencias.

La construcción debe integrarse visual y funcionalmente con la geografía.

### 3. EL TERRENO DEBE SER CONTINUO Y NATURAL

Quiero un paisaje tridimensional continuo, sin hexágonos visibles ni patrones geométricos que revelen una división artificial del mapa.

El terreno debe convertirse en una parte importante de la identidad visual de IMPERIUM.

Me gustaría que el mundo tuviera colinas suaves, llanuras, montañas, valles, cauces fluviales, costas en pendiente, playas, bosques, zonas áridas y regiones con diferentes condiciones ambientales.

El jugador debe poder contemplar el terreno antes de fundar una ciudad y evaluar sus ventajas estratégicas.

Una llanura fértil puede favorecer la agricultura. Una colina puede ofrecer una posición defensiva. Una costa puede permitir construir un puerto. Un río puede facilitar el transporte y proporcionar agua, pero también representar un riesgo de inundación.

El relieve no debe ser solamente decorativo: tiene que influir en la construcción, la navegación, la agricultura, el transporte y la guerra.

#### G1. Geometría y relieve continuo

Desarrolla primero una base de terreno tridimensional continuo.

Debe incluir:

- Llanuras y colinas suaves.
- Cambios de elevación progresivos y naturales.
- Montañas con siluetas atractivas y transitables solo donde corresponda.
- Valles y depresiones.
- Ríos y cauces integrados con el paisaje.
- Costas que desciendan gradualmente hacia el agua.
- Playas y transiciones entre arena, tierra y vegetación.
- Terreno adecuado para construir sin que todo tenga que ser plano.
- Compatibilidad con caminos, edificios, vegetación y elementos decorativos.
- Posibilidad de incorporar herramientas de modificación del terreno si resultan viables.

Quiero que valores cómo representar los cauces excavados, los canales y las modificaciones del terreno, teniendo en cuenta el sistema hidráulico y la escala del juego.

No es necesario implementar desde el primer momento un editor geológico extremadamente complejo. Primero debe existir un terreno atractivo, funcional y técnicamente eficiente.

#### G2. Materiales del terreno y texturas

Investiga texturas gratuitas de calidad, preferentemente CC0 o con licencias que permitan su uso comercial en videojuegos.

Quiero disponer de materiales para:

- Hierba.
- Tierra seca.
- Barro.
- Arena.
- Roca.
- Suelo de bosques.
- Playas.
- Nieve y hielo para las regiones que lo requieran.
- Caminos de tierra.
- Superficies de piedra y pavimentos antiguos.

Las transiciones entre materiales deben parecer naturales.

No quiero que el terreno parezca cubierto por una textura que se repite de forma evidente cada pocos metros.

Investiga técnicas como la mezcla de materiales, el uso de mapas de ruido, las texturas repetibles, el mapeado triplanar cuando resulte apropiado y otros métodos capaces de reducir los patrones visibles.

No cargues todas las texturas disponibles al mismo tiempo. Diseña un sistema que permita utilizar los materiales necesarios para cada región y mantener un buen rendimiento.

Las texturas fotográficas de alta calidad son una opción, pero no deben mezclarse automáticamente con modelos muy estilizados. Evalúa si encajan con cada dirección artística.

Si una combinación resulta visualmente incoherente, propón alternativas estilizadas de los mismos materiales.

#### G3. Iluminación y atmósfera

Quiero una iluminación agradable que haga que el mundo resulte atractivo sin necesidad de recurrir a efectos excesivos.

Evalúa el uso de:

- Iluminación ambiental.
- Luz direccional para representar el sol.
- Cielos HDRI cuando resulten apropiados.
- Sombras suaves.
- Oclusión ambiental.
- Niebla atmosférica para mejorar la profundidad visual.
- Ajustes de exposición y color.
- Variaciones horarias de iluminación.
- Cambios visuales relacionados con las estaciones y las condiciones meteorológicas.

La iluminación debe ayudar a distinguir los edificios, el relieve, la vegetación y los caminos.

Quiero que las ciudades se vean bien durante el día y que los cambios de luz aporten vida al mundo.

No persigas un realismo extremo si perjudica la legibilidad o el rendimiento. Compara una iluminación estilizada y otra más realista antes de decidir.

#### G4. Agua y costas

El agua debe integrarse visualmente con el terreno y resultar convincente desde las distintas distancias de cámara.

Investiga cómo implementar:

- Ríos, lagos y zonas costeras.
- Color del agua relacionado con la profundidad.
- Reflejos del cielo y del entorno.
- Ondulaciones y movimiento de la superficie.
- Espuma en determinadas zonas de costa.
- Transiciones naturales entre agua, arena y tierra.
- Muelles y puertos integrados con la costa.
- Puentes y caminos que atraviesen ríos cuando sea apropiado.

No es necesario utilizar simulaciones físicas extremadamente costosas.

Busca un equilibrio entre atractivo visual, rendimiento y legibilidad. El agua debe ayudar a entender la geografía y no dificultar la construcción o el movimiento de las unidades.

#### G5. Vegetación y elementos naturales

El mundo debe contener vegetación y rocas visualmente coherentes con las regiones y civilizaciones representadas.

Investiga recursos gratuitos para crear bosques, arbustos, palmeras, cultivos, matorrales, rocas y otros elementos naturales.

La vegetación debe distribuirse de acuerdo con el clima, el relieve y las condiciones ambientales.

No quiero que todos los árboles sean idénticos ni que los bosques parezcan una repetición mecánica de objetos.

Considera variaciones de escala, rotación, densidad y apariencia, siempre dentro de una dirección artística coherente.

Los árboles, las rocas y los demás elementos deben poder instanciarse y optimizarse para representar regiones extensas sin comprometer excesivamente el rendimiento.

El jugador debe poder distinguir visualmente los bosques aprovechables, las zonas agrícolas, los recursos naturales y otras áreas importantes para la economía.

#### G6. Primer asentamiento: adobe, caña, madera y piedra

La primera civilización necesita modelos de edificios que encajen con un asentamiento antiguo y modesto.

Quiero explorar chozas de adobe, viviendas de caña, estructuras de madera, techos de paja, pequeños almacenes, graneros, talleres y otras construcciones apropiadas para la cultura inicial que se elija.

La dirección artística debe permitir que los primeros edificios parezcan modestos, pero atractivos.

Con la evolución de la civilización, los edificios pueden incorporar materiales más elaborados, mejores técnicas constructivas, elementos ornamentales y una arquitectura más monumental.

No elijas una colección de modelos medievales o modernos simplemente porque sea gratuita. Analiza si puede adaptarse estéticamente a una civilización antigua.

Si no encuentras modelos suficientemente adecuados, determina qué elementos pueden reutilizarse y cuáles necesitarían una sustitución o adaptación.

No falsifiques el origen histórico de un modelo: distingue entre edificios históricamente documentados, representaciones estilizadas y recursos genéricos utilizados como prototipos.

### 4. LOS EDIFICIOS DEBEN CONSTRUIRSE POCO A POCO

Esta es otra característica fundamental.

Quiero que la construcción funcione de forma semejante a Tropico 6: el jugador coloca el edificio donde quiere, confirma la obra y después observa cómo los trabajadores lo construyen progresivamente.

El edificio no debe aparecer terminado inmediatamente después de colocarlo.

La colocación crea un proyecto de construcción, no un edificio completado.

#### 4.1. Etapas de construcción

Diseña un sistema que permita representar varias fases visuales:

1. Plano de construcción: aparece la silueta o el contorno del edificio en el terreno.
2. Preparación del terreno: los trabajadores despejan, nivelan o preparan la zona cuando sea necesario.
3. Fundamentos: comienza la construcción de los cimientos o de la base.
4. Estructura principal: se levantan progresivamente paredes, columnas, soportes u otras estructuras.
5. Cubierta y acabados: se añaden tejados, puertas, detalles y elementos finales.
6. Edificio terminado: la construcción pasa a estar disponible para su función normal.

No todos los edificios necesitan exactamente las mismas fases. Un almacén, una choza, un templo monumental y una fortificación deben utilizar secuencias adecuadas a sus características.

Las etapas deben estar representadas visualmente y guardar relación con el progreso real de la construcción.

#### 4.2. Trabajadores, materiales y tiempo

El avance debe depender de los trabajadores disponibles, los materiales, las herramientas, la financiación y el tiempo requerido.

Los trabajadores deben desplazarse hasta la obra y participar en actividades reconocibles.

Los materiales deben proceder de almacenes, canteras, bosques, talleres u otras fuentes válidas.

Cuando falten recursos o trabajadores, la construcción puede ralentizarse o detenerse.

Si el proyecto no dispone de financiación suficiente o necesita materiales que todavía no se han producido, el jugador debe poder identificar el motivo del retraso.

Quiero poder observar carretas, trabajadores o grupos de transporte llevando madera, piedra, adobe y otros materiales a las obras, dentro de las capacidades del sistema de simulación.

No es necesario animar individualmente cada material si eso perjudica el rendimiento, pero el resultado visual debe ser coherente con la economía.

#### 4.3. Progreso visible incluso con pocos recursos gráficos

No presupongas que todos los modelos gratuitos incluyen versiones para cada fase de construcción.

Si un recurso únicamente contiene el modelo del edificio terminado, busca una solución que permita representar el proceso mediante elementos modulares, estructuras parciales, andamios, materiales almacenados y piezas que se añaden progresivamente.

Cuando sea viable, crea variantes simplificadas de los modelos.

Si no es viable obtener variantes reales, utiliza una representación provisional claramente reconocible, sin fingir que ya existe un sistema completo.

La construcción gradual debe funcionar como una mecánica real y no como una animación decorativa que se reproduce mientras el edificio ya está completamente construido por debajo.

El estado de construcción debe determinar cuándo se puede utilizar el edificio.

#### 4.4. Consecuencias del estado de la obra

Una obra en construcción debe tener costes y necesidades propios.

Puede ocupar terreno, consumir materiales, emplear trabajadores y representar una inversión que todavía no genera beneficios.

El jugador debe poder cancelar, suspender o priorizar proyectos según las reglas del juego.

Una crisis económica, una guerra o una escasez de recursos debe poder retrasar las construcciones en curso.

Quiero que el crecimiento urbano se perciba como un proceso que requiere organización, no como una serie de edificios que aparecen por arte de magia.

### 5. NO SOY ARTISTA: NECESITO QUE ME AYUDES A ELEGIR UNA DIRECCIÓN ARTÍSTICA

No quiero que decidas el estilo artístico basándote exclusivamente en tu gusto o en la facilidad de programación.

Quiero que investigues diferentes alternativas, las compares visualmente y expliques sus ventajas y limitaciones.

Analiza, como mínimo, estas cuatro direcciones:

**Estilo A. 3D estilizado low-poly**

Modelos tridimensionales sencillos, siluetas claras, colores agradables, materiales relativamente simples y una iluminación que genere escenas atractivas.

Debe permitir construir ciudades con libertad, representar el terreno continuo y mostrar muchos edificios sin exigir gráficos extremadamente costosos.

**Estilo B. 3D estilizado con texturas más detalladas**

Modelos 3D con mayor riqueza de materiales, texturas de adobe, piedra, madera y vegetación, iluminación más elaborada y un aspecto algo más naturalista.

No debe perseguir necesariamente el fotorealismo. Debe conservar la coherencia entre los materiales, la arquitectura y la forma de los objetos.

**Estilo C. Pixel art isométrico o con perspectiva de ciudad**

Representación mediante sprites, edificios ilustrados, personajes pixelados, vegetación y escenarios dibujados.

Investiga recursos de pixel art atractivos y analiza su adecuación a un juego centrado en población visible, construcción libre, terreno continuo y simulación en tiempo real.

No presupongas que puede combinarse perfectamente con un entorno 3D. Evalúa qué implicaría convertirlo en una experiencia principalmente 2D o utilizar técnicas 2.5D, así como sus limitaciones en terrenos con desniveles, agua, sombras y rotación de edificios.

**Estilo D. Estilo híbrido o alternativas adicionales**

Propón otras alternativas únicamente si aportan una ventaja clara, como modelos 3D con una apariencia de ilustración pintada o escenarios 3D estilizados con una interfaz gráfica de inspiración histórica.

No añadas estilos por acumular opciones. Explica por qué cada uno merece ser evaluado.

#### 5.1. Qué debes comparar

Evalúa cada estilo mediante criterios explícitos:

- Atractivo visual.
- Coherencia entre edificios, terreno y personajes.
- Facilidad para encontrar recursos gratuitos.
- Disponibilidad de edificios antiguos y elementos históricos.
- Facilidad de integración en el motor elegido.
- Coste de adaptación de los recursos.
- Dificultad de producir modelos nuevos.
- Posibilidad de mostrar construcciones por etapas.
- Compatibilidad con la construcción libre.
- Rendimiento en ciudades con muchos edificios y habitantes.
- Claridad de lectura desde una cámara alejada.
- Capacidad de transmitir personalidad y diferenciación cultural.
- Facilidad para mantener una dirección artística coherente a medida que el juego crezca.

No puntúes el estilo únicamente por su apariencia en una imagen. Considera cómo se verá una ciudad completa con cientos de construcciones y habitantes.

#### 5.2. No mezcles estilos incoherentes

Un modelo 3D low-poly, una fotografía convertida en textura y un edificio pixelado no necesariamente combinan bien en una misma escena.

La galería debe permitir observar alternativas separadas.

Si recomiendas una combinación híbrida, justifica su coherencia visual y demuestra que funciona mediante un prototipo.

Quiero terminar con una dirección artística definida, no con un conjunto de recursos gratuitos que parecen pertenecer a juegos distintos.

### 6. INVESTIGA REPOSITORIOS Y BIBLIOTECAS DE RECURSOS GRATUITOS

Busca recursos gráficos que podamos utilizar legalmente en IMPERIUM.

No te limites a una sola página ni a resultados de búsquedas genéricas.

Investiga repositorios de código, bibliotecas de modelos 3D, colecciones de texturas, paquetes de pixel art y catálogos de recursos para videojuegos.

Empieza investigando, entre otras, estas fuentes:

- Kenney: colecciones de recursos 2D y 3D, elementos modulares, modelos estilizados, materiales e interfaces.
- Quaternius: recursos 3D y paquetes de modelos para prototipos y juegos.
- Poly Haven: modelos 3D, texturas y entornos HDRI.
- ambientCG: materiales y texturas PBR.
- OpenGameArt: recursos gráficos de distintos estilos, con licencias que deben verificarse por recurso.
- itch.io: paquetes de assets gratuitos, pixel art, tilesets, edificios, personajes y elementos ambientales.
- GitHub: repositorios de assets, colecciones CC0, bibliotecas de sprites y catálogos que documenten sus licencias.
- Otras fuentes que encuentres si son adecuadas y permiten verificar las condiciones de uso.

Busca especialmente edificios, arquitectura antigua, aldeas, casas de adobe, almacenes, mercados, templos, murallas, barcos, personajes, trabajadores, animales, vegetación, rocas, terreno y recursos naturales.

También necesito materiales para escenarios: hierba, arena, barro, piedra, agua, madera, nieve, caminos y superficies de construcción.

No busques únicamente modelos aislados. Prioriza paquetes que incluyan varios elementos visualmente compatibles, puesto que una dirección artística consistente será mucho más fácil de conseguir si varios recursos proceden de una misma colección o de autores con estilos similares.

#### 6.1. Popularidad y calidad

Prefiero recursos de proyectos conocidos, fiables y con una comunidad activa.

En GitHub, examina las estrellas, los forks, la actividad, la documentación, el historial de actualizaciones y el estado del proyecto.

En bibliotecas de assets, considera las valoraciones, las descargas, la cantidad de usuarios o reseñas disponibles y la calidad de las demostraciones visuales.

No inventes cifras de popularidad. Indica la fuente y la fecha en que consultaste los datos.

Tampoco supongas que un proyecto con muchas estrellas necesariamente ofrece los mejores modelos para este juego.

La popularidad sirve como una señal de confianza, no como sustituto de la evaluación artística o de la revisión de licencias.

#### 6.2. Requisitos de licencia

Distingue claramente entre descargar gratuitamente un recurso y disponer de permiso para usarlo en un videojuego comercial.

Mi objetivo es no tener que pagar por los recursos gráficos que utilicemos inicialmente. Por eso, prioriza licencias CC0, dominio público cuando esté debidamente justificado y otras licencias gratuitas compatibles con nuestro uso previsto.

No obstante, no descartes automáticamente recursos con otras licencias permisivas si permiten su incorporación al juego y podemos cumplir fácilmente sus condiciones.

Para cada paquete registra:

- Nombre del recurso.
- Autor o creador.
- Enlace a la página original.
- Tipo de recurso.
- Formatos disponibles.
- Licencia.
- Posibilidad de uso comercial.
- Necesidad de atribución.
- Restricciones importantes.
- Número de estrellas, valoraciones o descargas cuando exista información verificable.
- Compatibilidad con el motor o herramienta previstos.
- Valoración artística para IMPERIUM.
- Estado de integración: aprobado, pendiente de revisión o descartado.

No declares un recurso apto para uso comercial si no has podido comprobar su licencia.

En caso de duda, clasifícalo como pendiente de revisión y no lo incorpores como recurso aprobado.

No redistribuyas paquetes descargados ni publiques archivos de terceros de manera que infrinjan sus licencias.

### 7. CREA UNA GALERÍA INTERACTIVA EN HTTP://LOCALHOST:4400/

Esta es una de las tareas más importantes de este prompt.

Quiero que construyas una página web funcional en:

http://localhost:4400/

La página debe servirme como laboratorio de exploración artística de IMPERIUM.

No quiero una lista de enlaces, un documento de texto, una captura estática ni una página que simplemente describa los estilos con párrafos.

Quiero una galería visual navegable que me permita comparar los recursos encontrados y observar cómo podrían verse dentro de nuestro juego.

Antes de desarrollar esta página, inspecciona el proyecto existente, identifica sus tecnologías y revisa cómo está organizado. Conserva el código funcional y evita modificar componentes ajenos a esta tarea.

Si la página ya existe, amplíala sin destruir sus funcionalidades. Si no existe, crea una implementación independiente y mantenible.

Utiliza el puerto 4400 para esta galería. Si está ocupado, identifica el proceso responsable y explícame la situación antes de detener servicios o modificar configuraciones ajenas al proyecto.

#### 7.1. Página de inicio

La página debe tener una presentación cuidada, moderna y fácil de navegar.

Identifícala como:

IMPERIUM — Art Direction Lab

Incluye una breve explicación de su propósito y accesos claros a las principales secciones.

La interfaz debe ayudarme a explorar, comparar y elegir, incluso sin experiencia profesional en arte digital.

Debe priorizar las imágenes, las demostraciones y las comparaciones visuales, evitando grandes bloques de texto innecesarios.

#### 7.2. Sección de estilos artísticos

Crea una sección con comparaciones claras entre:

- 3D estilizado low-poly.
- 3D con texturas más detalladas.
- Pixel art isométrico o urbano.
- Estilos híbridos u otras alternativas viables.

Cada alternativa debe tener una identidad visual propia y una explicación breve.

Incluye ejemplos reales de recursos que encontremos. Siempre que sea posible, utiliza escenas o conjuntos de elementos, no únicamente iconos o imágenes promocionales desconectadas.

Quiero poder comparar qué aspecto tendría una pequeña aldea, una zona agrícola, un almacén, un mercado y un edificio monumental con cada estilo.

Si no disponemos de suficientes assets para representar todas estas categorías, muestra de forma transparente qué está disponible y qué falta. No inventes recursos existentes ni hagas pasar imágenes de referencia por modelos ya integrados.

#### 7.3. Sección de modelos 3D

Debe permitir explorar los modelos 3D encontrados en los repositorios.

Incluye tarjetas visuales con:

- Vista previa del modelo.
- Nombre del recurso.
- Categoría.
- Autor.
- Fuente original.
- Licencia comprobada.
- Formato de archivo.
- Popularidad, cuando esté disponible.
- Compatibilidad con el proyecto.
- Estado de integración.

Cuando dispongamos de modelos compatibles, quiero una vista 3D interactiva que permita rotarlos, acercarse, alejarse y observarlos desde distintos ángulos.

Prioriza formatos que puedan visualizarse en tiempo real, como glTF o GLB, siempre que sean compatibles con la tecnología utilizada.

Si los recursos están en otros formatos, evalúa si conviene convertirlos mediante herramientas apropiadas y respetando sus licencias.

No es suficiente con mostrar una lista de nombres de modelos.

#### 7.4. Sección de pixel art

Incluye una galería específica para recursos 2D y pixel art.

Debe permitir comparar:

- Edificios individuales.
- Conjuntos de edificios.
- Aldeas o ciudades completas.
- Personajes y trabajadores.
- Vegetación.
- Recursos naturales.
- Terrenos y tilesets.
- Interfaces e iconografía.
- Elementos ambientales y decorativos.

Utiliza imágenes con la mayor calidad disponible y conserva su proporción.

Si las imágenes proceden de una hoja de sprites, muestra una previsualización legible e identifica si se trata de una imagen completa, una colección de sprites o un conjunto de animaciones.

Distingue entre paquetes completos y recursos aislados que todavía no forman una dirección artística coherente.

#### 7.5. Sección de terreno, materiales y naturaleza

Muestra ejemplos de materiales y elementos ambientales.

Incluye, cuando estén disponibles, muestras de hierba, arena, barro, piedra, nieve, madera, agua, terrenos montañosos, bosques y costas.

Para las texturas PBR, muestra vistas previas de los materiales y explica qué mapas incluye cada recurso, como color base, normales, rugosidad o desplazamiento, cuando corresponda.

Esta sección debe ayudarme a descubrir si es posible construir un mundo atractivo a partir de materiales gratuitos sin tener que crear manualmente cada textura.

#### 7.6. Sección de construcción progresiva

Quiero una demostración visual de cómo se verían los edificios durante su construcción.

Crea una sección con varias etapas: plano inicial, preparación, fundamentos, estructura, cubierta y edificio terminado.

Utiliza modelos o elementos reales cuando sea posible y explica qué componentes son provisionales.

Si los recursos descargados no incluyen versiones en construcción, desarrolla una demostración técnica sencilla que represente una estructura levantándose progresivamente mediante modelos modulares, piezas parciales, andamios y materiales.

La demostración debe dejar claro cómo podría trasladarse el sistema al juego real.

#### 7.7. Comparador de direcciones artísticas

Quiero una herramienta que me permita comparar las alternativas antes de tomar una decisión definitiva.

La galería debe permitir seleccionar o visualizar en paralelo distintas representaciones de un asentamiento equivalente.

Por ejemplo:

- Un terreno con una pequeña casa, árboles y rocas en estilo 3D low-poly.
- Una escena equivalente con materiales más detallados.
- Un ejemplo en pixel art isométrico.
- Una alternativa híbrida si tiene sentido.

Cuando sea posible, utiliza elementos equivalentes para que la comparación sea útil.

Indica qué partes son modelos reales de los repositorios, qué partes son demostraciones creadas mediante código y qué partes son únicamente referencias visuales.

La finalidad es comparar el resultado que podemos obtener con recursos gratuitos, no juzgar conceptos abstractos.

Incluye un sistema sencillo para marcar favoritos, registrar comentarios y anotar qué alternativas me gustan más.

### 8. REQUISITOS TÉCNICOS DE LA GALERÍA

La galería debe funcionar realmente en el navegador, no ser una maqueta estática.

Utiliza las tecnologías compatibles con el proyecto existente. Si todavía no hay un proyecto frontend establecido para esta herramienta, puedes valorar React, Vite y Three.js cuando sean opciones apropiadas.

No añadas dependencias innecesarias.

La galería debe disponer de:

- Navegación por categorías.
- Filtros por estilo, formato y tipo de recurso.
- Búsqueda por nombre o categoría.
- Vista previa de imágenes.
- Visualizador 3D cuando el formato lo permita.
- Fichas de información de cada recurso.
- Enlaces a las fuentes originales.
- Comparación entre alternativas.
- Diseño adaptable a distintas resoluciones.
- Estados vacíos y mensajes de error comprensibles.
- Carga razonable de las imágenes y modelos.
- Gestión de recursos que no se puedan previsualizar.

Evita descargar o cargar simultáneamente una colección enorme de modelos que haga que la página tarde en abrirse.

Utiliza carga diferida, miniaturas y modelos optimizados cuando resulte necesario.

Las vistas previas deben funcionar de manera estable. No dejes tarjetas rotas con enlaces de imágenes inexistentes, rutas locales incorrectas o referencias remotas que fallen silenciosamente.

Cuando sea legal y técnicamente adecuado, conserva localmente las miniaturas y los recursos de prueba utilizados en la galería. Así no dependeremos permanentemente de que las páginas externas sigan funcionando.

Si una vista previa debe obtenerse desde una fuente externa y no es posible almacenarla localmente, indícalo y ofrece el enlace original.

La galería debe distinguir claramente entre un recurso que se puede visualizar, uno que está descargado localmente y uno que ya está integrado en el prototipo del juego.

### 9. INTEGRACIÓN DE RECURSOS EN IMPERIUM

La galería no debe convertirse en un catálogo aislado del proyecto.

Quiero que los recursos mejor valorados puedan pasar progresivamente a formar parte del juego.

Crea una estructura ordenada para almacenar los assets seleccionados, junto con su información de origen y licencia.

Organiza los recursos por categorías, por ejemplo:

- Terreno y materiales.
- Edificios.
- Construcción.
- Personajes.
- Animaciones.
- Vegetación.
- Rocas y elementos naturales.
- Agua.
- Barcos.
- Murallas e infraestructura.
- Decoración.
- Interfaz.

Adapta la estructura al motor y al proyecto existentes; no impongas un sistema de archivos incompatible con la arquitectura elegida.

No reemplaces automáticamente todos los modelos por los primeros assets gratuitos que encuentres.

Antes de integrar un recurso, verifica su calidad, formato, escala, pivote, materiales, licencia y coherencia estética.

Si un paquete no tiene la estética apropiada, puede permanecer en la galería como referencia, pero no debe incorporarse automáticamente a la escena principal.

Conserva un registro de cada recurso que se integre para que podamos sustituirlo en el futuro sin tener que reconstruir manualmente todo el proyecto.

### 10. RENDIMIENTO Y ESCALABILIDAD

IMPERIUM debe representar ciudades grandes, no solamente una pequeña maqueta.

Por esa razón, el estilo artístico tiene que ser compatible con una simulación que puede contener muchos edificios, habitantes, árboles, animales y elementos de infraestructura.

Al investigar recursos, considera:

- Complejidad geométrica.
- Cantidad de materiales.
- Resolución de texturas.
- Número de objetos.
- Posibilidad de reutilizar modelos.
- Instanciación y renderizado por lotes.
- Niveles de detalle.
- Distancias de dibujado.
- Uso de memoria.
- Compatibilidad con el motor.
- Posibilidades de animación.
- Coste de las sombras y los materiales.

No descartes un recurso únicamente por tener buena calidad visual. Evalúa si puede optimizarse y si su coste está justificado.

Sin embargo, no bases la dirección artística del juego en modelos demasiado pesados que obliguen a reducir drásticamente la cantidad de edificios o habitantes visibles.

La ciudad debe seguir siendo atractiva cuando crezca.

### 11. PRIORIZA LA DIVERSIÓN SOBRE EL REALISMO GRÁFICO EXTREMO

Quiero reiterar que los gráficos no tienen que competir con los de una superproducción.

Mi objetivo es desarrollar un juego independiente con una dirección artística agradable y coherente.

Prefiero un estilo sencillo bien ejecutado, con buena composición, colores equilibrados, edificios reconocibles y animaciones satisfactorias, antes que un conjunto de modelos muy detallados que no combinan entre sí.

No inviertas una cantidad desproporcionada de tiempo en mejorar reflejos o texturas si todavía no se puede construir una ciudad, si los trabajadores no se mueven correctamente o si la economía no funciona.

La jerarquía de prioridades debe ser:

1. El juego debe ser divertido y las mecánicas principales deben funcionar.
2. La construcción y la simulación deben ser coherentes.
3. El estilo visual debe ser atractivo y consistente.
4. Los gráficos deben optimizarse para mantener un rendimiento aceptable.
5. Los efectos avanzados y los detalles adicionales se incorporarán cuando aporten valor real.

Esto no significa descuidar el arte. Significa elegir una dirección que podamos alcanzar con los recursos y capacidades disponibles.

### 12. FASES DE TRABAJO Y ENTREGABLES

No intentes resolver toda la dirección artística con una única decisión precipitada.

Trabaja en las siguientes fases.

**Fase A. Auditoría del proyecto.** Examina la estructura existente, el motor, la tecnología visual, las dependencias y la situación del proyecto. Identifica qué partes ya funcionan y cuáles necesitan desarrollarse. No modifiques innecesariamente el proyecto existente.

**Fase B. Investigación de recursos.** Investiga repositorios y bibliotecas de assets. Recopila opciones reales y verifica licencias, formatos, popularidad y adecuación estética. Entrega un catálogo inicial de recursos 3D, pixel art, materiales y elementos del entorno.

**Fase C. Laboratorio visual.** Construye la galería funcional en http://localhost:4400/. Debe mostrar los recursos encontrados, sus datos y las distintas direcciones artísticas que estamos evaluando. Verifica que la página abre correctamente y que las vistas previas funcionan.

**Fase D. Comparación artística.** Construye una pequeña escena equivalente para comparar los estilos viables. Evalúa qué estilo permite conseguir una ciudad antigua atractiva con el menor coste de producción y sin perjudicar la simulación.

**Fase E. Prototipo de terreno continuo.** Implementa una pequeña región con terreno continuo, relieve, materiales básicos, agua y vegetación. No introduzcas hexágonos ni casillas visibles. Comprueba que los elementos visuales se integran correctamente y que el terreno permite construir libremente.

**Fase F. Prototipo de construcción.** Implementa la colocación libre de algunos edificios, el trazado básico de caminos y la construcción progresiva de al menos una vivienda y un almacén. Los edificios deben avanzar por etapas y depender de trabajadores, materiales y tiempo.

**Fase G. Selección del estilo definitivo.** Utiliza la evidencia visual y técnica para recomendar una dirección artística inicial. La decisión debe apoyarse en ejemplos reales, disponibilidad de recursos, coherencia estética, capacidad de ampliación y rendimiento. No tomes la decisión únicamente porque un estilo sea más fácil de programar.

**Fase H. Documentación y próximos pasos.** Documenta la dirección artística seleccionada, los recursos elegidos, las licencias, las limitaciones y los próximos pasos necesarios para ampliar la biblioteca visual. Conserva en la galería los estilos alternativos para poder regresar a ellos si las pruebas demuestran que la elección inicial no es adecuada.

### 13. CRITERIOS PARA DAR POR TERMINADA ESTA TAREA

No consideres terminada esta ampliación simplemente porque hayas creado unas cuantas tarjetas con imágenes.

La entrega debe cumplir los siguientes criterios:

- La construcción se ha definido sin hexágonos ni casillas obligatorias.
- El diseño contempla terreno continuo y relieve natural.
- La construcción progresiva está especificada y cuenta con una demostración visual cuando sea posible.
- Se han investigado recursos reales de 3D y pixel art.
- Cada recurso aprobado dispone de información verificable sobre su licencia.
- La galería funciona en http://localhost:4400/.
- La galería permite comparar distintos estilos de forma visual.
- Las imágenes y modelos que se muestran se corresponden con los recursos identificados.
- Se puede distinguir entre una referencia, una demostración provisional y un asset integrado.
- Se ha evaluado la compatibilidad de las alternativas con el juego.
- Existe una recomendación razonada sobre la dirección artística.
- No se ha eliminado código funcional sin justificación.
- Se ha comprobado el funcionamiento de la página mediante las herramientas disponibles.
- Se han documentado las limitaciones y las tareas pendientes.

No afirmes que un recurso se ha descargado, que una licencia se ha verificado o que una página funciona si no has realizado las comprobaciones correspondientes.

Si alguna parte no puede completarse con las herramientas disponibles, indica qué falta, por qué y qué procedimiento permitiría terminarla.

### 14. INSTRUCCIÓN FINAL

Quiero que me ayudes a resolver el problema artístico de IMPERIUM de manera práctica.

No soy artista y no quiero que el proyecto dependa de que aprenda a modelar cientos de edificios desde cero.

Necesito que investigues, compares, pruebes y me ayudes a escoger una dirección visual que podamos mantener durante el desarrollo.

Quiero ver opciones, no limitarme a imaginarlas.

Quiero poder abrir la galería en http://localhost:4400/, contemplar los recursos encontrados, comparar 3D con pixel art y decidir qué tipo de mundo me gusta más.

Quiero un terreno continuo con libertad de construcción, edificios que se levanten poco a poco y una ciudad que vaya cobrando vida.

No quiero una copia visual de Tropico ni de ningún otro juego. Quiero utilizar sus principios de construcción libre y progresiva para desarrollar una identidad propia.

Empieza auditando el proyecto existente y buscando recursos reales. Después crea la galería visual. No implementes un sistema gráfico definitivo antes de que podamos comparar las alternativas.

La finalidad de esta tarea es reducir la incertidumbre artística, evitar trabajo innecesario y conseguir una base visual atractiva, viable y coherente para el desarrollo de IMPERIUM.

---

## Repositorios y bibliotecas que merece la pena investigar (nota del usuario)

> Ampliado en `recursos-recomendados.md`.

No todas contienen edificios antiguos directamente, por lo que conviene evaluarlas en lugar de descargarlas indiscriminadamente.

- **Kenney — Assets 2D y 3D.** Buena fuente para prototipos estilizados, elementos modulares y recursos con una presentación coherente. Muchos paquetes individuales indican licencia CC0; hay que comprobar la ficha de cada paquete.
- **Quaternius — Modelos 3D.** Una fuente relevante de paquetes 3D estilizados. Su licencia publicada actualmente permite uso comercial gratuito y no exige atribución, pero impone restricciones sobre la redistribución de los assets como productos independientes. Comprueba las condiciones actuales de cada recurso.
- **Poly Haven — Modelos, texturas y HDRI.** Especialmente útil para estudiar materiales del terreno, rocas, iluminación ambiental y entornos. Sus recursos publicados están bajo CC0, aunque habrá que valorar cuáles encajan con una estética antigua estilizada.
- **ambientCG — Texturas PBR.** Para explorar hierba, tierra, barro, piedra, madera y otros materiales. Sus recursos se publican bajo CC0, lo que facilita valorar su uso en el juego y sus prototipos.
- **itch.io — Pixel art CC0.** Permite explorar paquetes de pixel art gratuitos y filtrar por estilo y tipo de recurso. Es útil para determinar si existen suficientes edificios y elementos compatibles para desarrollar una dirección artística 2D. Comprueba las condiciones de cada paquete.
- **Superpowers Asset Packs — GitHub.** Repositorio con licencia CC0 y alrededor de 1.300 estrellas en la consulta realizada. Puede servir para explorar recursos reutilizables, especialmente 2D, aunque no es un paquete especializado en civilizaciones antiguas.
- **Free Game Dev Assets — catálogo de GitHub.** Un catálogo que documenta fuentes, licencias y posibilidades de uso comercial. Es especialmente útil para descubrir nuevas bibliotecas y verificar condiciones, aunque no es en sí mismo un paquete único de modelos.

Mi recomendación inicial es evaluar primero 3D estilizado low-poly con terreno continuo, manteniendo el pixel art como alternativa real que se pueda comparar. El 3D estilizado parece alinearse mejor con tu objetivo de mover la cámara, construir libremente sobre colinas, observar edificios desde diferentes ángulos y mostrar su construcción por etapas. Eso es una hipótesis de diseño, no una decisión irreversible: la galería que solicita el prompt debe permitir comprobarlo visualmente antes de comprometer el proyecto.
