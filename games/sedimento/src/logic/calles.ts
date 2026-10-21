// Red de calles de la aldea de referencia (P3b2, R85, §10.9): calles principales de roca de `anchoPrincipal`
// tiles que forman manzanas, travesías de tierra estrechas dentro de cada manzana y un ramal de tierra desde cada
// edificio hasta la calle más cercana. Lógica pura y determinista (semilla → mismas calles).
//
// Se traza en dos tiempos: primero la retícula (antes de colocar los edificios, para que nadie construya encima y
// entre manzanas queden los dos tiles del ancho principal) y después los ramales, que sí necesitan los edificios.
import tuning from '../data/tuning.json';
import type { Rng } from './azar';

export const SIN_CALLE = 0;
export const CALLE_ROCA = 1;
export const CALLE_TIERRA = 2;

/** Un tramo de calle: material, ancho en tiles y la polilínea por la que pasa. */
export interface TrazadoCalle {
  material: 'roca' | 'tierra';
  ancho: number;
  puntos: { u: number; v: number }[];
}

export interface RedCalles {
  /** Material por tile, para pintar: 0 sin calle, `CALLE_ROCA` o `CALLE_TIERRA`. */
  tiles: Uint8Array;
  /** Polilíneas por material y ancho, para estampar la máscara de subceldas (P3b1). */
  trazados: TrazadoCalle[];
}

export interface ConfigCalles {
  /** Cada cuántos tiles pasa una calle principal. */
  sep: number;
  /** Ancho de las calles principales, en tiles (≥ 2, §10.9). */
  anchoPrincipal: number;
  /** Ancho de las travesías y ramales de tierra, en tiles. */
  anchoTravesia: number;
}

export function configCalles(t: { callePrincipalCada: number; callePrincipalAncho: number }): ConfigCalles {
  if (t.callePrincipalAncho < 2) throw new Error('callePrincipalAncho debe ser ≥ 2 (§10.9)');
  return { sep: Math.max(6, t.callePrincipalCada), anchoPrincipal: t.callePrincipalAncho, anchoTravesia: 1 };
}

export const CFG_CALLES = configCalles(tuning.aldea);

/** Marca un disco de `radio` tiles alrededor de (u, v) si el tile es apto (seco y sin pendiente fuerte). */
function disco(tiles: Uint8Array, aptos: Uint8Array, tilesU: number, tilesV: number, cu: number, cv: number, radio: number, valor: number): void {
  const r = Math.ceil(radio);
  for (let v = Math.max(0, Math.floor(cv - r)); v <= Math.min(tilesV - 1, Math.floor(cv + r)); v++) {
    for (let u = Math.max(0, Math.floor(cu - r)); u <= Math.min(tilesU - 1, Math.floor(cu + r)); u++) {
      if (Math.hypot(u + 0.5 - cu, v + 0.5 - cv) > radio) continue;
      const k = v * tilesU + u;
      if (!aptos[k]) continue;
      // La roca manda sobre la tierra: una calle principal no se convierte en travesía.
      if (valor === CALLE_TIERRA && tiles[k] === CALLE_ROCA) continue;
      tiles[k] = valor;
    }
  }
}

/** Marca la polilínea entera (a pasos de medio tile) con un disco por muestra. */
function marcarTrazado(
  tiles: Uint8Array, aptos: Uint8Array, tilesU: number, tilesV: number,
  puntos: readonly { u: number; v: number }[], radio: number, valor: number,
): void {
  for (let i = 0; i + 1 < puntos.length; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    const largo = Math.hypot(b.u - a.u, b.v - a.v);
    const pasos = Math.max(1, Math.ceil(largo * 2));
    for (let s = 0; s <= pasos; s++) {
      const t = s / pasos;
      disco(tiles, aptos, tilesU, tilesV, a.u + (b.u - a.u) * t, a.v + (b.v - a.v) * t, radio, valor);
    }
  }
}

/** Extremos de los tiles aptos en un radio alrededor del centro: hasta dónde puede llegar la red. */
function alcance(aptos: Uint8Array, tilesU: number, tilesV: number, centro: { u: number; v: number }, radio: number): { u0: number; u1: number; v0: number; v1: number } {
  let u0 = tilesU;
  let u1 = -1;
  let v0 = tilesV;
  let v1 = -1;
  for (let v = 0; v < tilesV; v++) {
    for (let u = 0; u < tilesU; u++) {
      if (!aptos[v * tilesU + u]) continue;
      if (Math.hypot(u - centro.u, v - centro.v) > radio) continue;
      if (u < u0) u0 = u;
      if (u > u1) u1 = u;
      if (v < v0) v0 = v;
      if (v > v1) v1 = v;
    }
  }
  if (u1 < u0) return { u0: 0, u1: tilesU - 1, v0: 0, v1: tilesV - 1 };
  return { u0, u1, v0, v1 };
}

/**
 * Traza la retícula de calles: principales de roca cada `sep` tiles (con una ondulación suave para que no sean
 * perfectamente rectas) y travesías de tierra entre manzanas. No coloca ramales: eso necesita los edificios.
 */
export function generarRetícula(
  aptos: Uint8Array, tilesU: number, tilesV: number, centro: { u: number; v: number }, rng: Rng,
  radio: number = 40, cfg: ConfigCalles = CFG_CALLES,
): RedCalles {
  const tiles = new Uint8Array(tilesU * tilesV);
  const trazados: TrazadoCalle[] = [];
  const lim = alcance(aptos, tilesU, tilesV, centro, radio);
  const rPrincipal = cfg.anchoPrincipal / 2;
  const rTravesia = cfg.anchoTravesia / 2;
  const cu = Math.round(centro.u);
  const cv = Math.round(centro.v);

  /** Polilínea ondulada a lo largo de un eje fijo, de `a` a `b` en el otro eje. */
  const ondulada = (fijo: number, a: number, b: number, eje: 'u' | 'v'): { u: number; v: number }[] => {
    const pts: { u: number; v: number }[] = [];
    for (let s = a; s < b; s += 3) {
      const desvio = (rng() - 0.5) * 1.6;
      pts.push(eje === 'u' ? { u: fijo + desvio, v: s } : { u: s, v: fijo + desvio });
    }
    const desvioFinal = (rng() - 0.5) * 1.6;
    pts.push(eje === 'u' ? { u: fijo + desvioFinal, v: b } : { u: b, v: fijo + desvioFinal });
    return pts;
  };

  const kMax = Math.ceil(Math.max(tilesU, tilesV) / cfg.sep) + 1;
  const verticales: number[] = [];
  const horizontales: number[] = [];
  for (let k = -kMax; k <= kMax; k++) {
    const u = cu + k * cfg.sep;
    if (u >= lim.u0 && u <= lim.u1) verticales.push(u);
    const v = cv + k * cfg.sep;
    if (v >= lim.v0 && v <= lim.v1) horizontales.push(v);
  }
  for (const u of verticales) {
    const pts = ondulada(u, lim.v0, lim.v1, 'u');
    marcarTrazado(tiles, aptos, tilesU, tilesV, pts, rPrincipal, CALLE_ROCA);
    trazados.push({ material: 'roca', ancho: cfg.anchoPrincipal, puntos: pts });
  }
  for (const v of horizontales) {
    const pts = ondulada(v, lim.u0, lim.u1, 'v');
    marcarTrazado(tiles, aptos, tilesU, tilesV, pts, rPrincipal, CALLE_ROCA);
    trazados.push({ material: 'roca', ancho: cfg.anchoPrincipal, puntos: pts });
  }

  // Travesías: tierra estrecha entre dos calles principales consecutivas, por el medio de la manzana.
  const salto = Math.max(4, cfg.sep - 2);
  for (let k = -kMax; k <= kMax; k++) {
    const u = cu + Math.round(k * cfg.sep + cfg.sep / 2);
    if (u >= lim.u0 + 1 && u <= lim.u1 - 1) {
      for (let v = lim.v0; v + salto <= lim.v1; v += cfg.sep) {
        const pts = [{ u, v }, { u, v: v + salto }];
        marcarTrazado(tiles, aptos, tilesU, tilesV, pts, rTravesia, CALLE_TIERRA);
        trazados.push({ material: 'tierra', ancho: cfg.anchoTravesia, puntos: pts });
      }
    }
    const v = cv + Math.round(k * cfg.sep + cfg.sep / 2);
    if (v >= lim.v0 + 1 && v <= lim.v1 - 1) {
      for (let u = lim.u0; u + salto <= lim.u1; u += cfg.sep) {
        const pts = [{ u, v }, { u: u + salto, v }];
        marcarTrazado(tiles, aptos, tilesU, tilesV, pts, rTravesia, CALLE_TIERRA);
        trazados.push({ material: 'tierra', ancho: cfg.anchoTravesia, puntos: pts });
      }
    }
  }

  return { tiles, trazados };
}

/** Borde de la huella más cercano a (hu, hv): punto de salida del ramal, fuera del edificio. */
function bordeHacia(e: { u: number; v: number; w: number; d: number }, hu: number, hv: number): { u: number; v: number } {
  const du = hu - (e.u + e.w / 2);
  const dv = hv - (e.v + e.d / 2);
  // Se sale por el lado dominante para no cruzar la huella en diagonal.
  if (Math.abs(du) >= Math.abs(dv)) return { u: du >= 0 ? e.u + e.w : e.u, v: e.v + e.d / 2 };
  return { u: e.u + e.w / 2, v: dv >= 0 ? e.v + e.d : e.v };
}

/**
 * Añade los ramales de tierra: de la puerta de cada edificio a la calle de roca más cercana. Se llama después de
 * colocar los edificios; modifica `red` en el sitio y devuelve cuántos ramales añadió. El ramal sale del borde de
 * la huella, así que no pinta encima del edificio ni reserva sus tiles.
 */
export function añadirRamales(
  red: RedCalles, aptos: Uint8Array, tilesU: number, tilesV: number,
  edificios: readonly { u: number; v: number; w: number; d: number }[], cfg: ConfigCalles = CFG_CALLES,
): number {
  const rTravesia = cfg.anchoTravesia / 2;
  let n = 0;
  for (const e of edificios) {
    const pu = e.u + e.w / 2;
    const pv = e.v + e.d / 2;
    let mejor: { u: number; v: number } | null = null;
    let mejorD = Infinity;
    for (let v = 0; v < tilesV; v++) {
      for (let u = 0; u < tilesU; u++) {
        if (red.tiles[v * tilesU + u] !== CALLE_ROCA) continue;
        const d = Math.hypot(u - pu, v - pv);
        if (d < mejorD) { mejorD = d; mejor = { u, v }; }
      }
    }
    if (!mejor || mejorD > 18) continue;
    const pts = [bordeHacia(e, mejor.u, mejor.v), { u: mejor.u, v: mejor.v }];
    marcarTrazado(red.tiles, aptos, tilesU, tilesV, pts, rTravesia, CALLE_TIERRA);
    red.trazados.push({ material: 'tierra', ancho: cfg.anchoTravesia, puntos: pts });
    n++;
  }
  return n;
}

/** Cuántos tiles ocupa cada material de calle. */
export function contarCalles(red: RedCalles): { roca: number; tierra: number } {
  let roca = 0;
  let tierra = 0;
  for (const t of red.tiles) {
    if (t === CALLE_ROCA) roca++;
    else if (t === CALLE_TIERRA) tierra++;
  }
  return { roca, tierra };
}

/** Ancho mínimo entre huellas de edificios que deja la red: el de las calles principales (§10.9). */
export function anchoMinimoManzana(cfg: ConfigCalles = CFG_CALLES): number {
  return cfg.anchoPrincipal;
}
