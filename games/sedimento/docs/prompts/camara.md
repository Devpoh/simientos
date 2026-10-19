# Prompt complementario — La cámara ideal para un juego de estrategia y construcción de ciudades en tiempo real

> Texto del usuario, recibido el 2026-10-19 y guardado **tal cual**. Es fuente de verdad. «IMPERIUM» = SEDIMENTO (R4).
> Resumen operativo y estado de implementación: `docs/gdd/camara.md`. Requisitos: R28–R31 en `docs/requisitos-usuario.md`.

---

Para IMPERIUM, la cámara es muchísimo más importante de lo que parece. El jugador pasará horas observando ciudades, colocando edificios, siguiendo trabajadores, inspeccionando rutas comerciales y dirigiendo ejércitos. Si moverla resulta incómodo, si no puedes ver bien los edificios o si el terreno oculta elementos importantes, toda esa simulación pierde parte de su atractivo.

Yo buscaría una cámara de estrategia en 3D con libertad de movimiento, perspectiva regulable, controles suaves y una capacidad excelente para pasar de la vista estratégica del imperio al detalle de una calle.

## PROMPT COMPLEMENTARIO — IMPERIUM

**Diseño e implementación de la cámara ideal para un juego de estrategia y construcción de ciudades en tiempo real**

### 1. TU MISIÓN

Actúa como un especialista sénior en cámaras 3D para videojuegos, programación de motores gráficos, controles de estrategia en tiempo real, experiencia de usuario y optimización del renderizado.

Tu objetivo es diseñar e implementar un sistema de cámara de alta calidad para IMPERIUM, un juego de construcción libre de ciudades y simulación de civilizaciones antiguas.

La cámara debe combinar la comodidad de una cámara de estrategia, la libertad de exploración de un juego de construcción de ciudades y la capacidad de contemplar detalladamente un entorno 3D.

Toma como referencias de diseño juegos como Tropico 6, Anno, Cities: Skylines y otros constructores de ciudades o juegos de estrategia que tengan cámaras cómodas y bien resueltas. Investiga y compara sus principios de interacción cuando sea necesario, sin copiar literalmente sus implementaciones ni asumir que un único sistema sirve para todos.

No busco una cámara que simplemente permita mover el punto de vista. Quiero una cámara que haga que construir, administrar, explorar y contemplar la ciudad resulte agradable durante muchas horas.

La prioridad es encontrar un equilibrio entre control preciso, libertad visual, comodidad, legibilidad de la ciudad y buen rendimiento.

Antes de escribir código, inspecciona el proyecto existente, identifica el motor gráfico y el sistema de entrada utilizado. Adapta la solución al proyecto real, conserva sus funcionalidades y evita realizar una reestructuración innecesaria.

No presupongas que el motor es Unity, Godot o Unreal Engine: comprueba cuál se utiliza y aplica las técnicas apropiadas.

### 2. CONCEPTO GENERAL: UNA CÁMARA LIBRE, SUAVE Y ADAPTADA AL TERRENO

IMPERIUM utiliza un mundo tridimensional con terreno continuo, colinas, montañas, ríos, costas, caminos y ciudades construidas libremente.

Por tanto, la cámara NO debe depender de una cuadrícula hexagonal, de casillas ni de una geometría de tablero.

El jugador debe poder moverse por el mundo de forma libre, independientemente de la distribución de sus edificios.

Diseña una cámara de estrategia en tercera persona elevada, con perspectiva oblicua, que permita observar la ciudad desde arriba sin perder la sensación de altura, profundidad y volumen.

No la bloquees en una perspectiva isométrica fija.

La cámara debe poder cambiar gradualmente entre diferentes configuraciones:

- Vista elevada para planificar la ciudad.
- Vista intermedia para inspeccionar barrios y edificios.
- Vista cercana para observar trabajadores, construcciones y detalles urbanos.
- Vista panorámica para apreciar una gran parte del territorio.
- Vista orientada a puntos de interés, como monumentos, puertos, ejércitos o ciudades rivales.

La cámara debe adaptarse a la escala de la simulación. Un pequeño asentamiento debe poder observarse con detalle, mientras que una metrópolis o un territorio extenso necesitan una perspectiva estratégica.

Quiero que el jugador tenga libertad para encontrar el ángulo desde el cual prefiere contemplar su ciudad, sin que mover la cámara se convierta en una tarea complicada.

### 3. CONTROLES FUNDAMENTALES

Diseña controles intuitivos que sean apropiados para un juego de estrategia en tiempo real.

Los siguientes son los controles iniciales propuestos. Comprueba si son compatibles con el sistema de entrada existente y permite modificarlos.

#### 3.1. Movimiento horizontal

El jugador debe poder desplazarse por el mapa mediante:

- W, A, S y D.
- Las teclas de dirección, si resulta conveniente.
- Movimiento del cursor hacia los bordes de la pantalla, opcional y configurable.
- Arrastre con el botón central del ratón.
- Controles equivalentes para dispositivos compatibles, si se decide admitirlos.

El movimiento debe seguir la orientación horizontal de la cámara.

Si la cámara está girada, pulsar W debe desplazarla hacia delante con respecto a su orientación, no hacia una dirección fija del mundo que resulte confusa.

El sistema debe permitir recorrer el mapa en todas las direcciones, sin saltos bruscos ni movimientos diagonales exageradamente rápidos.

Normaliza el movimiento diagonal para evitar que sea más rápido que el movimiento horizontal o vertical.

#### 3.2. Rotación

Quiero poder girar la cámara alrededor de un punto de interés utilizando, preferiblemente, el arrastre del botón derecho del ratón.

También puedes ofrecer Q y E para girar la cámara en incrementos o a una velocidad configurable.

La rotación debe ser suave y precisa.

El jugador debe poder contemplar un edificio desde su fachada, su parte posterior, sus laterales y diferentes ángulos elevados.

La rotación no debe obligar a la cámara a pasar por debajo del terreno ni generar cambios de orientación desconcertantes.

El sistema debe permitir elegir si la rotación se produce alrededor del centro de la vista, alrededor de un objetivo seleccionado o alrededor de un punto fijado temporalmente.

#### 3.3. Zoom

La rueda del ratón debe permitir acercar y alejar la cámara con suavidad.

El zoom debe cubrir desde una perspectiva cercana, apropiada para inspeccionar edificios y trabajadores, hasta una perspectiva amplia que permita administrar ciudades y territorios.

No utilices únicamente una ampliación visual que haga que los objetos parezcan más grandes. Diseña un comportamiento de cámara 3D coherente con el motor y la proyección seleccionados.

Al acercar la cámara, debe resultar natural pasar de una vista estratégica a una vista detallada.

Al alejarla, la ciudad debe continuar siendo legible y los elementos importantes no deben desaparecer de forma abrupta.

Permite configurar la velocidad del zoom, la distancia mínima y la distancia máxima.

#### 3.4. Inclinación vertical

El jugador debe poder inclinar la cámara para elegir cuánta superficie del terreno y cuántos detalles verticales desea observar.

A gran altura, podrá utilizar una perspectiva más estratégica. A menor distancia, podrá inclinar la cámara para observar mejor las fachadas, los edificios y las animaciones de construcción.

Define límites que impidan que la cámara atraviese el suelo o adopte ángulos extremos que resulten incómodos.

No limites la cámara a una vista casi vertical: los edificios deben poder apreciarse desde perspectivas oblicuas agradables.

Tampoco permitas que la inclinación se vuelva tan baja que las construcciones cercanas oculten casi toda la ciudad.

La configuración predeterminada debe estar cuidadosamente ajustada para la observación de ciudades antiguas.

### 4. UNA CÁMARA CON DISTINTAS DISTANCIAS DE OBSERVACIÓN

No quiero que el zoom sea simplemente una función de acercar o alejar la imagen. Debe cambiar la forma en que se observa el mundo.

#### 4.1. Vista estratégica

En esta vista, el jugador puede contemplar una gran extensión del territorio y entender la distribución de la ciudad.

Debe facilitar:

- La planificación de nuevos barrios.
- La identificación de terrenos adecuados para construir.
- La inspección de caminos y conexiones.
- La localización de recursos naturales.
- La observación de zonas agrícolas y bosques.
- El análisis de fronteras, puertos y rutas.
- La organización general de las infraestructuras.

La cámara debe proporcionar una visión amplia sin perder completamente la percepción del relieve.

#### 4.2. Vista urbana

Esta será la vista habitual durante la construcción y administración de una ciudad.

El jugador debe poder observar varios edificios a la vez, reconocer su distribución y distinguir caminos, plazas, almacenes, talleres y zonas residenciales.

Debe permitir seleccionar edificios, planificar nuevas construcciones, seguir transportes y detectar problemas de organización urbana.

Los edificios deben mantener proporciones visuales claras, y la cámara debe permitir girar alrededor de los barrios para inspeccionar distintas fachadas.

#### 4.3. Vista cercana

La cámara debe permitir acercarse para observar edificios, trabajadores, construcciones y actividades cotidianas.

Quiero poder contemplar cómo se levanta una vivienda, cómo llegan los materiales, cómo se trabaja en un taller o cómo se desarrollan actividades en un mercado.

Al acercarse, las animaciones y los materiales deben mejorar la sensación de estar observando una ciudad viva.

Sin embargo, no quiero que el jugador pueda acercarse indefinidamente hasta atravesar paredes, entrar accidentalmente en los modelos o quedar atrapado entre edificios.

La distancia mínima debe depender de las necesidades del diseño y de los límites del sistema visual.

#### 4.4. Vista panorámica

Cuando el jugador quiera observar un área extensa, la cámara debe poder alejarse para mostrar la ciudad y su entorno.

Debe facilitar la contemplación de la expansión urbana y las relaciones entre asentamientos, costas, montañas, ríos y zonas productivas.

Si el mundo es suficientemente grande, permite utilizar niveles de detalle y simplificaciones visuales para mantener el rendimiento a grandes distancias.

No confundas una vista panorámica con una vista que solamente reduce los objetos hasta volverlos ilegibles.

### 5. ZOOM INTELIGENTE Y ENFOQUE SOBRE EL CURSOR

Investiga e implementa un comportamiento de zoom que haga que el jugador sienta que controla directamente el espacio.

Cuando el usuario acerque la cámara con la rueda del ratón, considera la posibilidad de dirigir el movimiento hacia el punto del terreno situado bajo el cursor.

Por ejemplo, si está observando un mercado en un extremo de la ciudad y hace zoom sobre él, la cámara debería acercarse de forma natural a esa zona, en lugar de acercarse únicamente a un punto fijo distante.

Cuando aleje la cámara, el comportamiento debe seguir siendo predecible.

Implementa esta característica de manera que no cause saltos, vibraciones ni desplazamientos exagerados.

El sistema debe tener en cuenta los terrenos irregulares, los objetos elevados, las fachadas y los edificios que puedan bloquear el rayo de selección.

Si el zoom hacia el cursor produce comportamientos extraños en determinadas situaciones, permite desactivarlo y utiliza un comportamiento convencional estable.

No sacrifiques la precisión de la cámara para añadir una característica aparentemente sofisticada.

### 6. MOVIMIENTO SUAVE, PERO CON RESPUESTA INMEDIATA

Esta sección es esencial.

No quiero una cámara rígida que se mueve bruscamente cuando se pulsan las teclas. Tampoco quiero una cámara tan lenta que resulte desesperante navegar por la ciudad.

Diseña un sistema de movimiento con suavizado configurable, aceleración y desaceleración cuando resulten apropiadas.

La respuesta debe sentirse inmediata al comenzar una acción, pero suficientemente amortiguada para que detenerse o cambiar de dirección no resulte brusco.

Aplica suavizado al movimiento, la rotación y el zoom de manera independiente cuando sea necesario.

Evita que los movimientos encadenados acumulen retrasos excesivos.

Cuando el jugador interrumpa un movimiento, la cámara debe responder sin parecer que continúa deslizándose durante demasiado tiempo.

Cuando la cámara cambie de objetivo, realiza transiciones naturales que permitan comprender hacia dónde se mueve.

Todos los parámetros relevantes deben poder ajustarse en una configuración centralizada, sin necesidad de modificar numerosos archivos.

Incluye al menos los siguientes parámetros:

- Velocidad de desplazamiento.
- Aceleración y desaceleración.
- Intensidad del suavizado.
- Sensibilidad de rotación.
- Velocidad de inclinación.
- Velocidad de zoom.
- Distancia mínima y máxima.
- Ángulos mínimos y máximos.
- Sensibilidad del movimiento con el ratón.
- Velocidad de desplazamiento según el nivel de zoom.

El objetivo es que el jugador perciba la cámara como una herramienta precisa y agradable, no como un objeto pesado que tiene que luchar para controlar.

### 7. VELOCIDAD ADAPTATIVA AL NIVEL DE ZOOM

La velocidad de desplazamiento debe adaptarse a la distancia de observación.

Cuando el jugador esté inspeccionando una vivienda de cerca, pequeños movimientos de cámara deben proporcionar suficiente precisión.

Cuando esté observando una ciudad completa, los movimientos deben permitir desplazarse con rapidez entre barrios.

Cuando esté utilizando una vista panorámica, debe ser posible recorrer grandes extensiones del mapa sin mantener una tecla pulsada durante demasiado tiempo.

Implementa una función gradual que relacione la distancia de la cámara con su velocidad de desplazamiento.

Evita cambios bruscos de velocidad cuando se supera una distancia determinada.

Permite al jugador ajustar la velocidad general y desactivar la adaptación automática si prefiere un comportamiento constante.

Comprueba que la cámara siga siendo controlable tanto en una ciudad pequeña como en un territorio extenso.

### 8. LA CÁMARA DEBE RESPETAR EL TERRENO CONTINUO

El mundo de IMPERIUM no es una superficie plana.

Existen colinas, montañas, valles, ríos, acantilados y construcciones situadas a distintas alturas.

Por tanto, la cámara necesita comprender la superficie del mundo y evitar las intersecciones visuales incorrectas.

Diseña un sistema para impedir que la cámara atraviese:

- El terreno.
- Montañas y grandes formaciones.
- Edificios.
- Murallas.
- Otros obstáculos que deban bloquear la visión.

La implementación puede utilizar raycasts, sphere casts, cápsulas de colisión, comprobaciones de altura, límites angulares o técnicas equivalentes apropiadas para el motor.

No añadas comprobaciones costosas en cada fotograma si pueden resolverse con una estrategia más eficiente.

#### 8.1. Movimiento sobre colinas

Al desplazarse sobre un terreno irregular, la cámara debe mantener una perspectiva razonable.

No debe hundirse bajo una colina porque el centro de la vista se encuentra al otro lado.

Tampoco debe elevarse bruscamente cada vez que el terreno presenta una pequeña variación.

Diseña un seguimiento suave del relieve, pero conserva la libertad de observar diferentes alturas.

La cámara debe permanecer suficientemente separada del suelo, salvo cuando el diseño permita deliberadamente una observación cercana.

#### 8.2. Evitar las penetraciones

Cuando una montaña o un edificio bloquee el movimiento, la cámara debe responder de forma predecible.

Puede reducir la distancia, ajustar el ángulo o limitar el desplazamiento, según el caso.

No permitas vibraciones constantes cuando dos sistemas intenten mover la cámara en direcciones opuestas.

Evita que una colisión provoque una teletransportación repentina o que la cámara se desplace a un punto alejado sin explicación.

Si no existe una solución satisfactoria en determinadas circunstancias, prioriza una cámara estable y legible sobre una libertad de movimiento absoluta.

### 9. EDIFICIOS QUE BLOQUEAN LA VISIÓN

En una ciudad con construcción libre habrá edificios, murallas, monumentos, almacenes y estructuras que pueden quedar entre la cámara y el punto que el jugador desea observar.

Quiero que la cámara gestione estas situaciones de forma inteligente.

Si una construcción oculta parcialmente la zona sobre la que se está trabajando, considera opciones como:

- Ajustar ligeramente el ángulo.
- Elevar la cámara de forma suave.
- Modificar la distancia de observación.
- Atenuar temporalmente ciertos objetos que bloquean la visión, si resulta apropiado.
- Utilizar resaltados o indicadores para identificar edificios y unidades ocultos.
- Ofrecer un mecanismo para fijar temporalmente un punto de observación.

No hagas desaparecer indiscriminadamente los edificios que se encuentran delante de la cámara.

La arquitectura forma parte de la identidad visual de la ciudad y su desaparición constante sería molesta.

Si implementas transparencias temporales o desvanecimientos, hazlo únicamente cuando exista una oclusión relevante y restaura los materiales con transiciones suaves.

Las transparencias no deben modificar la lógica de selección ni producir errores visuales en sombras, reflejos o materiales.

En todo momento, el jugador debe poder comprender qué está viendo y qué elementos se encuentran entre la cámara y el punto de interés.

### 10. SEGUIMIENTO DE EDIFICIOS, HABITANTES Y PUNTOS DE INTERÉS

La cámara debe ofrecer herramientas para enfocar elementos importantes de la simulación.

Quiero que el jugador pueda seleccionar una vivienda, un almacén, un puerto, un monumento, un trabajador, un ejército o una ciudad y llevar la cámara hacia ese punto.

#### 10.1. Enfocar un objeto

Al seleccionar un objeto y activar la acción de enfoque, la cámara debe desplazarse suavemente hasta una posición adecuada.

No debe teletransportarse de manera brusca salvo que el jugador utilice una acción específica de movimiento instantáneo.

La distancia de llegada debe depender del tipo de objeto y del contexto.

Una casa debe observarse desde una distancia cercana. Un monumento importante puede necesitar una perspectiva algo más amplia. Un ejército requiere suficiente espacio para comprender su composición.

#### 10.2. Centrar la vista

Incluye un control para centrar la cámara sobre una selección o sobre un punto señalado en el mapa.

Considera una tecla configurable, por ejemplo F, para enfocar la selección actual.

Permite distinguir entre centrar la vista y mantener un seguimiento continuo.

#### 10.3. Seguir unidades

Cuando el jugador quiera observar a un trabajador, una caravana, un barco o un ejército, puede activar un modo de seguimiento temporal.

En este modo, la cámara acompaña al objetivo de forma suave, sin movimientos nerviosos ni correcciones constantes.

El jugador debe poder abandonar el seguimiento en cualquier momento y recuperar el control normal.

Si el objeto se mueve detrás de una montaña, un edificio o fuera del campo de visión, el seguimiento debe intentar conservar una vista útil sin atravesar obstáculos.

#### 10.4. Seguimiento de construcción

Incluye la posibilidad de enfocar un edificio en construcción y observar su progreso.

El jugador debería poder pasar de una vista estratégica al punto de construcción, contemplar cómo llegan los materiales y ver las distintas fases de la obra.

El enfoque no debe interrumpir la simulación ni congelar los movimientos de los trabajadores.

### 11. COLOCACIÓN DE EDIFICIOS Y CONTROL DE LA CÁMARA

La cámara debe integrarse correctamente con el sistema de construcción libre de IMPERIUM.

Durante la colocación de un edificio, el cursor debe proyectarse sobre el terreno para determinar dónde se encuentra la posición de construcción.

Esta operación debe tener en cuenta la geometría real del terreno y no una cuadrícula hexagonal.

Mientras el jugador desplaza el edificio provisional, la cámara debe seguir respondiendo a los controles sin interferir con la precisión del cursor.

Quiero que resulte sencillo:

1. Seleccionar un edificio.
2. Mover su vista previa sobre el terreno.
3. Rotarlo.
4. Acercar o alejar la cámara.
5. Girar la vista para inspeccionar la ubicación.
6. Confirmar o cancelar la construcción.

Evita que el arrastre de un edificio provoque movimientos involuntarios de la cámara.

Evita también que el botón utilizado para rotar o seleccionar un edificio sea interpretado al mismo tiempo como una orden de rotación de la cámara.

La lógica de entrada debe conocer qué herramienta se encuentra activa y qué acción está realizando el jugador.

Si la colocación está activa, define prioridades claras entre selección, arrastre, rotación y navegación de la cámara.

Las acciones deben resultar predecibles en todo momento.

### 12. UNA CÁMARA PREPARADA PARA CIUDADES GRANDES

La cámara debe seguir funcionando cuando IMPERIUM pase de un pequeño asentamiento a una ciudad con muchos edificios y habitantes.

No construyas un sistema que solamente funcione en una escena vacía.

Diseña la cámara para que pueda trabajar con:

- Grandes cantidades de edificios.
- Árboles y vegetación.
- Caminos y puentes.
- Monumentos.
- Trabajadores en movimiento.
- Unidades militares.
- Barcos y puertos.
- Varias ciudades.
- Amplias regiones de terreno.
- Diferentes niveles de detalle.

La cámara debe aprovechar las capacidades del motor para gestionar la geometría, la distancia de visión, los niveles de detalle y la representación de objetos.

Cuando se aleje del terreno, los elementos pequeños pueden simplificarse visualmente.

Cuando se acerque, deben mostrarse modelos y detalles apropiados.

La selección de objetos no debe depender exclusivamente de que todos ellos se encuentren representados con la máxima calidad gráfica.

Las animaciones, las colisiones y las operaciones de selección deben mantenerse separadas de la lógica principal de navegación de la cámara siempre que resulte conveniente.

No actualices todos los sistemas de detección y seguimiento con una frecuencia innecesariamente elevada.

Identifica los posibles cuellos de botella y prueba el comportamiento con una escena representativa.

### 13. UNA EXPERIENCIA VISUAL COHERENTE CON LA DIRECCIÓN ARTÍSTICA

IMPERIUM está explorando una dirección artística de 3D estilizado y terreno continuo, aunque todavía deben compararse diferentes estilos y recursos.

Por ello, la cámara debe ser compatible con diferentes niveles de detalle y no depender de un estilo gráfico concreto.

La perspectiva debe favorecer la lectura de edificios, calles y unidades.

La distancia de observación debe permitir distinguir la silueta de los edificios sin exigir texturas extremadamente detalladas.

La inclinación predeterminada debe mostrar las fachadas y el relieve, conservando una visión suficiente de la distribución urbana.

La rotación no debe hacer que los edificios parezcan artificialmente pequeños ni que las calles desaparezcan detrás de las construcciones.

El sistema debe permitir contemplar la arquitectura desde ángulos agradables, pero también facilitar las tareas de administración.

Considera cómo se comportará la cámara con edificios altos, monumentos, murallas, árboles densos y puertos.

No utilices un ángulo fijo que favorezca únicamente un tipo de ciudad.

### 14. LÍMITES DEL MAPA Y EXPLORACIÓN

La cámara no debe desplazarse indefinidamente más allá de los límites del mundo jugable.

Sin embargo, los límites deben gestionarse de forma suave.

Cuando se acerque al borde del terreno, el movimiento debe reducirse o detenerse de forma controlada.

Evita que la cámara se quede atrapada contra el borde o que los controles parezcan dejar de funcionar.

Si el mapa utiliza generación dinámica, considera cómo se expanden los límites y cómo se gestiona la cámara durante la carga de nuevas regiones.

Cuando el jugador enfoque una ciudad situada lejos de su posición actual, la cámara debe poder desplazarse hasta ella mediante una transición coherente.

Si la distancia es muy grande, permite combinar una transición suave con una reubicación rápida, según la configuración elegida.

La selección debe priorizar la claridad y la sensación de control.

### 15. OPCIONES DE ACCESIBILIDAD Y PERSONALIZACIÓN

Incluye ajustes que permitan adaptar la cámara a distintos estilos de juego y preferencias personales.

Como mínimo, considera:

- Sensibilidad del ratón.
- Velocidad de desplazamiento.
- Velocidad de rotación.
- Velocidad de zoom.
- Inversión del eje vertical.
- Inversión de la rueda de zoom, si procede.
- Activación o desactivación del movimiento por los bordes.
- Activación o desactivación del suavizado.
- Intensidad del suavizado.
- Activación o desactivación del zoom hacia el cursor.
- Campo de visión, cuando corresponda a la proyección utilizada.
- Distancias mínima y máxima.
- Límites de inclinación.
- Configuración de los atajos de teclado.

Guarda las preferencias cuando sea posible dentro del sistema de configuración del juego.

Evita movimientos automáticos excesivos que puedan marear o desorientar.

Las transiciones deben ser suaves, pero no tan lentas que dificulten el control de una situación urgente.

### 16. CÁMARA PARA DISTINTOS MODOS DE JUEGO

Aunque la cámara general debe ser coherente, puede ofrecer comportamientos específicos cuando se utilizan determinadas herramientas.

**Modo construcción.** Favorece la precisión del cursor y el reconocimiento del terreno. Permite observar pendientes, obstáculos, caminos y espacios disponibles. Reduce los cambios automáticos de cámara que puedan molestar al colocar edificios.

**Modo administración.** Favorece una perspectiva amplia y la inspección rápida de distintas zonas. Debe ser fácil desplazarse entre barrios, almacenes, mercados e infraestructuras.

**Modo militar.** Permite seguir ejércitos, observar caminos, estudiar obstáculos y comprender el terreno. Si la cámara sigue a una unidad militar, debe mantener una distancia que permita ver su entorno y no únicamente su modelo. No concedas información estratégica que el jugador no tendría disponible por otros sistemas de niebla de guerra o reconocimiento.

**Modo observación.** Permite contemplar la ciudad sin necesidad de seleccionar constantemente objetos. Puede ofrecer transiciones más suaves y una experiencia especialmente agradable para observar la actividad cotidiana. Este modo es complementario. No debe sustituir el control manual ni convertirse en una cámara cinematográfica que interrumpa la partida.

### 17. ARQUITECTURA TÉCNICA RECOMENDADA

Diseña el sistema de cámara mediante componentes con responsabilidades claras.

La implementación debe separar, en la medida que resulte apropiado para el motor:

- Lectura de entradas.
- Movimiento horizontal.
- Rotación e inclinación.
- Zoom y distancia al objetivo.
- Detección de colisiones.
- Seguimiento de objetos.
- Enfoque de puntos de interés.
- Interacción con la construcción.
- Configuración de controles.
- Persistencia de preferencias.

No es obligatorio crear un archivo independiente para cada responsabilidad. La estructura debe ser razonable y compatible con las convenciones del proyecto.

Evita un único script gigantesco que contenga toda la navegación, los controles, la construcción, la detección de colisiones y los efectos visuales.

Centraliza los parámetros configurables.

Utiliza el sistema de entrada recomendado por el motor seleccionado y respeta el orden de procesamiento de sus eventos.

El movimiento de la cámara no debe depender de la velocidad de fotogramas de forma que cambie significativamente entre ordenadores.

Gestiona correctamente el tiempo entre fotogramas y los casos en los que se produzcan caídas temporales de rendimiento.

Si utilizas interpolación, evita acumulaciones que provoquen movimientos impredecibles.

La cámara debe tener un comportamiento estable aunque los sistemas de simulación, construcción o inteligencia artificial se actualicen con frecuencias diferentes.

No utilices operaciones de detección costosas sin necesidad. Identifica los raycasts y comprobaciones de colisión que realmente son importantes.

### 18. CRITERIOS DE CALIDAD Y PRUEBAS

No consideres terminada la cámara porque pueda moverse y rotar.

Debe ser agradable de utilizar, predecible y suficientemente robusta para funcionar en un juego complejo.

Comprueba lo siguiente:

1. Se puede recorrer el mapa en todas las direcciones.
2. El movimiento diagonal no resulta más rápido que el movimiento normal.
3. La rotación es fluida y permite observar los edificios desde diferentes ángulos.
4. El zoom funciona de manera gradual entre una vista detallada y una panorámica.
5. La inclinación permite observar las construcciones sin perder toda la perspectiva urbana.
6. La cámara no atraviesa el terreno de manera normal durante el uso.
7. La cámara responde de forma predecible al acercarse a montañas y edificios.
8. El movimiento resulta controlable en zonas planas y con pendientes.
9. Se puede enfocar una construcción o unidad sin movimientos bruscos.
10. El zoom hacia el cursor, si está habilitado, funciona sin saltos.
11. La cámara y la construcción pueden utilizarse simultáneamente sin conflictos de entrada.
12. La velocidad se adapta razonablemente a distintas distancias de observación.
13. La cámara funciona con un número representativo de edificios, árboles y unidades.
14. Los límites del mapa se respetan correctamente.
15. Las opciones de personalización funcionan y no afectan negativamente a los controles básicos.
16. El comportamiento no depende de una tasa de fotogramas concreta.
17. Las transiciones entre seguimiento, enfoque y navegación manual son claras.
18. No existen vibraciones constantes, teletransportaciones inesperadas ni cambios repentinos de orientación.

Prueba el sistema tanto en un mapa vacío como en uno con relieve y en una ciudad que contenga edificios de distintos tamaños.

Cuando sea posible, utiliza herramientas de diagnóstico para medir el rendimiento y detectar cálculos innecesarios.

### 19. PARÁMETROS CONFIGURABLES Y AJUSTE DE LA SENSACIÓN

No quiero que el resultado dependa de valores arbitrarios que nadie ha probado.

Empieza con una configuración predeterminada razonable y construye una escena donde sea posible probar todos los controles.

Permite ajustar los parámetros desde una configuración centralizada o desde el inspector del motor, según las convenciones del proyecto.

Utiliza nombres descriptivos y documenta qué controla cada parámetro.

Evalúa especialmente:

- Distancia inicial.
- Inclinación inicial.
- Campo de visión si existe perspectiva.
- Velocidad de movimiento.
- Suavizado de movimiento.
- Velocidad de rotación.
- Sensibilidad del zoom.
- Velocidad adaptativa al acercamiento.
- Intensidad del enfoque automático.
- Comportamiento ante colisiones.
- Límites de altura.
- Límites de rotación.
- Distancia a los objetivos seleccionados.

No optimices cada valor de manera aislada. Prueba combinaciones que produzcan una experiencia consistente.

La configuración predeterminada debe funcionar bien sin necesidad de que el usuario modifique manualmente veinte parámetros.

### 20. MÉTODO DE IMPLEMENTACIÓN

Trabaja por etapas, sin intentar perfeccionar todas las funciones al mismo tiempo.

- **Fase A. Inspección.** Examina el motor, el tipo de cámara existente, las escenas, los controles y los sistemas de entrada. Determina qué componentes pueden reutilizarse.
- **Fase B. Movimiento básico.** Implementa movimiento horizontal, zoom, rotación e inclinación con controles configurables. Prueba que funcionen correctamente en un terreno continuo.
- **Fase C. Suavizado y adaptación de velocidad.** Ajusta las transiciones, el movimiento según la distancia y la respuesta a entradas rápidas. Evita introducir retrasos excesivos.
- **Fase D. Colisiones y terreno.** Añade detección del terreno y obstáculos, manteniendo una separación razonable y una orientación estable.
- **Fase E. Enfoque y seguimiento.** Implementa el enfoque sobre edificios, el centrado de objetivos y el seguimiento opcional de unidades.
- **Fase F. Integración con construcción.** Comprueba la interacción entre la cámara, el cursor, la vista previa de edificios y las acciones de construcción.
- **Fase G. Personalización.** Añade opciones de sensibilidad, velocidad, límites y modos de movimiento.
- **Fase H. Pruebas y optimización.** Prueba diferentes terrenos, alturas, ángulos y cantidades de elementos. Registra los problemas encontrados y verifica que los cambios no rompen funcionalidades anteriores.

No consideres un comportamiento correcto únicamente porque no produce errores de ejecución. La comodidad y la legibilidad también deben evaluarse de forma práctica.

### 21. ENTREGABLES

Al terminar esta tarea, quiero recibir:

- **Entregable A. Diseño de cámara.** Una explicación de la cámara seleccionada, sus controles, los modos de observación y la justificación de sus decisiones fundamentales.
- **Entregable B. Implementación funcional.** El código integrado en el proyecto existente, adaptado a su motor y a sus convenciones.
- **Entregable C. Configuración centralizada.** Los parámetros que permiten ajustar el comportamiento de la cámara sin modificar numerosos archivos.
- **Entregable D. Escena de pruebas.** Una escena con terreno continuo, edificios de diferentes alturas, caminos, obstáculos y puntos de interés. Debe permitir comprobar los movimientos, la rotación, el zoom, el seguimiento y las colisiones.
- **Entregable E. Pruebas documentadas.** Una lista de los comportamientos comprobados, los errores encontrados, las correcciones realizadas y las limitaciones que todavía existan.
- **Entregable F. Instrucciones.** Explica cómo ejecutar el proyecto, utilizar los controles y modificar los parámetros de la cámara.

Si una función no se ha implementado, indícalo claramente.

No afirmes que has probado una característica que no has ejecutado o comprobado.

### 22. PRINCIPIO FINAL

La cámara debe hacer que IMPERIUM resulte agradable de jugar tanto durante la construcción de un pequeño asentamiento como durante la administración de una gran civilización.

Quiero moverme rápidamente cuando sea necesario, inspeccionar con precisión cuando esté construyendo, contemplar con satisfacción cuando la ciudad prospere y seguir a las unidades cuando una situación militar lo requiera.

No quiero una cámara espectacular pero incómoda. Tampoco quiero una cámara técnicamente sencilla que limite constantemente al jugador.

Quiero una cámara que desaparezca de la atención del jugador porque responde exactamente como espera, y que al mismo tiempo le permita apreciar la belleza y la complejidad del mundo que está construyendo.

Empieza inspeccionando el proyecto existente. Después implementa y prueba el movimiento, el zoom, la rotación y la inclinación. Continúa con las colisiones, el enfoque de objetos y la integración con la construcción libre.

Prioriza la comodidad, la estabilidad y la diversión sobre la cantidad de funciones.

---

## Configuración inicial recomendada (nota del usuario)

Para este juego, empezaría con una cámara que tenga estos valores como punto de partida, no como ajustes definitivos:

| | |
|---|---|
| Perspectiva | 3D oblicua libre |
| Movimiento | WASD + arrastre |
| Rotación | Botón derecho + arrastre |
| Zoom | Rueda del ratón |
| Inclinación | Regulable |
| Enfoque | Suave sobre edificios y unidades |

Hay una característica que priorizaría por encima de las demás: poder acercarte a un edificio en construcción, rodearlo para observar cómo se levanta, alejarte después y ver cómo encaja en el conjunto de la ciudad, sin que la cámara pierda el control ni te obligue a cambiar de modo. Esa transición conecta directamente el placer visual del constructor de ciudades con la profundidad de simulación que buscas para IMPERIUM.
