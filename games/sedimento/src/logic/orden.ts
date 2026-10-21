// Orden de dibujo con una sola regla (D017, §4.5): la clave u+v ordena lo que no tiene huella, pero entre una
// unidad y una estructura manda la comparación de huellas. Una persona pegada a la cara derecha de una casa 2×2
// (u ≥ umax) se dibuja DELANTE aunque su u+v sea menor; pegada a la cara trasera (v ≤ vmin), DETRÁS.
// Lógica pura, sin motor: la presentación solo pide la profundidad ya resuelta.
import tuning from '../data/tuning.json';
import { claveOrden, claveOrdenEstructura, type Huella } from './iso';

/** Huella colocada en la rejilla: esquina trasera (u, v) y tamaño. */
export interface HuellaColocada extends Huella {
  u: number;
  v: number;
}

/** Separación mínima entre la clave de una estructura y la de una unidad que se dibuja justo delante o detrás. */
const EPSILON = 1e-3;

export const DELANTE = 1;
export const DETRAS = -1;
export const INDIFERENTE = 0;

/** Clave de celda del índice: fila × 4096 + columna (el mundo cabe de sobra en 4096 columnas de 4 tiles). */
function clave(fila: number, columna: number): number {
  return fila * 4096 + columna;
}

/**
 * Compara el punto de pies de una unidad con una huella: DELANTE si la unidad está en la cara frontal o derecha
 * (u ≥ umax o v ≥ vmax), DETRAS si está en la trasera o izquierda (u ≤ umin o v ≤ vmin), INDIFERENTE si no toca
 * ninguna cara. Cuando la unidad cae en una esquina y las dos condiciones se cumplen, gana DELANTE (así lo pide
 * D017: primero la cara frontal).
 */
export function compararUnidadHuella(u: number, v: number, h: HuellaColocada): number {
  const umin = h.u;
  const umax = h.u + h.w;
  const vmin = h.v;
  const vmax = h.v + h.d;
  if (u >= umax || v >= vmax) return DELANTE;
  if (u <= umin || v <= vmin) return DETRAS;
  return INDIFERENTE;
}

/**
 * Profundidad de dibujo de una unidad (u, v) teniendo en cuenta las estructuras que la rozan. Solo mira las
 * huellas de su entorno (una a cada lado), así que el coste no depende del tamaño de la aldea.
 */
export function profundidadUnidad(
  u: number, v: number, huellas: readonly HuellaColocada[], margen: number = tuning.orden.margenHuellas,
): number {
  let profundidad = claveOrden(u, v);
  for (const h of huellas) {
    if (u < h.u - margen || u > h.u + h.w + margen || v < h.v - margen || v > h.v + h.d + margen) continue;
    const c = compararUnidadHuella(u, v, h);
    if (c === INDIFERENTE) continue;
    const clave = claveOrdenEstructura(h.u, h.v, h);
    profundidad = c === DELANTE ? Math.max(profundidad, clave + EPSILON) : Math.min(profundidad, clave - EPSILON);
  }
  return profundidad;
}

/** Huellas de todo lo que bloquea tiles, para pasar a `profundidadUnidad` sin reasignar en el bucle. */
export function huellasDe(elementos: readonly { u: number; v: number; w: number; d: number }[]): HuellaColocada[] {
  return elementos.map((e) => ({ u: e.u, v: e.v, w: e.w, d: e.d }));
}

/**
 * Índice espacial de huellas (hash por celdas de `lado` tiles). Sin él, cada unidad visible recorrería las ~800
 * huellas de la aldea en cada fotograma; con él solo mira las de su celda. Nada se asigna al consultar.
 */
export class IndiceHuellas {
  private readonly celdas = new Map<number, number[]>();
  /** Marca por huella para no repetirla si toca dos celdas de la misma consulta. */
  private readonly visto: Int32Array;
  private marca = 0;

  constructor(private readonly huellas: readonly HuellaColocada[], private readonly lado: number = 4, private readonly margen: number = tuning.orden.margenHuellas) {
    this.visto = new Int32Array(huellas.length);
    for (let i = 0; i < huellas.length; i++) {
      const h = huellas[i];
      const c0 = Math.floor((h.u - margen) / lado);
      const c1 = Math.floor((h.u + h.w + margen) / lado);
      const f0 = Math.floor((h.v - margen) / lado);
      const f1 = Math.floor((h.v + h.d + margen) / lado);
      for (let f = f0; f <= f1; f++) {
        for (let c = c0; c <= c1; c++) {
          const k = clave(f, c);
          const lista = this.celdas.get(k);
          if (lista) lista.push(i);
          else this.celdas.set(k, [i]);
        }
      }
    }
  }

  /** Huellas que pueden rozar el punto (u, v). El array devuelto se reutiliza: no guardar entre fotogramas. */
  private readonly salida: number[] = [];
  consultar(u: number, v: number): number[] {
    const salida = this.salida;
    salida.length = 0;
    const lista = this.celdas.get(clave(Math.floor(v / this.lado), Math.floor(u / this.lado)));
    if (!lista) return salida;
    this.marca++;
    for (const i of lista) {
      if (this.visto[i] === this.marca) continue;
      this.visto[i] = this.marca;
      salida.push(i);
    }
    return salida;
  }

  /** Profundidad de dibujo de la unidad (u, v), mirando solo las huellas de su celda. */
  profundidad(u: number, v: number): number {
    let profundidad = claveOrden(u, v);
    for (const i of this.consultar(u, v)) {
      const h = this.huellas[i];
      // La celda del índice es más gruesa que el margen: hay que reaplicarlo para igualar al barrido lineal.
      if (u < h.u - this.margen || u > h.u + h.w + this.margen || v < h.v - this.margen || v > h.v + h.d + this.margen) continue;
      const c = compararUnidadHuella(u, v, h);
      if (c === INDIFERENTE) continue;
      const claveH = claveOrdenEstructura(h.u, h.v, h);
      profundidad = c === DELANTE ? Math.max(profundidad, claveH + EPSILON) : Math.min(profundidad, claveH - EPSILON);
    }
    return profundidad;
  }
}
