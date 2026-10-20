# Estilo: pixel art propio (R49, R56)

> Sustituye a `gdd/arte.md` (comparativa 3D/pixel, borrada en el pivote del 20-10). Base técnica completa: `.claude/docs/pivote-pixel-art.md` §2–§3. Fuente del estilo: `prototypes/imperium-muestra/` (prototipo cerrado el 20-10, veredicto **SEGUIR**) y, de `docs/prompts/direccion-artistica.md` (texto del usuario, 19-10), solo lo que sigue valiendo en 2D: ver §1.

## 1. Normas de estilo aprobadas (no se discuten sin permiso del usuario)

- **Técnico:** resolución base 960×540, escalado solo por enteros (×2 = 1080p, ×4 = 4K), `pixelArt: true`, filtro *nearest*, `roundPixels`. Isométrica 2:1, tile 32×16, ciudadanos 16×24.
- **Luz:** una sola fuente desde la izquierda — caras izquierdas cálidas, derechas frías, sombras proyectadas hacia la derecha («hora dorada»). Nunca luces múltiples ni contraluz.
- **Contorno:** selectivo, del color del vecino oscurecido 2–3 tonos en su rampa; nunca negro puro.
- **Paleta:** cerrada, 59 colores en 14 rampas (`tools/arte-pixel/paleta.py`); todo se dibuja con `c(rampa, tono)`. Sin antialiasing; dithering solo en degradados (agua profunda, bruma). No se añaden colores sin permiso de A (máx. 64).
- **Composición y legibilidad** (del prompt original del usuario, válido en 2D): mejor un estilo sencillo bien ejecutado, con buena composición, colores equilibrados y edificios reconocibles, que mucho detalle que no combina. La legibilidad manda sobre el realismo — si un efecto no ayuda a distinguir edificio, relieve, vegetación o camino, no vale la pena.
- **Pixel art «de 2026», no de 1990:** rampas con tinte (sombra violeta-azul, luz dorada), texturas por función en coordenadas de la cara (tejas, sillares, estuco), nada de ruido aleatorio en superficies lisas.

## 2. Lista de aceptación de todo sprite nuevo (antes de darlo por bueno)

1. Mirar **todas** las poses, orientaciones y etapas — ampliado ×8 y a tamaño real dentro de la escena (R12).
2. Tejados a dos aguas con **ambos faldones** (el trasero en sombra); frontón alineado con el borde del tejado.
3. Ancla en el **punto de apoyo real** (p. ej. una torre circular baja r/2 por delante de su centro); zócalo y sombra de contacto.
4. El agua sale del terreno, nunca del sprite; barcos solo con `agua_valida()`; puentes con el eje del río y estribos en ambas orillas.
5. Cargas y herramientas ancladas a las manos, nunca flotando junto a la cabeza.
6. Oficios distinguibles por **silueta y contraste de color**, no solo por forma; hombres y mujeres.
7. Animales y criaturas: anatomía por polígonos y proporciones reales; estilo de criaturas = versión 1 (aprobada, no cambiar).
8. Sin colores fuera de paleta, sin antialiasing, ampliación exacta (`npm run arte:verificar`).
9. Espacio entre estructuras: calles ≥ 2 tiles las principales, ≥ 1,2 las travesías, ≥ 2 tiles entre manzanas.
10. Todo lo vivo cierra en bucle (agua, humo, banderas, llamas, ciudadanos, animales).
11. **El estilo lo valida el usuario con un boceto pequeño antes de una familia entera.** Una vez aprobado, no se cambia.

## 3. Fallos ya cometidos en el prototipo (no repetirlos)

Tabla completa con síntoma/causa: `prototypes/imperium-muestra/README.md`. Los reutilizables para producción:

| Fallo | Solución que ya aplicamos |
|---|---|
| Tejado dibujado solo por delante (casas y templo) | Dibujar siempre **ambos faldones**, el trasero en sombra (regla §2.2) |
| Objetos flotando (faro, cargas junto a la cabeza) | Anclar al punto de apoyo real + zócalo; cargas ancladas a las manos |
| Barcos y puentes colocados a ojo | `agua_valida()` obligatorio; puente a partir del eje del río |
| Ciudadanos poco distinguibles (un solo molde, piel y ropa parecidas) | Doble molde (pantalón/falda), contraste de color por oficio y género |
| Pendientes pintadas como pared por un umbral de altura demasiado bajo | Exigir gradiente alto (*steep*), no solo diferencia de altura |
| Cambié el estilo de las criaturas 3 veces sin boceto previo | Un boceto pequeño validado por el usuario antes de la familia completa (§2.11) |
| Casas pegadas (resolución base 480×270 con huecos insuficientes) | Base a 960×540; calles ≥ 2 tiles, ≥ 1,25 entre manzanas (regla §2.9) |

## 4. Pipeline de producción

Generadores Python en `tools/arte-pixel/` (copiados del prototipo) → `npm run arte` escribe **atlas PNG + JSON** (ancla de pies, huella en tiles, frames/etapas/orientaciones) en `public/recursos/pixel/` → `npm run arte:verificar` comprueba paleta y ampliación exacta → skill `sprite-qa` antes de cada commit. **El juego no genera arte en ejecución: solo carga el atlas.** Inventario real: `docs/recursos/catalogo.md`.
