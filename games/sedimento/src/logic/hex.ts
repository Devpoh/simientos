// Geometría de hexágonos "pointy-top" en un mapa rectangular con desplazamiento "odd-r"
// (las filas impares se desplazan medio hexágono a la derecha). Guía de referencia:
// https://www.redblobgames.com/grids/hexagons/

export interface Axial {
  q: number;
  r: number;
}

const RAIZ3 = Math.sqrt(3);

/** Los 6 vecinos en coordenadas axiales, en sentido horario empezando por el este. */
export const DIRECCIONES: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function offsetAAxial(col: number, fila: number): Axial {
  return { q: col - (fila - (fila & 1)) / 2, r: fila };
}

export function axialAOffset(q: number, r: number): { col: number; fila: number } {
  return { col: q + (r - (r & 1)) / 2, fila: r };
}

export function distancia(a: Axial, b: Axial): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Centro del hexágono en el plano XZ del mundo; `tamano` es el radio (centro → vértice). */
export function axialAMundo(q: number, r: number, tamano: number): { x: number; z: number } {
  return { x: tamano * RAIZ3 * (q + r / 2), z: tamano * 1.5 * r };
}

/** Hexágono que contiene el punto (x, z) del plano del mundo. */
export function mundoAAxial(x: number, z: number, tamano: number): Axial {
  const qf = ((RAIZ3 / 3) * x - z / 3) / tamano;
  const rf = ((2 / 3) * z) / tamano;
  return redondearAxial(qf, rf);
}

function redondearAxial(qf: number, rf: number): Axial {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q: q + 0, r: r + 0 }; // + 0 convierte -0 en 0
}

/** Rejilla rectangular de hexágonos: traduce entre índice lineal, offset y axial. */
export class Rejilla {
  readonly total: number;

  constructor(
    readonly columnas: number,
    readonly filas: number,
  ) {
    this.total = columnas * filas;
  }

  indice(col: number, fila: number): number {
    return fila * this.columnas + col;
  }

  col(i: number): number {
    return i % this.columnas;
  }

  fila(i: number): number {
    return Math.floor(i / this.columnas);
  }

  axial(i: number): Axial {
    return offsetAAxial(this.col(i), this.fila(i));
  }

  dentro(col: number, fila: number): boolean {
    return col >= 0 && col < this.columnas && fila >= 0 && fila < this.filas;
  }

  /** Índice del hexágono axial (q, r), o -1 si está fuera del mapa. */
  indiceAxial(q: number, r: number): number {
    const { col, fila } = axialAOffset(q, r);
    return this.dentro(col, fila) ? this.indice(col, fila) : -1;
  }

  /** Índices de los vecinos que existen dentro del mapa. */
  vecinos(i: number): number[] {
    const { q, r } = this.axial(i);
    const res: number[] = [];
    for (const d of DIRECCIONES) {
      const v = this.indiceAxial(q + d.q, r + d.r);
      if (v !== -1) res.push(v);
    }
    return res;
  }

  distancia(a: number, b: number): number {
    return distancia(this.axial(a), this.axial(b));
  }

  /** Hexágonos a `radio` saltos o menos de `i` (incluido), del más cercano al más lejano. */
  entorno(i: number, radio: number): number[] {
    const { q, r } = this.axial(i);
    const res: number[] = [];
    for (let dq = -radio; dq <= radio; dq++)
      for (let dr = Math.max(-radio, -dq - radio); dr <= Math.min(radio, -dq + radio); dr++) {
        const v = this.indiceAxial(q + dq, r + dr);
        if (v !== -1) res.push(v);
      }
    return res.sort((a, b) => this.distancia(i, a) - this.distancia(i, b) || a - b);
  }

  /** Distancia (en saltos) de cada hexágono al origen más cercano; Infinity si no hay camino. */
  distanciasDesde(origenes: Iterable<number>, transitable: (i: number) => boolean = () => true): number[] {
    const dist = new Array<number>(this.total).fill(Infinity);
    const cola: number[] = [];
    for (const o of origenes) {
      dist[o] = 0;
      cola.push(o);
    }
    for (let k = 0; k < cola.length; k++) {
      const actual = cola[k];
      for (const v of this.vecinos(actual)) {
        if (dist[v] !== Infinity || !transitable(v)) continue;
        dist[v] = dist[actual] + 1;
        cola.push(v);
      }
    }
    return dist;
  }
}
