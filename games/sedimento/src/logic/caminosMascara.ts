// Máscara de caminos por subcelda (P3b1, R85, D035): el dato de un camino es una máscara de 4×4 subceldas por
// tile, un valor por subcelda y material (sin camino, roca o tierra). Es lógica pura y determinista: trazar,
// borrar y consultar; el pintor (`caminosPintor.ts`) la convierte en índices de paleta.
//
// Se guarda aparte de la rejilla de ocupación (que solo necesita saber «hay camino») porque el pintor necesita
// distinguir material y sacar la distancia con signo para los bordes irregulares (D039).
import tuning from '../data/tuning.json';

export const SUB = tuning.caminoPintor.subceldas;

export const SIN_CAMINO = 0;
export const ROCA = 1;
export const TIERRA = 2;
export type MaterialCamino = typeof SIN_CAMINO | typeof ROCA | typeof TIERRA;

export interface MascaraCaminos {
  tilesU: number;
  tilesV: number;
  /** Subceldas por lado (tiles × SUB). */
  subU: number;
  subV: number;
  /** Un material por subcelda, índice `sv * subU + su`. */
  celdas: Uint8Array;
}

/** Un punto en coordenadas de tile (admite fracciones). */
export interface PuntoTile {
  u: number;
  v: number;
}

export function crearMascaraCaminos(tilesU: number, tilesV: number): MascaraCaminos {
  const subU = tilesU * SUB;
  const subV = tilesV * SUB;
  return { tilesU, tilesV, subU, subV, celdas: new Uint8Array(subU * subV) };
}

export function materialEn(m: MascaraCaminos, su: number, sv: number): MaterialCamino {
  if (su < 0 || sv < 0 || su >= m.subU || sv >= m.subV) return SIN_CAMINO;
  return m.celdas[sv * m.subU + su] as MaterialCamino;
}

/** Cuántas subceldas tiene cada material. Sirve para medir y para los tests. */
export function contarMaterial(m: MascaraCaminos): Record<'roca' | 'tierra', number> {
  let roca = 0;
  let tierra = 0;
  for (let k = 0; k < m.celdas.length; k++) {
    if (m.celdas[k] === ROCA) roca++;
    else if (m.celdas[k] === TIERRA) tierra++;
  }
  return { roca, tierra };
}

/** Distancia de un punto a un segmento, en el plano (u, v). */
function distSegmento(pu: number, pv: number, au: number, av: number, bu: number, bv: number): number {
  const du = bu - au;
  const dv = bv - av;
  const l2 = du * du + dv * dv;
  if (l2 === 0) return Math.hypot(pu - au, pv - av);
  let t = ((pu - au) * du + (pv - av) * dv) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(pu - (au + t * du), pv - (av + t * dv));
}

/**
 * Traza (o borra, con `material = SIN_CAMINO`) una polilínea de puntos de tile con un radio en tiles.
 * Marca una subcelda si su centro está a `radio` tiles o menos del trazado. Devuelve cuántas subceldas
 * cambiaron de valor. Determinista: mismos puntos y radio → misma máscara.
 */
export function trazar(m: MascaraCaminos, material: MaterialCamino, puntos: readonly PuntoTile[], radioTiles: number): number {
  if (puntos.length === 0) return 0;
  const r = radioTiles * SUB;
  let cambios = 0;
  const marca = (su: number, sv: number): void => {
    if (su < 0 || sv < 0 || su >= m.subU || sv >= m.subV) return;
    const k = sv * m.subU + su;
    if (m.celdas[k] !== material) { m.celdas[k] = material; cambios++; }
  };
  const hasta = Math.max(1, puntos.length - 1);
  for (let i = 0; i < hasta; i++) {
    const a = puntos[i];
    const b = puntos[i + 1] ?? puntos[i];
    const au = a.u * SUB;
    const av = a.v * SUB;
    const bu = b.u * SUB;
    const bv = b.v * SUB;
    const su0 = Math.max(0, Math.floor(Math.min(au, bu) - r - 1));
    const su1 = Math.min(m.subU - 1, Math.ceil(Math.max(au, bu) + r + 1));
    const sv0 = Math.max(0, Math.floor(Math.min(av, bv) - r - 1));
    const sv1 = Math.min(m.subV - 1, Math.ceil(Math.max(av, bv) + r + 1));
    for (let sv = sv0; sv <= sv1; sv++) {
      for (let su = su0; su <= su1; su++) {
        // Se mide sobre el centro de la subcelda, igual que la referencia de D039.
        if (distSegmento(su + 0.5, sv + 0.5, au, av, bu, bv) <= r) marca(su, sv);
      }
    }
  }
  // Puntos sueltos (polilínea de un solo punto): un disco.
  if (puntos.length === 1) {
    const a = puntos[0];
    const au = a.u * SUB;
    const av = a.v * SUB;
    for (let sv = Math.max(0, Math.floor(av - r)); sv <= Math.min(m.subV - 1, Math.ceil(av + r)); sv++) {
      for (let su = Math.max(0, Math.floor(au - r)); su <= Math.min(m.subU - 1, Math.ceil(au + r)); su++) {
        if (Math.hypot(su + 0.5 - au, sv + 0.5 - av) <= r) marca(su, sv);
      }
    }
  }
  return cambios;
}

/** Borra un trazado entero devolviendo sus subceldas a `SIN_CAMINO`. Alias legible de `trazar(..., 0, ...)`. */
export function borrar(m: MascaraCaminos, puntos: readonly PuntoTile[], radioTiles: number): number {
  return trazar(m, SIN_CAMINO, puntos, radioTiles);
}

/** Vacía la máscara entera. */
export function limpiar(m: MascaraCaminos): void {
  m.celdas.fill(SIN_CAMINO);
}

/**
 * Distancia con signo en subceldas (>0 dentro del material), con transformada de chamfer de dos pasadas.
 * Se calcula una vez por máscara y el pintor la muestrea; así los bordes son continuos y sin rejilla.
 */
export function sdf(m: MascaraCaminos, material: MaterialCamino): Float32Array {
  const { subU, subV, celdas } = m;
  const fuera = distanciaA(celdas, subU, subV, material, false);   // distancia a estar fuera
  const dentro = distanciaA(celdas, subU, subV, material, true);   // distancia a estar dentro
  const res = new Float32Array(subU * subV);
  for (let k = 0; k < res.length; k++) res[k] = fuera[k] - dentro[k];
  return res;
}

/** Distancia de chamfer (1 y √2) de cada celda al conjunto de celdas que cumplen o no el material. */
function distanciaA(celdas: Uint8Array, subU: number, subV: number, material: MaterialCamino, objetivo: boolean): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(subU * subV);
  const esObjetivo = (k: number): boolean => (celdas[k] === material) === objetivo;
  for (let k = 0; k < d.length; k++) d[k] = esObjetivo(k) ? 0 : INF;
  const D1 = 1;
  const D2 = Math.SQRT2;
  const relaja = (k: number, kn: number, w: number): void => {
    const v = d[kn] + w;
    if (v < d[k]) d[k] = v;
  };
  // Pasada hacia delante: vecinos de arriba-izquierda.
  for (let sv = 0; sv < subV; sv++) {
    for (let su = 0; su < subU; su++) {
      const k = sv * subU + su;
      if (d[k] === 0) continue;
      if (su > 0) relaja(k, k - 1, D1);
      if (sv > 0) relaja(k, k - subU, D1);
      if (su > 0 && sv > 0) relaja(k, k - subU - 1, D2);
      if (su + 1 < subU && sv > 0) relaja(k, k - subU + 1, D2);
    }
  }
  // Pasada hacia atrás: vecinos de abajo-derecha.
  for (let sv = subV - 1; sv >= 0; sv--) {
    for (let su = subU - 1; su >= 0; su--) {
      const k = sv * subU + su;
      if (d[k] === 0) continue;
      if (su + 1 < subU) relaja(k, k + 1, D1);
      if (sv + 1 < subV) relaja(k, k + subU, D1);
      if (su + 1 < subU && sv + 1 < subV) relaja(k, k + subU + 1, D2);
      if (su > 0 && sv + 1 < subV) relaja(k, k + subU - 1, D2);
    }
  }
  return d;
}
