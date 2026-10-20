# Muestra de pixel art para IMPERIUM (2026, no 1990)

**Pregunta:** ¿qué nivel de pixel art «de 2026» (Eastward / Sea of Stars / Songs of Syx) puede producir Claude *solo con código*, píxel a píxel, para IMPERIUM? Si el 3D no diera la talla (plan B de R47), ¿merece la pena este camino y qué cuesta?

**Cómo correrlo** (desde esta carpeta): `python generar.py` (completo, ~2 min; `--prueba` = 6 fotogramas) y `python entregables.py` (hoja, paleta y verificación) → todo en `salida/`. El visor `vista/index.html` se abre en el navegador y se recarga solo.
Solo Python + Pillow + numpy + scipy. Nada que instalar.

**Estado:** **cerrado el 20-10-2026 por decisión del usuario (pasa a producción, R49).** Veredicto: **SEGUIR** (pixel art generado por código). Entregables completos en `salida/` y verificados (59 colores, 0 fuera de paleta, ampliación exacta):
- `escena_base_960x540.png`, `escena_x2_1920x1080.png`, `escena_x4_3840x2160.png`
- `escena_fluida_30fps.png` (APNG, 120 fotogramas, 4 s en bucle) y `escena_animada.gif` (60 fotogramas)
- `hoja_sprites.png` (+x4): ciudadanos (5 oficios × 2 géneros), templo y casa en 3 etapas, animales y criaturas
- `paleta.png` (+x4) y `paleta.txt` (hexadecimal); `verificacion.txt`
Visor: `python servir.py` → http://localhost:4410.

**Quedó a medias (para producción):** la ciudad ampliada (`COSTA_V = 19`, calles de 2 tiles y casas más separadas) está preparada en `terreno.py`/`plano.py` pero desactivada; la maqueta final conserva la colocación antigua (casas aún algo pegadas). **Lo que la muestra NO resuelve y producción debe:** colisiones (los ciudadanos de la muestra siguen rutas dibujadas a mano), selección múltiple, ficha de ciudadanos/estructuras, 6 etapas de obra, 4 orientaciones y LOD. Ver `.claude/docs/pivote-pixel-art.md`.

---

## Cómo está hecho (resumen técnico)
- **Resolución base 480×270**, todo en **índices de una paleta de 59 colores** (rampas de 4–7 tonos, sombras frías, luces doradas). Ningún color nace fuera de la paleta.
- **Terreno = heightfield en coordenadas de «suelo de pantalla»** + *relief mapping*: para cada píxel se baja un rayo hasta tocar el relieve. Da costa orgánica, río, colinas y acantilados con luz y sombra coherentes, sobre tiles isométricos 32×16.
- **Una sola luz** (hora dorada, desde la izquierda): caras izquierdas cálidas, derechas frías, sombras proyectadas hacia la derecha en el mismo mapa de alturas.
- **Edificios/personajes = sprites** dibujados por caras con mapeo afín exacto (`iso.py`): cada cara tiene su textura por píxel (tejas individuales, estuco con desconchones, sillares con juntas, madera con vetas).
- **Z-test sprite contra terreno**: los sprites se ordenan por profundidad y además se comparan con la profundidad del relieve (para que una muralla o un muelle tapen bien a quien está detrás).
- Fuente pixel propia 4×5 con ñ y tildes (`fuente.py`); nada de TTF escalado.

---

## Logros (lo que funcionó y conviene repetir)
1. **Paleta cerrada desde el minuto 0** (`paleta.py`): al dibujar siempre por `c(rampa, tono)` es imposible salirse. Verificarlo al final es trivial.
2. **Rampas con tinte**: sombra violeta-azul, luz dorada. Cambia más la sensación «2026» que cualquier detalle.
3. **Heightfield + rayo por píxel** en vez de rejilla de tiles: costa e río orgánicos sin trabajo manual, y los edificios siguen alineados a tiles.
4. **Texturas por función en coordenadas de la cara** (s, t): tejas, sillares y estuco se escriben una vez y valen para cualquier edificio.
5. **Contorno selectivo automático**: el borde toma el color del vecino oscurecido 3 tonos en su rampa (no negro). Da el aspecto pintado.
6. **Agua**: profundidad por distancia a la orilla + tramado ordenado (dithering) solo en el degradado + trazos que viajan + destellos que saltan + espuma que respira → coincide con lo que gustó en R47.
7. **Ciudadanos de 16×24** con silueta propia por oficio (sombrero de paja y azada / delantal y martillo / gorro rojo con barba y bolsa / casco con cresta, escudo y lanza / báculo, estola y corona de laurel) y ciclo de 6 fotogramas.
8. **Visor HTML con recarga automática** desde el principio: el usuario ve el progreso sin pedirlo.

## Fallos cometidos (síntoma → causa → solución) — para no repetirlos
| # | Síntoma | Causa | Solución |
|---|---|---|---|
| 1 | Colinas cubiertas de rayas oscuras | Cualquier pendiente se clasificaba como «cara vertical» por la sola diferencia de altura del rayo | Exigir además gradiente alto (`steep`) para pintar una cara; el resto se sombrea como suelo |
| 2 | Muelles invisibles (solo una línea) | La máscara de agua incluía los píxeles sin tierra, aunque tuvieran cubierta | Excluir la cubierta del muelle de la máscara de agua |
| 3 | Montañas planas (altura máx. 31 px) | Una playa «mínimo(H, 6)» recortaba toda la tierra a 6 px | Multiplicar por un factor de playa que solo actúa cerca de la costa |
| 4 | Usuario: «casas con el techo incompleto» | Solo dibujé el faldón delantero; el trasero queda casi de canto pero deja un hueco visible junto a la pared | Dibujar también el faldón trasero (en sombra) y los remates de cumbrera. **Lección: el usuario ve el sprite a tamaño real; revisar siempre las siluetas completas, no solo la cara principal** |
| 5 | Usuario: «solo veo una playa y un trozo de muralla» | Le abrí un visor con capturas viejas y no le expliqué qué faltaba | Abrir el visor con un texto de estado honesto y actualizarlo en cada hito |
| 6 | Campesino ilegible (fundido con su propia piel) | Camisa y piel con tonos casi iguales | Chaleco verde oliva + camisa de lino clara; los oficios se separan por **contraste de color**, no solo por forma |
| 7 | Caras sin expresión | Cabeza demasiado tapada por sombrero/pelo | Ojos de 1 px y mejilla clara dentro de una cabeza de 6×6; el sombrero no baja de la frente |
| 8 | Cuerpos cuadrados y paso casi invisible (1.ª versión) | Torso de 8 px + brazos pegados y piernas de 3 px | Torso de 6 px, brazos separados de 2 px, piernas de 2 px con zancada de ±2 px y rebote de ±1 px |
| 10 | Usuario: «el templo terminado también tiene el techo incompleto» (mismo fallo que las casas) | Repetí el error del faldón trasero en otro edificio: dibujé solo el faldón visible de frente | **Regla: todo tejado a dos aguas se dibuja con AMBOS faldones** (el trasero en sombra), también en edificios nuevos. Revisar cada sprite nuevo contra esa lista antes de enseñarlo |
| 11 | Frontón tapado por el tejado en el templo | El frente del tejado quedaba 6 px por delante del plano del frontón | Alinear el plano del frontón con el borde frontal de la cornisa y del tejado |
| 12 | La etapa «obra» del templo parecía un edificio cortado | Faltaba cualquier señal de que el tejado estaba en marcha | Añadir armazón de madera, cabios y primeras tejas: la obra debe **contar su historia**, no solo estar incompleta |
| 13 | Barcos con velas de manchas grises y poco legibles | Ruido aleatorio y 3 niveles de luz mal repartidos | Franjas de color limpias, 3 niveles de luz y costuras horizontales fijas; nada de ruido en telas |
| 14 | Todos los ciudadanos eran hombres (observación del usuario) y poco identificables | Un solo molde corporal y accesorios genéricos | Doble molde (pantalón / falda), peinados por función (corto, moño, trenza, melena, velo, pañuelo) y un accesorio exclusivo por oficio y género |
| 15 | Criaturas: v1 «feas y apretadas» → v2 pintada «no me gustan» → v3 grande «fatal» → se vuelve a la v1 | Cambié de estilo tres veces sin pedir una referencia; cada cambio rehízo todo el trabajo | **Regla: el estilo lo valida el usuario con UN boceto pequeño antes de dibujar la familia completa.** Una vez aceptado, solo se mejora la calidad dentro de ese estilo. Archivadas las versiones descartadas en `descartados/` para no repetirlas |
| 16 | Un «cuadrado» pegado al cuerno del minotauro en la variante «cargando mármol» | El bloque de carga se dibujó en coordenadas que chocaban con la cabeza; solo revisé la pose base | **Revisar TODAS las variantes/poses de un sprite**, no solo la principal; las cargas y herramientas se anclan a las manos |
| 17 | Caballos «super mal» (cuerpo de caja, cuello corto, cabeza de perro) | Proporciones inventadas y formas hechas con rectángulos | Anatomía por polígonos (cabeza ≈ 40 % del cuerpo, cuello largo y grueso que se afina, grupa redonda, corvejón) y sombreado que sigue el contorno |
| 18 | «Todo muy pegado a las casas» | Resolución base 480×270 con casas de 2×2 tiles (64 px): caben pocas manzanas y no hay sitio para calles | Ampliar la base a **960×540** manteniendo los sprites; dejar **≥1,25 tiles de calle** entre manzanas y ≥1,3 entre casas; verificar con rejilla de tiles antes de dar por buena la maqueta |
| 19 | Barcos fuera del agua | Posiciones puestas a ojo | Nunca colocar un barco a mano: `agua_valida()` comprueba casco + margen de deriva contra la máscara de agua (y se usa también en las trayectorias) |
| 20 | Puente mal colocado y con una «sombra azul» debajo | El sprite llevaba su propio plano de agua, mucho más ancho que el río, y lo coloqué sin calcular el eje del río | El agua siempre sale del terreno, no de los sprites; el puente se coloca a partir del eje del río y apoya los estribos en ambas orillas |
| 21 | Faro «flotando» | El ancla del sprite estaba ~9 px sobre el suelo (el borde delantero de una base circular queda r/2 por debajo de su centro) y no había zócalo | Anclar siempre al punto de apoyo real + zócalo de roca + sombra de contacto |
| 22 | El visor del navegador no mostraba las actualizaciones | Caché de imágenes y URL que solo cambiaba al republicar | El visor recarga cada imagen con un parámetro nuevo cada 4 s y muestra la hora de la última publicación |
| 23 | Generar la escena tardaba ~1 min | Cada árbol se creaba desde cero | Caché de sprites por tipo y semilla (de 58 s a 15 s) |
| 24 | La muestra era una sola imagen | Se me olvidó que el mundo debe estar vivo | **La animación se diseña desde el principio:** todo ciclo cierra en bucle (agua, humo, barcos, banderas, fuente, llamas, ciudadanos, animales, haz del faro) |
| 9 | Código de borrador con restos (`if False`, expresiones sin sentido) | Escribir rápido sin reabrir | Reescribir limpio en cuanto se detecta; no acumular «parches» |

## Lo añadido por petición del usuario durante el trabajo
- Registro continuo de logros y fallos (este documento).
- Visor en el navegador que se regenera (`publicar.py`).
- Ciudadanos **de ambos géneros** (10 tipos) y más detalle para identificarlos.
- **Criaturas mitológicas** para la civilización: minotauro, centauro y sátiro.
- Animales de granja (vacas, caballos, ovejas…).

## Decisiones que conviene recordar
- **Viabilidad (consultada por el usuario):** el pixel art generado por código es viable y es el camino realista si no hay arte 3D disponible. Coste real: el arte, no el rendimiento.
- **Construcción libre:** los sprites se colocan en coordenadas libres con orden por profundidad y z-test contra el relieve; la rejilla de tiles solo sirve de guía. Limitaciones: huella y orientación de cada edificio (girar = 4 versiones del sprite).
- **LOD por zoom (idea del usuario):** 3 niveles con arte distinto, porque escalar a medias rompe el pixel art: *cerca* detalle completo (tile 32×16), *medio* sprites simplificados (16×8) y ciudadanos como puntos, *lejos* mapa estratégico de iconos. Los generadores paramétricos producen las versiones simples casi gratis.
- **Escena a 960×540 base** (×2 = 1080p): más mundo por pantalla sin tocar el tamaño de los sprites.

## Lecciones de producción (para el proyecto real en pixel art)
- **El coste es el arte, no el motor.** Cada edificio necesita varias etapas de obra dibujadas (R22); aquí un solo edificio grande (templo) son ~300 líneas de geometría y varias iteraciones visuales.
- Hace falta **un generador paramétrico por tipología** (casa, torre, almacén…) para variar sin redibujar; las texturas por función lo permiten.
- **Cada sprite debe revisarse ampliado ×8 y también a tamaño real** dentro de la escena.
- Mantener **una sola dirección de luz** desde el principio evita retoques masivos.
- **Resolución base 480×270 con edificios de 2×2 tiles (64 px de ancho)** deja poco sitio: la ciudad densa del concepto exige o zoom-out con sprites más pequeños o un LOD de arte.
