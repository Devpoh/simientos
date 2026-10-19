# Construcción libre y progresiva

> Fuente: `prompts/direccion-artistica.md` §2 y §4 (literal). Requisitos R17, R21 y R22. **Innegociable:** sin hexágonos ni casillas.

## 1. Colocación libre

- **Datos de un edificio:** `x`, `z` (continuos), `giro` y **huella** (rectángulo `ancho × fondo` por tipo, en `tuning.edificios`). Los hexágonos (o celdas) del mapa son solo datos del terreno.
- **Flujo:** elegir edificio → vista previa transparente que sigue al cursor sobre el terreno real → girar (Z/X en pasos de 15°; con Mayús, libre) → clic confirma y **crea una obra** → Esc cancela.
- **Validez**, con el motivo siempre a la vista:
  - **Solape:** contra otras huellas y caminos (SAT, `logic/geometria2d.ts`).
  - **Terreno:** permitido en todas las muestras de la huella (sin agua, etc.).
  - **Pendiente:** el desnivel máximo bajo la huella depende del tipo (choza tolerante, templo exigente).
  - **Requisitos:** agua o arcilla a distancia real, y acceso a un camino cuando el tipo lo pide.
  - **Distancias mínimas** justificadas por el tipo (p. ej., el horno, lejos de las chozas de caña).
- **Ajuste opcional:** la rejilla invisible y los puntos de referencia (alinear al camino o a un vecino) se activan con una tecla. Nunca son obligatorios.
- **Gestión:** mover (si aún es obra), demoler (devuelve parte del material) y sustituir.

## 2. Caminos

- Se trazan con **puntos y curvas** (Catmull-Rom) que siguen el relieve. Tipos: senda, camino de tierra y, en la v0.2+, calzada; **puentes** sobre ríos y canales.
- Son una **infraestructura real:** malla con sección y bordes, no una textura pintada. Tienen coste y se construyen como obra.
- **En la simulación:** caminar por ellos es más rápido (senda ×1,5, camino ×2) y algunos edificios necesitan acceso. Las plazas son áreas libres que se dibujan.

## 3. Relieve

Cada tipo tiene una **tolerancia de pendiente**. Preparar el terreno (nivelar una huella) es parte de la obra, con su coste en personas-día proporcional al volumen movido. No se puede alterar una montaña, un río o la costa sin consecuencias.

## 4. Obras por etapas

| Etapa | Qué se ve | Qué la hace avanzar |
|---|---|---|
| 1. Plano | Contorno de la huella sobre el terreno | Confirmar la obra |
| 2. Preparación | Tierra despejada y nivelada, estacas | Personas-día (más si hay que nivelar) |
| 3. Cimientos | Zócalo o base | Personas-día + primer material |
| 4. Estructura | Muros o haces que suben **en proporción al progreso** | Material entregado + personas-día |
| 5. Cubierta y acabados | Tejado, puerta, detalles | Último material + personas-día |
| 6. Terminado | Edificio en uso | — (solo aquí funciona) |

- Las **secuencias dependen del tipo**. Una choza de caña: plano → preparación → estructura de haces → cubierta. Un templo añade terraza y escalinata.
- **Trabajadores y materiales:** los constructores caminan hasta la obra y los porteadores (o carretas) llevan el material desde almacenes o canteras. El avance es real (`logic/sim/obras.ts`); lo visual solo lo refleja.
- **Retrasos:** `esperando:<material>`, `sin-trabajadores`, `sin-acceso`… El motivo aparece en un rótulo sobre la obra y en el inspector.
- **El jugador puede:** cancelar (recupera parte), suspender (libera trabajadores) y priorizar (recibe antes brazos y material).
- **Con pocos recursos gráficos:** si un modelo solo viene terminado, las etapas se hacen con piezas modulares (andamio, montones de material, el modelo recortado por altura con un plano de corte, o partes que aparecen). Lo provisional se dice como tal.

## 5. Estado del código (19-10)

- **Ya hecho, lógica pura con tests:** etapas cimientos → materiales → trabajo, bloqueos y personas-día (`logic/sim/obras.ts`) y geometría 2D (`logic/geometria2d.ts`).
- **Pendiente:** pasar edificios y obras de `hex` a `x`, `z`, `giro` y huella; las 6 etapas visuales; caminos; colocación con el ratón; cancelar, suspender y priorizar. Fase **A6**.
