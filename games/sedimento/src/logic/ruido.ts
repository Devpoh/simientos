import { hashTexto } from './azar';

// Ruido de valor 2D con semilla, para relieve suave. Solo usa aritmética entera y
// multiplicaciones (sin trigonometría), así que da el mismo resultado en cualquier motor.

function valorEnRejilla(semilla: number, x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ semilla;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const suavizar = (t: number) => t * t * (3 - 2 * t);

export function ruidoValor(semilla: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = suavizar(x - x0);
  const ty = suavizar(y - y0);
  const a = valorEnRejilla(semilla, x0, y0);
  const b = valorEnRejilla(semilla, x0 + 1, y0);
  const c = valorEnRejilla(semilla, x0, y0 + 1);
  const d = valorEnRejilla(semilla, x0 + 1, y0 + 1);
  const arriba = a + (b - a) * tx;
  const abajo = c + (d - c) * tx;
  return arriba + (abajo - arriba) * ty;
}

/** Ruido fractal (fBm): suma de octavas cada vez más finas. Resultado en [0, 1]. */
export function fbm(semilla: number, x: number, y: number, octavas: number): number {
  let suma = 0;
  let amplitud = 1;
  let frecuencia = 1;
  let total = 0;
  for (let o = 0; o < octavas; o++) {
    suma += ruidoValor(hashTexto(`${semilla}:${o}`), x * frecuencia, y * frecuencia) * amplitud;
    total += amplitud;
    amplitud *= 0.5;
    frecuencia *= 2;
  }
  return suma / total;
}
