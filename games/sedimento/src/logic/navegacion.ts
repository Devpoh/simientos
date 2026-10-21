// Navegación sobre la rejilla de ocupación (P4, §4.4 del pivote).
//
// A* sobre tiles, no sobre hexágonos: la rejilla de `ocupacion.ts` es la única fuente de verdad, así que
// una unidad jamás entra en una celda bloqueada. El coste favorece las calles (capa `CAMINO`), la diagonal
// cuesta √2 y no se permite «cortar la esquina» (los dos ortogonales deben estar libres): sin eso, dos
// unidades se cruzarían en un cruce y el y-sort dejaría de ser determinista.
//
// La heurística es la distancia octil (la misma métrica que el coste real) por el coste mínimo posible,
// así nunca sobreestima y la ruta es la más corta de verdad.
import tuning from '../data/tuning.json';
import { MonticuloMin } from './monticulo';
import { bloqueada, estadoTile, CAMINO, type Ocupacion, type Tile } from './ocupacion';

export type { Tile };

export interface ConfigNavegacion {
  /** Coste de entrar en un tile de tierra firme. */
  costeBase: number;
  /** Coste de entrar en un tile de camino (más barato: se camina más rápido por la calle). */
  costeCamino: number;
  /** Coste extra por cada 0,1 de pendiente del tile (P4 lo usa el ciudadano, no la ruta). */
  costePendiente: number;
  /** Si la diagonal está permitida (con la regla de no cortar esquina). */
  diagonal: boolean;
}

/** Valida y tipa la sección "navegacion" de tuning.json. */
export function configNavegacion(t: {
  costeBase: number; costeCamino: number; costePendiente: number; diagonal: boolean;
}): ConfigNavegacion {
  return { costeBase: t.costeBase, costeCamino: t.costeCamino, costePendiente: t.costePendiente, diagonal: t.diagonal };
}

export const CFG_NAVEGACION = configNavegacion(tuning.navegacion);

/** ¿Se puede pisar el tile? Igual que `bloqueada` pero en positivo y con nombre propio. */
export function transitable(oc: Ocupacion, u: number, v: number): boolean {
  return !bloqueada(oc, u, v);
}

/** Coste de entrar en (u, v). Solo tiene sentido si es transitable. */
export function costeEntrar(oc: Ocupacion, u: number, v: number, cfg: ConfigNavegacion = CFG_NAVEGACION): number {
  return estadoTile(oc, u, v) === CAMINO ? cfg.costeCamino : cfg.costeBase;
}

const DESPLAZAMIENTOS: readonly Tile[] = [
  { u: 1, v: 0 }, { u: -1, v: 0 }, { u: 0, v: 1 }, { u: 0, v: -1 },
  { u: 1, v: 1 }, { u: 1, v: -1 }, { u: -1, v: 1 }, { u: -1, v: -1 },
];

/** Heurística octil: distancia de rey (diagonal barata) escalada al coste mínimo por tile. */
function heuristica(du: number, dv: number, minimo: number): number {
  const a = Math.abs(du);
  const b = Math.abs(dv);
  return (Math.max(a, b) + (Math.SQRT2 - 1) * Math.min(a, b)) * minimo;
}

function costePaso(base: number, esDiagonal: boolean): number {
  return esDiagonal ? base * Math.SQRT2 : base;
}

/**
 * Ruta de `origen` a `destino` (tiles, ambos incluidos) o `null` si no hay camino.
 * `origen` y `destino` deben ser transitables; si el destino está bloqueado devuelve `null`
 * (el llamante decide entonces dejar a la unidad en estado `bloqueado`).
 */
export function buscarRuta(
  oc: Ocupacion, origen: Tile, destino: Tile, cfg: ConfigNavegacion = CFG_NAVEGACION,
): Tile[] | null {
  if (!transitable(oc, origen.u, origen.v) || !transitable(oc, destino.u, destino.v)) return null;
  if (origen.u === destino.u && origen.v === destino.v) return [{ u: origen.u, v: origen.v }];

  const indice = (u: number, v: number): number => v * oc.tilesU + u;
  const minimo = Math.min(cfg.costeBase, cfg.costeCamino);
  const destinoI = indice(destino.u, destino.v);

  const abierto = new MonticuloMin();
  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, number>();
  const visitado = new Set<number>();

  const origenI = indice(origen.u, origen.v);
  gScore.set(origenI, 0);
  abierto.insertar(origenI, heuristica(destino.u - origen.u, destino.v - origen.v, minimo));

  while (abierto.tamano > 0) {
    const nodo = abierto.extraerMin() as { i: number; f: number };
    if (visitado.has(nodo.i)) continue;
    visitado.add(nodo.i);
    if (nodo.i === destinoI) return reconstruir(oc, cameFrom, nodo.i);

    const u = nodo.i % oc.tilesU;
    const v = (nodo.i - u) / oc.tilesU;
    for (const d of DESPLAZAMIENTOS) {
      const esDiagonal = d.u !== 0 && d.v !== 0;
      if (esDiagonal && !cfg.diagonal) continue;
      const nu = u + d.u;
      const nv = v + d.v;
      if (nu < 0 || nv < 0 || nu >= oc.tilesU || nv >= oc.tilesV) continue;
      if (!transitable(oc, nu, nv)) continue;
      // No cortar la esquina: en diagonal, los dos tiles ortogonales deben estar libres.
      if (esDiagonal && (!transitable(oc, u + d.u, v) || !transitable(oc, u, v + d.v))) continue;
      const ni = indice(nu, nv);
      if (visitado.has(ni)) continue;
      const g2 = (gScore.get(nodo.i) as number) + costePaso(costeEntrar(oc, nu, nv, cfg), esDiagonal);
      if (g2 < (gScore.get(ni) ?? Infinity)) {
        gScore.set(ni, g2);
        cameFrom.set(ni, nodo.i);
        abierto.insertar(ni, g2 + heuristica(destino.u - nu, destino.v - nv, minimo));
      }
    }
  }
  return null;
}

function reconstruir(oc: Ocupacion, cameFrom: Map<number, number>, actual: number): Tile[] {
  const ruta: Tile[] = [];
  let cur = actual;
  for (;;) {
    const u = cur % oc.tilesU;
    ruta.push({ u, v: (cur - u) / oc.tilesU });
    const previo = cameFrom.get(cur);
    if (previo === undefined) break;
    cur = previo;
  }
  ruta.reverse();
  return ruta;
}

/** Quita los puntos intermedios de los tramos rectos: la unidad no necesita doblar en cada tile. */
export function suavizarRuta(ruta: Tile[]): Tile[] {
  if (ruta.length <= 2) return ruta.slice();
  const salida: Tile[] = [ruta[0]];
  for (let i = 1; i + 1 < ruta.length; i++) {
    const a = ruta[i - 1];
    const b = ruta[i];
    const c = ruta[i + 1];
    const mismoRumbo = (b.u - a.u) === (c.u - b.u) && (b.v - a.v) === (c.v - b.v);
    if (!mismoRumbo) salida.push(b);
  }
  salida.push(ruta[ruta.length - 1]);
  return salida;
}

/** Longitud euclídea de la polilínea de tiles (en tiles). */
export function longitudRuta(ruta: Tile[]): number {
  let total = 0;
  for (let i = 0; i + 1 < ruta.length; i++) {
    total += Math.hypot(ruta[i + 1].u - ruta[i].u, ruta[i + 1].v - ruta[i].v);
  }
  return total;
}

/**
 * BFS de alcanzabilidad: visita los tiles alcanzables desde `origen` en orden de cercanía y llama a
 * `visita` con cada uno. `limite` corta la búsqueda (0 = sin límite). Misma regla que `buscarRuta`,
 * incluida la de no cortar esquinas.
 */
function recorrerAlcanzables(
  oc: Ocupacion, origen: Tile, limite: number, cfg: ConfigNavegacion, visita: (t: Tile) => boolean,
): void {
  if (!transitable(oc, origen.u, origen.v)) return;
  const vista = new Uint8Array(oc.tilesU * oc.tilesV);
  const cola: number[] = [origen.v * oc.tilesU + origen.u];
  vista[cola[0]] = 1;
  let cabeza = 0;
  let vistos = 0;
  while (cabeza < cola.length) {
    const k = cola[cabeza++];
    const u = k % oc.tilesU;
    const v = (k - u) / oc.tilesU;
    if (!visita({ u, v })) return;
    vistos++;
    if (limite > 0 && vistos >= limite) return;
    for (const d of DESPLAZAMIENTOS) {
      const esDiagonal = d.u !== 0 && d.v !== 0;
      if (esDiagonal && !cfg.diagonal) continue;
      const nu = u + d.u;
      const nv = v + d.v;
      if (nu < 0 || nv < 0 || nu >= oc.tilesU || nv >= oc.tilesV) continue;
      if (vista[nv * oc.tilesU + nu] === 1) continue;
      if (!transitable(oc, nu, nv)) continue;
      if (esDiagonal && (!transitable(oc, u + d.u, v) || !transitable(oc, u, v + d.v))) continue;
      vista[nv * oc.tilesU + nu] = 1;
      cola.push(nv * oc.tilesU + nu);
    }
  }
}

/**
 * Mapa de tiles alcanzables desde `origen` (1 = sí). El mundo tiene bolsas de tierra aisladas por el agua,
 * así que «estar libre» no basta: hace falta «ser alcanzable». P4 lo usa para no mandar a nadie a un sitio
 * sin camino, y P4b para el ida y vuelta.
 */
export function alcanzables(oc: Ocupacion, origen: Tile, cfg: ConfigNavegacion = CFG_NAVEGACION): Uint8Array {
  const vista = new Uint8Array(oc.tilesU * oc.tilesV);
  recorrerAlcanzables(oc, origen, 0, cfg, (t) => { vista[t.v * oc.tilesU + t.u] = 1; return true; });
  return vista;
}

/** Tiles alcanzables desde `origen`, en orden de cercanía, hasta `limite`. */
export function alcanzablesCerca(oc: Ocupacion, origen: Tile, limite: number, cfg: ConfigNavegacion = CFG_NAVEGACION): Tile[] {
  const salida: Tile[] = [];
  recorrerAlcanzables(oc, origen, limite, cfg, (t) => { salida.push(t); return true; });
  return salida;
}

/** Punto continuo (u, v) sobre la ruta a la distancia `recorrido` (en tiles), con la orientación del tramo. */
export function puntoEnRuta(ruta: Tile[], recorrido: number, fuera: Tile): void {
  if (ruta.length === 0) return;
  if (ruta.length === 1 || recorrido <= 0) {
    fuera.u = ruta[0].u;
    fuera.v = ruta[0].v;
    return;
  }
  let restante = recorrido;
  for (let i = 0; i + 1 < ruta.length; i++) {
    const a = ruta[i];
    const b = ruta[i + 1];
    const largo = Math.hypot(b.u - a.u, b.v - a.v);
    if (restante <= largo) {
      const f = largo === 0 ? 0 : restante / largo;
      fuera.u = a.u + (b.u - a.u) * f;
      fuera.v = a.v + (b.v - a.v) * f;
      return;
    }
    restante -= largo;
  }
  const fin = ruta[ruta.length - 1];
  fuera.u = fin.u;
  fuera.v = fin.v;
}
