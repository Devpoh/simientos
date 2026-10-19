# Dirección artística y Art Direction Lab

> Fuente: `prompts/direccion-artistica.md` (literal). Requisitos R20, R23–R27. Este documento dice **cómo** lo aplicamos y en qué punto estamos.

## 1. Situación (19-10)

- **Estilo: sin decidir.** Se decide en la fase **A7**, con escenas equivalentes en el laboratorio y estos criterios. Hasta entonces, **nada de sistema gráfico definitivo**: el juego usa un render provisional y los experimentos van al laboratorio.
- **Ya fijado:** terreno continuo sin hexágonos visibles (R20), construcción libre y progresiva (`construccion.md`) y cámara (`camara.md`). Esto vale para cualquier estilo.
- **Hipótesis del usuario:** estilo A (3D low-poly) con terreno continuo, con C (pixel art isométrico) como alternativa real que hay que comparar.

## 2. Estilos que se comparan

| | Estilo | Qué es | Riesgo principal que hay que comprobar |
|---|---|---|---|
| **A** | 3D estilizado low-poly | Siluetas claras, colores planos o degradados y buena luz | Que no se vea «barato» de cerca |
| **B** | 3D estilizado con texturas | Adobe, piedra y madera con texturas PBR (Poly Haven, ambientCG); más naturalista, sin buscar el fotorrealismo | Coherencia entre texturas fotográficas y modelos estilizados, y coste por edificio |
| **C** | Pixel art isométrico 2D o 2.5D | Sprites ilustrados | Desniveles, agua, rotación de edificios y construcción libre sin rejilla. Implica cambiar el render a 2D |
| **D** | Híbrido, solo si se justifica | P. ej., 3D con aspecto de ilustración pintada (*toon* o acuarela) | Hay que demostrarlo con un prototipo |

**Criterios** (se puntúan de 1 a 5 por estilo y con la escena delante, no con una imagen promocional): atractivo · coherencia entre edificios, terreno y personajes · recursos gratuitos disponibles · edificios antiguos disponibles · integración en three.js · coste de adaptación · dificultad de producir modelos nuevos · obras por etapas · construcción libre · rendimiento con cientos de edificios y habitantes · lectura con la cámara alejada · personalidad y diferencias entre culturas · coherencia a largo plazo.
**Regla:** no se mezclan estilos incoherentes en una misma escena. Un híbrido se justifica con un prototipo.

## 3. Art Direction Lab: http://localhost:4400/

Es el panel del estudio, ampliado. Se conserva lo que ya funciona (progreso, comandos y modelos). Título: **«SEDIMENTO — Art Direction Lab»**, porque IMPERIUM es el nombre de trabajo de los textos del usuario. Tecnología: el servidor Node actual sin dependencias, HTML y three.js por importmap. Sin frameworks nuevos.

| Sección | Contenido mínimo |
|---|---|
| Inicio | Propósito en dos líneas, accesos a cada sección y estado de la decisión |
| Estilos | Una ficha por estilo: escena o conjunto real, qué hay y **qué falta** (aldea, zona agrícola, almacén, mercado, monumento) |
| Modelos 3D | Tarjetas con miniatura, nombre, categoría, autor, fuente (enlace), licencia comprobada, formato, popularidad (con fuente y fecha), compatibilidad y estado. Visor 3D (girar, acercar, comparar) |
| Pixel art | Edificios, conjuntos, aldeas, personajes, vegetación, recursos, tilesets, interfaz y decoración. Imágenes en máxima calidad y proporción; se distingue imagen completa, hoja de sprites y animación |
| Materiales y naturaleza | Esferas o planos PBR de hierba, arena, barro, piedra, nieve, madera y agua, y qué mapas trae cada material (color, normal, rugosidad, desplazamiento) |
| Construcción progresiva | Demo 3D de las 6 etapas (`construccion.md` §4), indicando qué piezas son provisionales |
| Comparador | La misma aldea (casa, árboles y rocas) en A, B, C y D, lado a lado. Cada pieza etiquetada como **modelo real**, **demo por código** o **referencia**. Favoritos ★ y comentarios guardados en el servidor |

**Técnica:** filtros por estilo, formato y tipo · búsqueda · carga diferida y miniaturas guardadas en local · estados vacíos y de error claros · nada de tarjetas rotas · se distingue «visualizable», «descargado» e «integrado en el juego».

## 4. Recursos e integración

- **Catálogo con licencias:** `docs/recursos/catalogo.md`, con los 13 campos de R25. Sin licencia verificada no hay «aprobado».
- **Archivos:** `public/recursos/<categoría>/<paquete>/`, con su `LICENSE.txt`. Categorías: `terreno`, `edificios`, `construccion`, `personajes`, `animaciones`, `vegetacion`, `rocas`, `agua`, `barcos`, `infraestructura`, `decoracion`, `interfaz`. Las descargas sin evaluar van a `recursos-sin-revisar/`, que está fuera de git.
- **Antes de integrar** se revisan calidad, formato, escala, pivote, materiales, licencia y coherencia. Cada recurso integrado se anota en el catálogo («usado en: …») para poder sustituirlo.

## 5. Rendimiento

El estilo tiene que soportar cientos de edificios y habitantes. Se mide en cada escena del comparador: draw calls, triángulos, MB de texturas y fps. Se usan instancias, LOD o impostores lejanos, atlas de texturas y sombras solo donde aportan.

## 6. Vegetación y decorado (A5b · R46)

El usuario aceptó el estilo del terreno continuo, pero no los árboles, flores y decorado de colores chillones. Se sustituyeron por una paleta sobria, con las referencias de `espertativas/` como meta.

| Elemento | Antes | Ahora |
|---|---|---|
| Palmera datilera | tronco corto y grueso, corona enorme, verdes saturados y dátiles naranja | tronco esbelto de 12 tramos con cicatrices de distinto tono, corona de 12–14 hojas más cortas en dos tonos oliva, dátiles pardos |
| Árbol de bosque (`arbol`) | copa redonda de verde vivo | **tamarisco**: 2–3 troncos finos y torcidos, copa baja y rala de penachos gris verdosos en 2 tonos |
| Arbusto (nuevo) | no existía | matas bajas de verde oliva en colinas, montaña y, rara vez, en la estepa |
| Conifera, caña, matas, rocas | colores saturados | verdes oscuros apagados, paja, arenisca |
| Flores | rojas, amarillas y moradas | eliminadas (`probFlores` y `escalaFlor` ya no existen) |
| Colores de los modelos Kenney | verdes vivos y rojo/amarillo/morado | verdes oliva y tierras (`render.modelos.colores`) |

**Densidad por bioma** (`render.vegetacion`): la vega con río tiene palmerales y cañaverales; la estepa queda casi desnuda (`probMataYerma` 0,12, `probArbustoEstepa` 0,05); las colinas llevan arbustos dispersos (`probArbustoMonte` 0,35); el decorado de arbustos baja a `probArbusto` 0,18.

**Rendimiento:** sigue todo instanciado; draw calls 36–37 (límite 40; el arbusto añade dos).

**Pendiente:** el verde del terreno de la vega (`render.colores`, `paleta.ts`) sigue muy vivo frente a la vegetación sobria; se propone apagarlo en una fase de arte del terreno.
