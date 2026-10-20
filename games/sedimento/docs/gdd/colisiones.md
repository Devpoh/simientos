# Colisiones y ocupación (R50)

> Resumen para implementar P3–P4. Diseño completo: `.claude/docs/pivote-pixel-art.md` §4. **Nada se mueve ni se coloca sin pasar por esta única fuente de verdad** — la muestra (`prototypes/imperium-muestra/`) dibujaba rutas a mano y dejaba pasar ciudadanos por encima de las casas; no se repite.

## 1. Rejilla de ocupación (`logic/ocupacion.ts`, lógica pura y testeada)

- 1 tile = 4×4 subceldas. Capas: **terreno** (agua profunda, acantilado, pendiente máxima), **estructuras** (huella de cada edificio), **objetos** (props, troncos, rocas), **dinámica** (unidades).
- Cada celda: `libre | bloqueada | puerta(edificio) | camino`.
- Cada sprite del atlas trae su **huella** (w×d tiles) y **ancla de pies** (`atlas.json`); la huella bloquea, no el dibujo. Las puertas son celdas especiales: el ciudadano que entra pasa a `dentro` (oculto) y sale por la misma puerta.

## 2. Colocación (construcción libre, R21)

`puedeColocar(huella, x, z, giro)` rechaza solapes con estructuras/objetos, agua, pendiente excesiva y camino reservado; devuelve el **motivo** (se muestra en la UI). Props y decorados respetan huellas; apilar solo con regla explícita (p. ej. andamio sobre obra). Edificar o derribar actualiza la rejilla y **replanifica** las rutas afectadas.

## 3. Navegación

A* (o *flow field* para grupos) sobre la rejilla, coste bajo en calles, suavizado de ruta, evitación local entre unidades. Una unidad **nunca** entra en una celda bloqueada; sin camino, queda en estado `bloqueado` (icono) y avisa.

## 4. Orden de dibujo (y-sort) — D017 (refina al pivote §4.5)

La clave única `u+v` falla cuando una unidad junto a la cara derecha de un edificio queda detrás de él (caso real: persona en (12,5; 11) junto a una casa 2×2 en (10,10)). Regla final:

- **Entre objetos sin huella** (dos unidades, dos props sueltos): clave `u+v` del punto de pies.
- **Entre una unidad y una estructura**: manda la comparación de huellas — **delante** si `u ≥ u_max` o `v ≥ v_max` de la huella, **detrás** si `u ≤ u_min` o `v ≤ v_min`.
- Solo se ordenan las parejas que **se solapan en pantalla** (hash espacial); el resto no se compara.
- Excepciones declaradas en datos (unidad «sobre puente/andamio/escalera» = capa `sobre`). Un objeto nunca se dibuja dentro de otra huella.

## 5. Pruebas Vitest obligatorias (toda fase que toque movimiento o colocación)

1. Propiedad: 200 ciudadanos × 10 000 ticks, ninguna posición en celda bloqueada.
2. `puedeColocar` rechaza solapes y agua.
3. El *pathfinding* rodea edificios y replanifica al construir.
4. Ocupación correcta tras derribar.
5. y-sort determinista, incluido el caso D017 (unidad junto a la cara de un edificio).

## 6. Verificación visual

Tecla **F3**: pinta huellas, celdas bloqueadas, puertas y rutas. `exponer()` publica `colisionesViolaciones`, que debe ser **0** siempre — `npm run shot` lo comprueba.
