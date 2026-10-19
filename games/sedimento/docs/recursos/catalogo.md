# Catálogo de recursos gráficos

Registro de R25. Un bloque por paquete, con los 13 campos pedidos. **Popularidad:** solo con la fuente y la fecha de la consulta; si no está verificada, se pone «sin verificar». **Estado:** `aprobado` (licencia verificada y estética evaluada) · `pendiente` (falta verificar algo) · `descartado` (con el motivo) · `referencia` (solo para comparar, no se integra). **Valoración:** impresión de C, siempre marcada «(C, provisional)» — la evaluación artística final la hace el usuario en el laboratorio visual.

Consultado el 2026-10-19. 17 paquetes evaluados (mínimo pedido: 15).

## Resumen

| # | Paquete | Fuente | Licencia | Precio | Estado |
|---|---|---|---|---|---|
| 1 | Nature Kit 2.1 | Kenney | CC0 | Gratis | pendiente (ya descargado, falta evaluación estética) |
| 2 | Medieval Hexagon Pack 1.0 | KayKit (GitHub/itch.io) | CC0 | Gratis | pendiente (ya descargado, falta evaluación estética) |
| 3 | Modelos propios | Sesiones A/B | Propio | — | referencia |
| 4 | Survival Kit | Kenney | CC0 | Gratis | pendiente |
| 5 | Castle Kit | Kenney | CC0 | Gratis | pendiente |
| 6 | Pirate Kit | Kenney | CC0 | Gratis | pendiente |
| 7 | Fantasy Town Kit 2.0 | Kenney | CC0 | Gratis | descartado (estética medieval-fantástica, no sumeria) |
| 8 | Medieval Village MegaKit (Standard) | Quaternius (itch.io) | CC0 | Gratis | pendiente (estética medieval, no sumeria; útil como referencia modular) |
| 9 | Texturas CC0 (biblioteca) | Poly Haven | CC0 | Gratis | pendiente (11 texturas ya descargadas, ver `recursos-sin-revisar/texturas/`) |
| 10 | Texturas PBR (biblioteca) | ambientCG | CC0 | Gratis | pendiente (no usado todavía; Poly Haven cubrió todos los usos) |
| 11 | **Ancient Buildings 5: Akkadian and Babylonian sprites** ★ | Beelim Solutions (itch.io) | Sin regalías + crédito solicitado (no CC0) | 1,35 USD | pendiente (el mejor encaje estético encontrado para Sumer) |
| 12 | Ancient Buildings 4: Egyptian and Levantine sprites | Beelim Solutions (itch.io) | Sin regalías + crédito solicitado (no CC0) | 1,28 USD | pendiente (complementa al 11) |
| 13 | Mesopotamian Tombs | ACTG (itch.io) | CC0 | Gratis | pendiente (muy pequeño: un único PNG de 29 kB) |
| 14 | Villagers Sprite Sheets Free Pixel Art Pack | Free Game Assets / Craftpix (itch.io) | Licencia de archivo de Craftpix (sin verificar el texto) | Gratis | pendiente (estética medieval genérica, no sumeria) |
| 15 | Superpowers Asset Packs | GitHub (sparklinlabs) | CC0-1.0 (confirmado por la API de GitHub) | Gratis | pendiente (2D variado, no especializado en Sumer) |
| 16 | Free-Game-Dev-Assets (catálogo) | GitHub (TMHSDigital) | No es un paquete: cada fuente listada tiene su propia licencia | Gratis | referencia (para descubrir más fuentes) |
| 17 | [LPC] Desert Ruins | OpenGameArt (bluecarrot16) | OGA-BY 3.0+ / CC-BY 3.0+ / GPL 2.0+ | Gratis | pendiente (ruinas egipcias en pixel art, exige atribución) |

★ = candidato más prometedor para la estética sumeria encontrado en esta ronda.

---

## 1. Nature Kit 2.1
- **Autor:** Kenney · **Enlace:** https://kenney.nl/assets/nature-kit
- **Tipo · formatos:** 3D low-poly · GLB, FBX, OBJ, DAE, STL (330 archivos)
- **Licencia:** CC0 1.0 (verificada: `License.txt` del zip y ficha de la web, 2026-10-18)
- **Uso comercial:** sí · **Atribución:** no · **Restricciones:** ninguna
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** sí (GLB nativo)
- **Valoración (C, provisional):** muy simple; sirve para prototipos del estilo A. Palmeras, cultivos y rocas aprovechables.
- **Estado:** pendiente (ya descargado en `public/modelos/kenney-nature/`, 45 archivos; no se usa en la escena del juego)

## 2. Medieval Hexagon Pack 1.0
- **Autor:** Kay Lousberg (KayKit) · **Enlace:** https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0 · https://kaylousberg.itch.io/kaykit-medieval-hexagon
- **Tipo · formatos:** 3D estilizado con atlas de degradados · glTF, OBJ
- **Licencia:** CC0 (verificada: ficha de la Godot Asset Library 2900, 2026-10-18)
- **Uso comercial:** sí · **Atribución:** no · **Restricciones:** ninguna
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** sí
- **Valoración (C, provisional):** las obras por etapas (andamio, etapas A/B/C) son muy útiles para la demo de construcción progresiva. Los edificios son medievales y no valen para Sumer.
- **Estado:** pendiente (ya descargado en `public/modelos/kaykit-hex/`, 26 modelos; decorado de F01f)

## 3. Modelos propios
- **Autor:** Sesiones A y B · **Enlace:** este repositorio
- **Tipo · formatos:** 3D low-poly procedural · GLB exportado (`npm run modelos`)
- **Licencia:** propio · **Uso comercial:** — · **Atribución:** — · **Restricciones:** —
- **Popularidad:** —
- **Compatibilidad three.js/glTF:** sí
- **Valoración (C, provisional):** choza (mudhif), almacén, palmeras, árboles, coníferas, rocas — la base actual del estilo A.
- **Estado:** referencia · **Usado en:** `public/modelos/propios/`

## 4. Survival Kit
- **Autor:** Kenney · **Enlace:** https://kenney.nl/assets/survival-kit
- **Tipo · formatos:** 3D low-poly · formatos no confirmados en la ficha (zip de descarga)
- **Licencia:** CC0 (verificada: ficha de OpenGameArt, 2026-10-19 — "credit 'Kenney.nl' ... this is not mandatory")
- **Uso comercial:** sí · **Atribución:** no (opcional) · **Restricciones:** ninguna
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** probable (los paquetes Kenney 3D suelen incluir glTF; sin confirmar en este paquete)
- **Valoración (C, provisional):** estructuras, herramientas y recursos genéricos de supervivencia; puede aportar piezas de taller o almacén modestas.
- **Estado:** pendiente (no descargado)

## 5. Castle Kit
- **Autor:** Kenney · **Enlace:** https://kenney.nl/assets/castle-kit
- **Tipo · formatos:** 3D · formato no confirmado en la ficha (zip `kenney_castle-kit.zip`, 75 archivos)
- **Licencia:** CC0 (verificada: enlace a creativecommons.org/publicdomain/zero/1.0/ en la propia ficha, 2026-10-19)
- **Uso comercial:** sí · **Atribución:** no · **Restricciones:** ninguna
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** probable, sin confirmar
- **Valoración (C, provisional):** murallas, torres y fortificaciones son medievales europeas; no encajan con Sumer salvo como referencia de modularidad para murallas.
- **Estado:** pendiente · preview guardado en `recursos-sin-revisar/previews/kenney-castle-kit.png`

## 6. Pirate Kit
- **Autor:** Kenney · **Enlace:** https://kenney.nl/assets/pirate-kit
- **Tipo · formatos:** 3D low-poly · formato no confirmado (zip de descarga)
- **Licencia:** CC0 (verificada: repost de GameDev.net y ficha de OpenGameArt, 2026-10-19)
- **Uso comercial:** sí · **Atribución:** no · **Restricciones:** ninguna
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** probable, sin confirmar
- **Valoración (C, provisional):** barcos y elementos costeros reutilizables para un puerto fluvial, aunque el estilo es caribeño/colonial, no mesopotámico.
- **Estado:** pendiente · preview guardado en `recursos-sin-revisar/previews/kenney-pirate-kit.png`

## 7. Fantasy Town Kit 2.0
- **Autor:** Kenney · **Enlace:** https://kenney.nl/assets/fantasy-town-kit
- **Tipo · formatos:** 3D · formato no confirmado (zip, 160 archivos)
- **Licencia:** CC0 (verificada: ficha de la web, 2026-10-19)
- **Uso comercial:** sí · **Atribución:** no · **Restricciones:** ninguna
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** probable, sin confirmar
- **Valoración (C, provisional):** muros y casas de temática medieval-fantástica (remake 2024); no encaja con una civilización sumeria antigua.
- **Estado:** descartado (estética incoherente con R20/R25) · preview guardado en `recursos-sin-revisar/previews/kenney-fantasy-town-kit.png`

## 8. Medieval Village MegaKit (versión Standard, gratuita)
- **Autor:** Quaternius · **Enlace:** https://quaternius.itch.io/medieval-village-megakit
- **Tipo · formatos:** 3D modular (300+ piezas, 176 en la versión Standard gratuita) · FBX, OBJ, glTF
- **Licencia:** CC0 (citado en la ficha de OpenGameArt y en la página de Quaternius, 2026-10-19)
- **Uso comercial:** sí · **Atribución:** no · **Restricciones:** ninguna (la versión Source de pago añade integración en motores, no aplica a la versión gratuita)
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** sí (incluye glTF)
- **Valoración (C, provisional):** la Licencia de Quaternius (consultada aparte, ver nota) permite uso comercial sin atribución pero prohíbe redistribuir los modelos como paquete de assets independiente — no afecta a su uso dentro del juego. Estéticamente es medieval europeo, no sumerio; útil solo como referencia de pipeline modular (paredes, techos, vigas combinables).
- **Estado:** pendiente

> Nota de licencia general de Quaternius (https://quaternius.com/license.html, verificada 2026-10-19): «No attribution is required» para uso comercial; prohíbe «extract, repackage, sublicense, sell, or otherwise redistribute the Assets ... as a standalone asset, asset pack, stock file, template, or similar product», incluso combinados con otros assets.

## 9. Poly Haven — biblioteca de texturas y HDRI CC0
- **Autor:** Poly Haven · **Enlace:** https://polyhaven.com
- **Tipo · formatos:** texturas PBR (difusa/normal GL/rugosidad) y HDRI · JPG/PNG/EXR, HDR
- **Licencia:** CC0 1.0 (ficha de la propia web)
- **Uso comercial:** sí · **Atribución:** no · **Restricciones:** ninguna
- **Popularidad:** sin verificar (biblioteca, no un paquete único)
- **Compatibilidad three.js/glTF:** sí (JPG estándar para `THREE.TextureLoader`, HDR para `RGBELoader`)
- **Valoración (C, provisional):** fuente principal usada para las 11 texturas de terreno/edificios ya descargadas (hierba, hierba seca, arena, barro, tierra seca, roca, nieve, grava, adobe, caña, madera); calidad fotográfica alta, encaja con el estilo B (3D con texturas).
- **Estado:** pendiente (texturas descargadas en `recursos-sin-revisar/texturas/`, con `LICENSE.txt` por carpeta; a la espera de que se elija el estilo B en el laboratorio)

## 10. ambientCG — biblioteca de texturas PBR
- **Autor:** ambientCG · **Enlace:** https://ambientcg.com
- **Tipo · formatos:** texturas PBR · JPG/PNG/EXR
- **Licencia:** CC0 1.0 (ficha de la propia web)
- **Uso comercial:** sí · **Atribución:** no · **Restricciones:** ninguna
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** sí
- **Valoración (C, provisional):** no se ha usado todavía porque Poly Haven ya cubrió los 11 usos pedidos con buena calidad; queda como fuente alternativa o de respaldo si algún material de Poly Haven se descarta en el laboratorio.
- **Estado:** pendiente (no descargado)

## 11. Ancient Buildings 5: Akkadian and Babylonian sprites ★
- **Autor:** Beelim Solutions · **Enlace:** https://beelim-solutions.itch.io/ancient-buildings-5-akkadian-and-babylonian-sprites
- **Tipo · formatos:** renders isométricos pre-renderizados (sprites 2D) · ZIP de imágenes (16 MB; los archivos fuente 3D se venden aparte en CGTrader)
- **Licencia:** no es CC0. Cita textual de la ficha: «We charge no royalties on our works» y «Please credit [Beelim Solutions] as the source of any and all of your files» (crédito pedido como cortesía, no como condición explícita)
- **Uso comercial:** sí (regalías no cobradas; no se indica restricción comercial explícita) · **Atribución:** solicitada, no obligatoria según el texto · **Restricciones:** no se venden los archivos fuente 3D, solo los renders
- **Precio:** 1,35 USD o más
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** no aplica (son sprites 2D pre-renderizados, no modelos 3D ni glTF); servirían para un estilo C/D (pixel art o 2.5D), no para el estilo B de three.js actual
- **Valoración (C, provisional):** **el mejor encaje estético encontrado para Sumer en esta ronda.** La vista previa muestra un zigurat escalonado con rampa y una torre con muralla, en tonos arena/adobe muy coherentes con Mesopotamia. Recomiendo que el usuario lo revise en el laboratorio visual antes de comprarlo (1,35 USD, bajo coste).
- **Estado:** pendiente · preview guardado en `recursos-sin-revisar/previews/beelim-set5-akkadian-babylonian.jpg`

## 12. Ancient Buildings 4: Egyptian and Levantine sprites
- **Autor:** Beelim Solutions · **Enlace:** https://beelim-solutions.itch.io/ancient-buildings-4-egyptian-and-levantine-sprites
- **Tipo · formatos:** renders isométricos pre-renderizados (sprites 2D) · ZIP de imágenes
- **Licencia:** mismos términos que el Set 5 (sin regalías, crédito solicitado, no obligatorio)
- **Uso comercial:** sí · **Atribución:** solicitada, no obligatoria · **Restricciones:** no se venden los archivos fuente 3D
- **Precio:** 1,28 USD o más
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** no aplica (sprites 2D)
- **Valoración (C, provisional):** complementa al Set 5 con un templo con columnas, una estructura con rampa y una torre con muralla curva; útil si se quiere variedad egipcia/levantina además de la mesopotámica.
- **Estado:** pendiente · preview guardado en `recursos-sin-revisar/previews/beelim-set4-egyptian-levantine.jpg`

## 13. Mesopotamian Tombs
- **Autor:** ACTG · **Enlace:** https://actg.itch.io/mesopotamian-tombs
- **Tipo · formatos:** tileset de pixel art · PNG (un único archivo, 29 kB)
- **Licencia:** CC0 1.0 (ficha de la propia página)
- **Uso comercial:** sí (implícito por CC0) · **Atribución:** no · **Restricciones:** ninguna
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** no aplica (tileset 2D)
- **Valoración (C, provisional):** muy pequeño y genérico («blocks and background blocks» de tumbas), no es un paquete de edificios de ciudad; solo sirve como material de relleno gratuito de bajo valor, no como pieza central.
- **Estado:** pendiente (candidato débil; no descargado todavía)

## 14. Villagers Sprite Sheets Free Pixel Art Pack
- **Autor:** Free Game Assets / Craftpix · **Enlace:** https://free-game-assets.itch.io/villagers-sprite-sheets-free-pixel-art-pack
- **Tipo · formatos:** sprites de personaje animados · PNG, hojas de sprites de 48 px de alto
- **Licencia:** licencia de archivo de Craftpix (https://craftpix.net/file-licenses/); el autor respondió «Yes, of course» sobre uso comercial en un comentario, pero el texto legal no se verificó directamente
- **Uso comercial:** sin verificar con certeza (respuesta informal del autor, no el texto de la licencia) · **Atribución:** sin verificar · **Restricciones:** sin verificar
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** no aplica (sprites 2D)
- **Valoración (C, provisional):** animaciones (ataque, muerte, daño, reposo, caminar) útiles para trabajadores genéricos, pero el estilo es campesino medieval genérico, no sumerio.
- **Estado:** pendiente (falta verificar el texto legal de Craftpix antes de aprobar)

## 15. Superpowers Asset Packs
- **Autor:** sparklinlabs (GitHub) · **Enlace:** https://github.com/sparklinlabs/superpowers-asset-packs
- **Tipo · formatos:** recursos 2D variados · variado (repositorio de GitHub)
- **Licencia:** CC0-1.0 (confirmado por el campo `license` de la API de GitHub, consultado 2026-10-19)
- **Uso comercial:** sí · **Atribución:** no · **Restricciones:** ninguna
- **Popularidad:** 1276 estrellas (API de GitHub, 2026-10-19)
- **Compatibilidad three.js/glTF:** no aplica (recursos 2D variados, no un motor ni formato único)
- **Valoración (C, provisional):** repositorio general, no especializado en civilizaciones antiguas; de baja prioridad para SEDIMENTO salvo que se busque algo muy concreto dentro de él.
- **Estado:** pendiente (no explorado en detalle)

## 16. Free-Game-Dev-Assets (catálogo)
- **Autor:** TMHSDigital (GitHub) · **Enlace:** https://github.com/TMHSDigital/Free-Game-Dev-Assets
- **Tipo · formatos:** catálogo de enlaces a otras fuentes (no un paquete de assets en sí)
- **Licencia:** no aplica al catálogo; cada fuente listada dentro tiene su propia licencia, registrada con la fecha en que se consultó
- **Uso comercial:** no aplica · **Atribución:** no aplica · **Restricciones:** no aplica
- **Popularidad:** 55 estrellas (API de GitHub, 2026-10-19; la cifra del usuario era 53, probablemente de una consulta anterior)
- **Compatibilidad three.js/glTF:** no aplica
- **Valoración (C, provisional):** útil como índice para descubrir más fuentes, no como recurso directo.
- **Estado:** referencia

## 17. [LPC] Desert Ruins
- **Autor:** bluecarrot16 (encargado por Pierre Vigier/pvigier) · **Enlace:** https://opengameart.org/content/lpc-desert-ruins
- **Tipo · formatos:** tiles modulares de pixel art (edificios en ruinas) · ZIP (9,1 MB), incluye un mapa de ejemplo en formato Tiled (.tmx)
- **Licencia:** OGA-BY 3.0+ / CC-BY 3.0+ / GPL 2.0+ (listadas en la propia ficha)
- **Uso comercial:** sí (todas las licencias listadas lo permiten) · **Atribución:** sí, obligatoria — texto sugerido: «"[LPC] Desert Ruins" by bluecarrot16. Commissioned by Pierre Vigier (pvigier)» (y crédito adicional a «[LPC] Sand+Rock Alt Colors» si se usan esas tiles de la vista previa) · **Restricciones:** exige atribución, incompatible con un uso que no pueda dar crédito
- **Popularidad:** sin verificar
- **Compatibilidad three.js/glTF:** no aplica (tileset 2D)
- **Valoración (C, provisional):** muros interiores/exteriores, pirámides lisas y escalonadas y estatuas en ruinas; estéticamente más egipcio/greco que sumerio, pero el mejor resultado modular encontrado en OpenGameArt para arquitectura antigua en ruinas.
- **Estado:** pendiente · preview guardado en `recursos-sin-revisar/previews/lpc-desert-ruins.png`

---

## Fuentes investigadas sin paquete concreto aprobado para catalogar

- **itch.io, búsquedas adicionales:** se revisaron paquetes de ciudad isométrica genéricos (Penzilla «Isometric City Builder Pack», Newc42 «Pixel Art Isometric Map Tileset», Oli414 «Pixel City») y de Mesopotamia específicos (JIK-A-4 «Ancient Egypt Tiles», colección curada «babylonian's Collection» — que resultó ser una lista de juegos completos, no de assets). Ninguno superó en encaje estético a los paquetes Beelim Solutions (#11, #12), así que no se catalogó cada uno por separado para no diluir la lista con candidatos débiles. Quedan como posibles búsquedas futuras si el estilo C/D gana peso en el laboratorio.
- **Quaternius, paquetes adicionales:** no se encontró un paquete específico de civilizaciones antiguas/Oriente Próximo en su catálogo; solo colecciones medievales europeas o genéricas de naturaleza.
