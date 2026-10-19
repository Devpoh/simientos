# Construcción libre y progresiva

> Fuente: `prompts/direccion-artistica.md` §2 y §4 (literal). Requisitos R17, R21 y R22. **Innegociable:** sin hexágonos ni casillas.

## 1. Colocación libre (hecho en A6a)

- **Ubicación:** `{x, z, giro}` (tipo `Ubicacion` en `logic/sim/tipos.ts`; `giro` en radianes). Las celdas hexagonales del mapa siguen existiendo pero solo como datos del terreno (`celdaEn`).
- **Huella y pendiente máxima por tipo** (`tuning.edificios.<tipo>.huella` y `.pendienteMax`; rectángulo `ancho × fondo` centrado en `x, z` y girado `giro`):

  | Edificio | Huella (ancho × fondo) | Pendiente máx. |
  |---|---|---|
  | choza | 0.55 × 0.55 | 0.45 |
  | casa | 0.8 × 0.7 | 0.35 |
  | almacén | 1.3 × 0.9 | 0.3 |
  | campo | 1.6 × 1.1 | 0.15 |
  | palmeral | 1.3 × 1.3 | 0.25 |
  | pesca | 0.7 × 0.55 | 0.45 |
  | adobería | 1.0 × 0.8 | 0.3 |
  | alfar | 0.85 × 0.85 | 0.35 |
  | canal | 0.4 × 1.6 | 0.25 |
  | dique | 0.5 × 1.6 | 0.4 |
  | templo | 1.6 × 1.6 | 0.2 |

  La pendiente máxima se compara contra el desnivel real bajo la huella (`motivoNoConstruible`, `logic/sim/obras.ts`): el campo (riego) es el más exigente y la choza o la pesca los más tolerantes.
- **Flujo (pendiente, A6b):** elegir edificio → vista previa transparente que sigue al cursor sobre el terreno real → girar (Z/X en pasos de 15°; con Mayús, libre) → clic confirma y **crea una obra** → Esc cancela.
- **Ajuste opcional (pendiente, A6b):** la rejilla invisible y los puntos de referencia (alinear al camino o a un vecino) se activan con una tecla. Nunca son obligatorios.
- **Gestión:** cancelar y suspender ya están (§4); mover, demoler y sustituir quedan pendientes.

### Motivos de rechazo (orden en que se comprueban)

`motivoNoConstruible` (`logic/sim/obras.ts`) devuelve el primero que falla, en este orden — es el motivo que se mostraría en el fantasma rojo (A6b):

1. **`fuera-del-mapa`** — alguna muestra de la huella cae fuera de la rejilla de datos.
2. **`ocupado`** — solapa (SAT con el hueco de `tuning.obras.separacion`) con otra obra o edificio.
3. **`agua`** — alguna muestra de la huella está sobre agua (`aguaEn` no es `NaN`).
4. **`pendiente`** — el desnivel bajo la huella supera `pendienteMax × max(ancho, fondo)`.
5. **`terreno`** — el terreno de la celda central no está en `tuning.edificios.<tipo>.terrenos`.
6. **`poco-fertil`** — solo si el tipo tiene `fertilidadMin` y la celda no llega.
7. **`lejos-del-agua`** — solo si el tipo tiene `distAguaMax` y la celda está más lejos.
8. **`sin-agua-al-lado`** — tipos con `junto: 'agua'` (p. ej. pesca) sin agua en el alcance (`tuning.obras.alcanceJunto`).
9. **`sin-arcilla-al-lado`** — tipos con `junto: 'arcilla'` (p. ej. adobería) sin una celda con recurso de arcilla en ese alcance.

## 2. Caminos (pendiente, A6c)

- Se trazan con **puntos y curvas** (Catmull-Rom) que siguen el relieve. Tipos: senda, camino de tierra y, en la v0.2+, calzada; **puentes** sobre ríos y canales.
- Son una **infraestructura real:** malla con sección y bordes, no una textura pintada. Tienen coste y se construyen como obra.
- **En la simulación:** caminar por ellos es más rápido (senda ×1,5, camino ×2) y algunos edificios necesitan acceso. Las plazas son áreas libres que se dibujan.

## 3. Relieve

Cada tipo tiene una **tolerancia de pendiente** (`pendienteMax`, tabla de §1). Preparar el terreno (nivelar una huella) es parte de la obra, con su coste en personas-día proporcional al volumen movido — todavía no implementado, la etapa «preparación» (§4) hoy solo consume su fracción de trabajo. No se puede alterar una montaña, un río o la costa sin consecuencias.

## 4. Obras por etapas (hecho en A6a)

Las 5 etapas de obra (`EtapaObra` en `logic/sim/tipos.ts`; la 6.ª es «terminado», que ya es un `Edificio`) piden cada una su fracción del trabajo total y, acumulada, su fracción de los materiales (`tuning.obras.fraccionTrabajo` y `.fraccionMateriales`; las dos suman 1 y `configDesdeTuning` lo valida):

| Etapa | Qué se ve | Fracción de trabajo | Fracción de materiales (acumulada) |
|---|---|---|---|
| 1. Plano | Contorno de la huella sobre el terreno | 0.05 | 0 |
| 2. Preparación | Tierra despejada y nivelada, estacas | 0.15 | 0 |
| 3. Cimientos | Zócalo o base | 0.2 | 0.3 |
| 4. Estructura | Muros o haces que suben **en proporción al progreso** | 0.4 | 0.5 (0.3 + 0.2) |
| 5. Cubierta y acabados | Tejado, puerta, detalles | 0.2 | 1.0 (0.5 + 0.2) |
| 6. Terminado | Edificio en uso (pasa de `Obra` a `Edificio`) | — | — |

**Ejemplo real** (`tests/obras.test.ts`, «dura las personas-día exactas»): una **casa** (`trabajo: 15`) con los 6 constructores que permite `tuning.obras.maxConstructoresPorObra` tarda exactamente **5 días** — `ceil(15×0.05/6) + ceil(15×0.15/6) + ceil(15×0.2/6) + ceil(15×0.4/6) + ceil(15×0.2/6)` = 1+1+1+1+1.

- Las **secuencias son las mismas 5 etapas para todos los tipos**; lo que cambia por tipo son `trabajo` y `materiales` (y por tanto cuánto dura cada etapa). Una secuencia distinta por tipo (p. ej. un templo con terraza y escalinata propias) queda pendiente.
- **Trabajadores:** cada día se reparten los adultos libres entre las obras (las de más `prioridad` primero, luego la más antigua), hasta `tuning.obras.maxConstructoresPorObra` por obra y nunca más de lo que la etapa necesita (`trabajarObras`, `logic/sim/obras.ts`). Portear materiales desde almacenes/canteras de forma visible queda pendiente.
- **Retrasos (`Obra.bloqueo`):** `esperando:<material>`, `sin-trabajadores` o `suspendida`. El motivo se registra como hecho (`obra-detenida`) cuando cambia; mostrarlo en un rótulo sobre la obra es trabajo de A6d.
- **El jugador puede:**
  - **Cancelar** (`cancelarObra`): borra la obra y **devuelve al almacén todo lo entregado** hasta ese momento (no solo una parte).
  - **Suspender** (`suspenderObra`): la obra deja de pedir material y gente (`bloqueo: 'suspendida'`) y sigue donde estaba al reanudar.
  - **Priorizar** (`priorizarObra`): un número mayor recibe constructores y material antes que las demás (a igual prioridad, gana la obra más antigua).
- **Con pocos recursos gráficos:** si un modelo solo viene terminado, las etapas se hacen con piezas modulares (andamio, montones de material, el modelo recortado por altura con un plano de corte, o partes que aparecen). Lo provisional se dice como tal. (Pendiente, A6d.)

## 5. Fundación libre (hecho en A6a)

`fundarAsentamiento` (`logic/sim/obras.ts`) coloca el primer almacén y una choza por hogar sin usar ninguna celda como «la casilla de inicio»:

- Busca, entre las celdas a una casilla de agua dulce (`distAgua === 1`), la de más suelo fértil de llanura alrededor (en el radio `tuning.obras.radioFundacion`) donde el almacén quepa (`puedeConstruir`).
- Reparte las chozas con un sorteo (semillado, por hogar) de ángulo y distancia dentro de ese mismo radio, con giro libre, descartando los puntos donde no quepan.
- Nada queda sobre el agua ni solapado (lo comprueban los tests de «fundación libre» con 10 semillas distintas).

## 6. Estado del código (19-10, tras A6a)

- **Hecho, lógica pura con tests (`logic/sim/obras.ts`, `tests/obras.test.ts`):** ubicación libre `{x, z, giro}` con huella y pendiente por tipo, los 9 motivos de rechazo, las 5 etapas con su fracción de trabajo y materiales, cancelar, suspender, priorizar y la fundación libre.
- **Pendiente:**
  - **A6b** — vista previa transparente que sigue al cursor, giro con teclado y confirmación/cancelación con el ratón.
  - **A6c** — caminos (trazado con curvas, coste y acceso en la simulación).
  - **A6d** — etapas visibles (maquetas o piezas modulares por etapa) y la UI de obra (rótulo de bloqueo, cancelar/suspender/priorizar desde la interfaz).
