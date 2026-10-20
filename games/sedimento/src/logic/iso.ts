// Proyección isométrica 2:1. Coordenadas de rejilla (u, v) en tiles, con u hacia abajo-derecha y v hacia
// abajo-izquierda; pantalla en píxeles del lienzo base. Lógica pura, sin motor.
import tuning from '../data/tuning.json';

export interface DimTile { ancho: number; alto: number }
export interface Punto { x: number; y: number }
export interface Rejilla { u: number; v: number }

export const TILE: DimTile = { ancho: tuning.pantalla.tileAncho, alto: tuning.pantalla.tileAlto };

/** (u, v) en tiles → píxeles de mundo. Un tile en u avanza (+ancho/2, +alto/2); en v, (−ancho/2, +alto/2). */
export function aPantalla(u: number, v: number, t: DimTile = TILE): Punto {
  return { x: ((u - v) * t.ancho) / 2, y: ((u + v) * t.alto) / 2 };
}

/** Píxeles de mundo → (u, v) en tiles (inversa exacta de `aPantalla`). */
export function aRejilla(x: number, y: number, t: DimTile = TILE): Rejilla {
  const a = (2 * x) / t.ancho;
  const b = (2 * y) / t.alto;
  return { u: (a + b) / 2, v: (b - a) / 2 };
}

/** Clave de orden de dibujo: más grande = más cerca de la cámara = se dibuja después (y-sort, regla única). */
export function claveOrden(u: number, v: number): number {
  return u + v;
}

export interface Huella { w: number; d: number }

/** Clave de orden de una estructura: la de su vértice frontal (esquina trasera u0,v0 + huella). */
export function claveOrdenEstructura(u0: number, v0: number, h: Huella): number {
  return claveOrden(u0 + h.w, v0 + h.d);
}

/** Centro de la huella en rejilla: donde se coloca el ancla de un sprite anclado a la huella. */
export function centroHuella(u0: number, v0: number, h: Huella): Rejilla {
  return { u: u0 + h.w / 2, v: v0 + h.d / 2 };
}
