# Selección múltiple y órdenes a ejércitos (R51, R60)

> Resumen para implementar P5. Diseño completo: `.claude/docs/pivote-pixel-art.md` §5. Depende de la rejilla de `colisiones.md` (navegación y huecos libres para formaciones).

## 1. Ratón estilo RTS (R60 — sustituye el arrastre izquierdo de R15)

- **Izquierdo** sobre el vacío, arrastrando = **caja de selección** (borde dorado discontinuo animado).
- **Izquierdo** sobre una unidad, manteniendo ≥ 250 ms o moviendo > 4 px = **cogerla** (ficha de ciudadano, `ciudadanos.md`); no choca con la caja porque el gesto es distinto.
- **Botón central / WASD / bordes de pantalla** = mover la cámara (`camara.md`).
- **Derecho** = órdenes sobre la selección actual.

## 2. Qué se puede seleccionar

Unidades, animales y edificios. Selección por **máscara de píxeles del sprite** (con tolerancia) + *hash* espacial; funciona con zoom y desplazamiento.

- **Clic** = la entidad más cercana al cursor, prioridad **unidad > animal > edificio > suelo**.
- **Mayús/Ctrl + clic** añade o quita de la selección.
- **Doble clic** = todas las del mismo tipo/oficio visibles en pantalla.
- **Ctrl+1…9** guarda un grupo; **1…9** lo recupera (doble pulsación centra la cámara en él).
- **Esc** o clic en el vacío deselecciona.

## 3. Feedback visual

Anillo elíptico bajo los pies de cada seleccionado, contador («×12»), panel de grupo con miniaturas (clic en una = dejar solo esa), resaltado al pasar el ratón por encima.

## 4. Órdenes (botón derecho)

- Mover al punto señalado; con soldados, **formaciones** (línea, columna, cuña, cuadro) calculadas con los huecos libres de la rejilla de ocupación — la velocidad del grupo es la del más lento.
- Atacar-mover, patrullar, parar, mantener posición.
- **Mayús** encadena puntos de ruta.
- Cada unidad navega con el sistema de `colisiones.md` §3 (un líder + desplazamientos del resto).

## 5. Pruebas Vitest obligatorias

1. Caja de selección con N entidades (bordes, solapes de sprites).
2. Prioridad unidad > animal > edificio > suelo en el clic simple.
3. Grupos: guardar, recuperar, centrar cámara a la segunda pulsación.
4. Formación calculada sin solapes ni celdas bloqueadas (usa `puedeColocar`/rejilla de `colisiones.md`).
