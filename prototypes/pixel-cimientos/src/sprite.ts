import { tramado, type Rgb } from './lienzo';

// Sprite a mano: búfer de colores con transparencia (-1) y un ancla en el pie (donde toca el suelo).
// Se dibuja con primitivas sencillas y al final se le pone contorno selectivo.

export const VACIO = -1;

export class Sprite {
  readonly c: Int32Array;
  /** Altura sobre el suelo de cada píxel opaco (para la sombra proyectada); -1 si no proyecta. */
  readonly alto: Int16Array;

  constructor(readonly w: number, readonly h: number, readonly anclaX = Math.floor(w / 2), readonly anclaY = h - 1) {
    this.c = new Int32Array(w * h).fill(VACIO);
    this.alto = new Int16Array(w * h).fill(-1);
  }

  pon(x: number, y: number, col: Rgb): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.c[y * this.w + x] = col;
  }

  lee(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return VACIO;
    return this.c[y * this.w + x];
  }

  rect(x: number, y: number, w: number, h: number, col: Rgb | ((x: number, y: number) => Rgb | -1)): void {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const c = typeof col === 'number' ? col : col(x + i, y + j);
        if (c !== VACIO) this.pon(x + i, y + j, c);
      }
  }

  elipse(cx: number, cy: number, rx: number, ry: number, col: (x: number, y: number, nx: number, ny: number) => Rgb | -1): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        const c = col(x, y, nx, ny);
        if (c !== VACIO) this.pon(x, y, c);
      }
  }

  linea(x0: number, y0: number, x1: number, y1: number, col: Rgb): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) this.pon(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, col);
  }

  /**
   * Contorno selectivo: los píxeles vacíos que tocan el dibujo se pintan de un tono oscuro del propio
   * material (no negro): más oscuro abajo y a la derecha (lado de sombra) que arriba a la izquierda.
   */
  contornear(oscuro: Rgb, medio: Rgb): void {
    const copia = Int32Array.from(this.c);
    const opaco = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && copia[y * this.w + x] !== VACIO;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (opaco(x, y)) continue;
        const abajoDerecha = opaco(x - 1, y) || opaco(x, y - 1);
        const arribaIzquierda = opaco(x + 1, y) || opaco(x, y + 1);
        if (abajoDerecha) this.c[y * this.w + x] = oscuro;
        else if (arribaIzquierda) this.c[y * this.w + x] = medio;
      }
  }

  /** Marca la altura de proyección de sombra: por defecto, la distancia al ancla en vertical. */
  calcularAltura(): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) if (this.c[y * this.w + x] !== VACIO) this.alto[y * this.w + x] = Math.max(0, this.anclaY - y);
  }
}

/** Elige entre dos tonos con tramado: t = 0 → a, t = 1 → b. */
export const dt = (x: number, y: number, t: number, a: Rgb, b: Rgb): Rgb => (t > tramado(x, y) ? b : a);

/** Escalón de una rampa con tramado entre escalones (t en 0..1). */
export function rampa(r: readonly Rgb[], t: number, x: number, y: number): Rgb {
  const v = Math.max(0, Math.min(r.length - 1.001, t * (r.length - 1)));
  const i = Math.floor(v);
  return dt(x, y, v - i, r[i], r[i + 1]);
}
