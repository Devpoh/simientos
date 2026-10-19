// Búfer de píxeles a baja resolución. Todo se dibuja a mano, píxel a píxel, con una paleta cerrada,
// y al final se escala a pantalla con un factor entero (sin suavizado): así es pixel art de verdad.

export type Rgb = number; // 0xRRGGBB

/** Bayer 4×4: umbrales para el tramado ordenado (dithering), el «degradado» clásico del pixel art. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const tramado = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

export class Lienzo {
  readonly datos: ImageData;
  readonly px: Uint32Array;

  constructor(readonly ancho: number, readonly alto: number) {
    this.datos = new ImageData(ancho, alto);
    this.px = new Uint32Array(this.datos.data.buffer);
  }

  /** Little-endian: en memoria el píxel es ABGR. */
  static abgr(c: Rgb): number {
    return (0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff)) >>> 0;
  }

  pon(x: number, y: number, c: Rgb): void {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return;
    this.px[y * this.ancho + x] = Lienzo.abgr(c);
  }

  lee(x: number, y: number): Rgb {
    const v = this.px[y * this.ancho + x];
    return ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff);
  }

  /** Oscurece un píxel (sombras): multiplica y tira un poco hacia el azul, como una sombra al sol. */
  sombra(x: number, y: number, f: number): void {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return;
    const c = this.lee(x, y);
    const r = ((c >> 16) & 0xff) * f;
    const g = ((c >> 8) & 0xff) * f;
    const b = Math.min(255, (c & 0xff) * (f + 0.12));
    this.px[y * this.ancho + x] = Lienzo.abgr(((r | 0) << 16) | ((g | 0) << 8) | (b | 0));
  }

  /** Relleno de polígono convexo o cóncavo por líneas de barrido, evaluando el centro de cada píxel. */
  poligono(pts: readonly [number, number][], color: (x: number, y: number) => Rgb | -1): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const cortes: number[] = [];
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const cy = y + 0.5;
      cortes.length = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= cy && y2 > cy) || (y2 <= cy && y1 > cy)) cortes.push(x1 + ((cy - y1) / (y2 - y1)) * (x2 - x1));
      }
      cortes.sort((a, b) => a - b);
      for (let k = 0; k + 1 < cortes.length; k += 2)
        for (let x = Math.round(cortes[k]); x < Math.round(cortes[k + 1]); x++) {
          const c = color(x, y);
          if (c !== -1) this.pon(x, y, c);
        }
    }
  }

  linea(x0: number, y0: number, x1: number, y1: number, c: Rgb): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.pon(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}

/** Mezcla dos colores (t en 0..1). Solo para preparar la paleta, nunca por píxel en el bucle. */
export function mezcla(a: Rgb, b: Rgb, t: number): Rgb {
  const r = ((a >> 16) & 0xff) * (1 - t) + ((b >> 16) & 0xff) * t;
  const g = ((a >> 8) & 0xff) * (1 - t) + ((b >> 8) & 0xff) * t;
  const bl = (a & 0xff) * (1 - t) + (b & 0xff) * t;
  return ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0);
}

/** Azar determinista (mulberry32) y ruido de valor 2D con semilla. */
export function rng(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x: number, y: number, s = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function ruido(x: number, y: number, s = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, s);
  const b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s);
  const d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, s = 0, octavas = 4): number {
  let t = 0;
  let a = 0.5;
  let f = 1;
  let n = 0;
  for (let i = 0; i < octavas; i++) {
    t += ruido(x * f, y * f, s + i * 17) * a;
    n += a;
    a *= 0.5;
    f *= 2;
  }
  return t / n;
}
