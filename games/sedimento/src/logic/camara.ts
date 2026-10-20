// Cámara 2D (R60/R61): centro en píxeles de mundo + zoom por pasos enteros. Sin giro ni inclinación.
// Lógica pura: la escena solo lee el ratón y el teclado, llama aquí y aplica el resultado a la cámara de Phaser.
// «Pantalla» = píxeles del lienzo base (960×540); «mundo» = píxeles del mapa a zoom 1.

export interface Vista { ancho: number; alto: number }
export interface EstadoCamara { x: number; y: number; zoom: number }
export interface Limites { minX: number; maxX: number; minY: number; maxY: number }
export interface Direccion { x: -1 | 0 | 1; y: -1 | 0 | 1 }

/** Caja del mapa isométrico (rombo de n×n tiles) más un margen para poder mirar un poco más allá del borde. */
export function limitesMundo(tiles: number, tile: { ancho: number; alto: number }, margen: number): Limites {
  return {
    minX: (-tiles * tile.ancho) / 2 - margen,
    maxX: (tiles * tile.ancho) / 2 + margen,
    minY: -margen,
    maxY: tiles * tile.alto + margen,
  };
}

function acotar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/** Eje del centro: si la vista cabe, queda en el rango; si es mayor que el mundo, se centra en él. */
function limitarEje(centro: number, medioVista: number, min: number, max: number): number {
  if (max - min <= 2 * medioVista) return (min + max) / 2;
  return acotar(centro, min + medioVista, max - medioVista);
}

/** Mantiene la vista dentro de los límites del mapa. */
export function limitarCentro(e: EstadoCamara, vista: Vista, lim: Limites): EstadoCamara {
  return {
    x: limitarEje(e.x, vista.ancho / e.zoom / 2, lim.minX, lim.maxX),
    y: limitarEje(e.y, vista.alto / e.zoom / 2, lim.minY, lim.maxY),
    zoom: e.zoom,
  };
}

/** Arrastre con el botón central: el mapa sigue al ratón, así que el centro se mueve al revés. */
export function arrastrar(e: EstadoCamara, dxPantalla: number, dyPantalla: number, vista: Vista, lim: Limites): EstadoCamara {
  return limitarCentro({ x: e.x - dxPantalla / e.zoom, y: e.y - dyPantalla / e.zoom, zoom: e.zoom }, vista, lim);
}

/** Desplazamiento con teclas o bordes: `velocidad` en píxeles de pantalla por segundo (igual a cualquier zoom). */
export function desplazar(
  e: EstadoCamara, dir: Direccion, velocidad: number, dt: number, vista: Vista, lim: Limites,
): EstadoCamara {
  if (dir.x === 0 && dir.y === 0) return e;
  const norma = Math.hypot(dir.x, dir.y);
  const paso = (velocidad * dt) / e.zoom / norma;
  return limitarCentro({ x: e.x + dir.x * paso, y: e.y + dir.y * paso, zoom: e.zoom }, vista, lim);
}

/** Dirección de desplazamiento si el cursor está a `margen` px del borde del lienzo. */
export function direccionBordes(px: number, py: number, vista: Vista, margen: number): Direccion {
  const x = px <= margen ? -1 : px >= vista.ancho - 1 - margen ? 1 : 0;
  const y = py <= margen ? -1 : py >= vista.alto - 1 - margen ? 1 : 0;
  return { x, y };
}

/** Siguiente zoom de la lista de pasos (`sentido` > 0 acerca, < 0 aleja); se queda en los extremos. */
export function pasoZoom(pasos: readonly number[], zoom: number, sentido: number): number {
  let i = pasos.indexOf(zoom);
  if (i < 0) i = pasos.reduce((mejor, p, k) => (Math.abs(p - zoom) < Math.abs(pasos[mejor] - zoom) ? k : mejor), 0);
  return pasos[acotar(i + Math.sign(sentido), 0, pasos.length - 1)];
}

/** Punto del mundo bajo un punto de la pantalla. */
export function aMundo(e: EstadoCamara, vista: Vista, px: number, py: number): { x: number; y: number } {
  return { x: e.x + (px - vista.ancho / 2) / e.zoom, y: e.y + (py - vista.alto / 2) / e.zoom };
}

/** Un paso de zoom hacia el cursor: el punto del mapa bajo el cursor no se mueve (salvo que lo impidan los límites). */
export function zoomHaciaCursor(
  e: EstadoCamara, sentido: number, px: number, py: number, vista: Vista, pasos: readonly number[], lim: Limites,
): EstadoCamara {
  const zoom = pasoZoom(pasos, e.zoom, sentido);
  if (zoom === e.zoom) return e;
  const p = aMundo(e, vista, px, py);
  return limitarCentro(
    { x: p.x - (px - vista.ancho / 2) / zoom, y: p.y - (py - vista.alto / 2) / zoom, zoom },
    vista,
    lim,
  );
}
