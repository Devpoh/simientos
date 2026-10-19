# Prototipo: pixel art para CIMIENTOS

**Pregunta:** ¿qué calidad gráfica se consigue en pixel art para una ciudad-estado sumeria, con terreno continuo y cámara libre? (R44, R45)

**Cómo verlo:** `npm install && npm run dev -- --port 5180` → http://localhost:5180 · WASD, flechas o arrastrar para mover la cámara · rueda para el zoom (×1–×6).

**Estado:** cerrado el 19-10 a petición del usuario («seguimos con el proyecto de verdad»).

## Qué hay
- v1 (descartada): isométrico con casillas. Se notaba la rejilla, lo que choca con R20.
- v2: vista cenital 3/4 y mundo continuo de 1600×1100 px, pintado píxel a píxel:
  - relieve con sombreado y riscos;
  - costa con espuma animada y un río con meandros;
  - campos girados con acequias, caminos curvos y una plaza enlosada.
- Sprites procedurales con contorno selectivo y sombras proyectadas: casas de adobe (5 tipos de azotea), zigurat con tres escalinatas y santuario de azulejo, palmeras, árboles, cañas, puestos, graneros, torres, muelles, barcas y gente.
- Vida: 70 caminantes con oclusión detrás de las casas, barcas con estela, humo, gaviotas y sombras de nubes.

## Veredicto: CAMBIAR (sin decidir)
- Funciona: la v2 se lee bien, es cálida y continua, y aguanta R20 y R21 (colocación libre).
- Pendiente para decidir el estilo en A7:
  - la vista 3/4 fija no permite el giro de cámara de C1;
  - cada edificio necesita sus 6 etapas de obra (R22) dibujadas;
  - el coste de producción del arte es alto.
- Si se elige pixel art, se rehace en el juego con estándares de producción, sin copiar este código.

## Opinión del usuario (19-10, R47)
- **Le gustó:** el agua (espuma que respira en la orilla, olas que llegan a la costa y destellos a saltos). Es reutilizable como referencia para el agua 3D.
- **No le gustó:** las casas, los humanos y las barcas pasando por encima de la tierra (las rutas elípticas no comprueban el agua). Se ve «juego de 1990».
- **Decisión:** el 3D es la vía principal. El pixel art queda como plan B y, si se retoma, tiene que verse como un juego de 2026.
