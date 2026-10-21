// Pintor de caminos (P3b1, D039): convierte la máscara de subceldas en índices de paleta estampados sobre la
// imagen de terreno horneada. No usa piezas ni rejilla: interpola la distancia con signo de la máscara a nivel
// de píxel, le suma ruido y umbraliza, así que los bordes salen irregulares y las curvas y cruces son continuos.
//
//   tierra : apisonada, con dos rodadas, motas y borde que se funde con la hierba por tramado
//   roca   : empedrado de cantos irregulares (Voronoi en el suelo) con juntas oscuras; luz desde la izquierda
//
// Lógica pura y determinista (sin Phaser ni DOM): mismos datos y semilla → mismos índices.
import tuning from '../data/tuning.json';
import { RAMPAS, tonoDe } from '../data/paleta';
import { SUB, ROCA, TIERRA, type MascaraCaminos } from './caminosMascara';
import { sdf } from './caminosMascara';

const CFG = tuning.caminoPintor;

/** Tonos por material, del oscuro al claro, tomados de las rampas de la paleta de 59 (R49). */
const T_ROCA = RAMPAS.roca;
const T_TIERRA = RAMPAS.tierra;
const HIERBA_MATA = tonoDe('hierba', 4);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Hash entero determinista a [0, 1); mismo patrón que el resto del juego (sin Math.random). */
function hash2(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ (s | 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de valor bilineal, solo aritmética entera (mismo sabor que `logic/ruido.ts`). */
function ruido(s: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, s);
  const b = hash2(x0 + 1, y0, s);
  const c = hash2(x0, y0 + 1, s);
  const d = hash2(x0 + 1, y0 + 1, s);
  const arriba = a + (b - a) * sx;
  const abajo = c + (d - c) * sx;
  return arriba + (abajo - arriba) * sy;
}

/** SDF de los dos materiales, para no recalcularlos por trozo. */
export interface SdfCaminos {
  roca: Float32Array;
  tierra: Float32Array;
  subU: number;
  subV: number;
}

/**
 * Prepara los SDF de una máscara: roca puro y «tierra o borde de la roca» (la roca lleva un hombro de tierra,
 * así el empedrado no corta contra la hierba, como en el boceto CAM1).
 */
export function prepararSdf(m: MascaraCaminos): SdfCaminos {
  const tierra = sdf(m, TIERRA);
  const roca = sdf(m, ROCA);
  // La roca se dilata una subcelda para el hombro de tierra: se prueba la roca desplazada en las 4 direcciones.
  const { subU, subV } = m;
  const hombro = new Float32Array(subU * subV);
  for (let sv = 0; sv < subV; sv++) {
    for (let su = 0; su < subU; su++) {
      const k = sv * subU + su;
      const a = roca[k];
      const r = su + 1 < subU ? roca[k + 1] : -1e9;
      const l = su > 0 ? roca[k - 1] : -1e9;
      const dn = sv + 1 < subV ? roca[k + subU] : -1e9;
      const up = sv > 0 ? roca[k - subU] : -1e9;
      const vecino = Math.max(r, l, dn, up) - 1;
      hombro[k] = Math.max(a, vecino);
    }
  }
  const combinado = new Float32Array(subU * subV);
  for (let k = 0; k < combinado.length; k++) combinado[k] = Math.max(tierra[k], hombro[k]);
  return { roca, tierra: combinado, subU, subV };
}

/** Muestreo bilineal del SDF en coordenadas de subcelda (clamp en los bordes). */
function muestrearSdf(a: Float32Array, subU: number, subV: number, su: number, sv: number): number {
  const x = Math.max(0, Math.min(subU - 1.001, su - 0.5));
  const y = Math.max(0, Math.min(subV - 1.001, sv - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(subU - 1, x0 + 1);
  const y1 = Math.min(subV - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const a00 = a[y0 * subU + x0];
  const a10 = a[y0 * subU + x1];
  const a01 = a[y1 * subU + x0];
  const a11 = a[y1 * subU + x1];
  return (a00 * (1 - fx) + a10 * fx) * (1 - fy) + (a01 * (1 - fx) + a11 * fx) * fy;
}

/** Región rectangular de la imagen a pintar (esquina superior izquierda y tamaño). */
export interface Region {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface PintorCaminos {
  /** Esquina superior izquierda de la imagen completa en píxeles de mundo (igual que el horneado). */
  origenX: number;
  origenY: number;
  tileAncho: number;
  tileAlto: number;
  semilla: number;
}

/**
 * Pinta los caminos de `sdf` sobre `datos` (índices de paleta, `ancho`×`alto`), solo en `region`.
 * Devuelve cuántos píxeles cambió. El llamador decide cuándo repintar (al trazar un camino, P3b2).
 */
export function pintarRegión(
  datos: Uint8Array, ancho: number, alto: number, region: Region, sdfC: SdfCaminos, cfg: PintorCaminos,
): number {
  const x0 = Math.max(0, region.x);
  const y0 = Math.max(0, region.y);
  const x1 = Math.min(ancho, region.x + region.ancho);
  const y1 = Math.min(alto, region.y + region.alto);
  let cambios = 0;
  const { roca, tierra, subU, subV } = sdfC;
  const medioAncho = cfg.tileAncho / 2;
  const medioAlto = cfg.tileAlto / 2;
  for (let j = y0; j < y1; j++) {
    const ys = cfg.origenY + j + 0.5;
    for (let i = x0; i < x1; i++) {
      const xs = cfg.origenX + i + 0.5;
      // Píxel de pantalla → tile → subcelda (misma proyección que `logic/iso.ts`).
      const ut = xs / medioAncho + ys / medioAlto;
      const vt = ys / medioAlto - xs / medioAncho;
      const us = ut * SUB;
      const vs = vt * SUB;
      const ug = ut * 16;
      const vg = vt * 16;
      const nr = ruido(cfg.semilla, ug * CFG.escalaRuidoGrueso, vg * CFG.escalaRuidoGrueso);
      const nr2 = ruido(cfg.semilla + 3, ug * CFG.escalaRuidoFino + 7, vg * CFG.escalaRuidoFino);
      const sRoca = muestrearSdf(roca, subU, subV, us, vs) + (nr - 0.5) * CFG.ruidoBordeRoca;
      const sTierra = muestrearSdf(tierra, subU, subV, us, vs) + (nr - 0.5) * CFG.ruidoBordeTierra;
      const b = BAYER[(j & 3) * 4 + (i & 3)];
      const esRoca = sRoca > 0;
      const aT = Math.max(0, Math.min(1, sTierra / 1.4));
      const esTierra = aT + b * 0.8 > CFG.umbralTierra && sTierra > -0.2;
      if (!esRoca && !esTierra) continue;
      const p = j * ancho + i;
      const idx = esRoca ? tonoRoca(ug, vg, i, j, sRoca, nr2, cfg.semilla) : tonoPais(ug, vg, i, j, aT, sTierra, nr, nr2, cfg.semilla);
      if (datos[p] !== idx) { datos[p] = idx; cambios++; }
    }
  }
  return cambios;
}

/** Tono de la tierra apisonada: dos rodadas, motas, borde más oscuro y matas de hierba que lo invaden. */
function tonoPais(
  ug: number, vg: number, i: number, j: number, a: number, s: number, nr: number, nr2: number, semilla: number,
): number {
  // Matas de hierba en el borde, por tramado: funden el camino con el prado sin rejilla visible.
  if (a < CFG.grasaHierba && hash2(i >> 1, j >> 1, semilla + 9) > 0.62) return HIERBA_MATA;
  let tn = 2.15 + (nr2 - 0.5) * 1.5 + (nr - 0.5) * 0.8;
  if (a < 0.55) tn -= 0.9;                                                  // borde más oscuro y húmedo
  const rodada = Math.abs(s - CFG.rodadaDist) < CFG.rodadaAncho && hash2(Math.floor(ug / 3), Math.floor(vg / 3), semilla + 5) > 0.15;
  if (rodada) tn -= 1.0;
  const cresta = Math.abs(s - CFG.crestaDist) < 0.35 && nr2 > 0.45;         // lomo central entre las rodadas
  if (cresta) tn += 0.7;
  const mota = hash2(i, j, semilla + 8);
  if (mota > 0.965) tn += 1.6;
  else if (mota < 0.03) tn -= 1.0;
  return tonoDe('tierra', Math.max(0, Math.min(T_TIERRA.length - 1, Math.round(tn))));
}

/** Tono del empedrado: Voronoi de cantos con juntas oscuras y luz desde la izquierda. */
function tonoRoca(
  ug: number, vg: number, i: number, j: number, s: number, nr2: number, semilla: number,
): number {
  const cel = CFG.celdaCanto;
  const gi = Math.floor(ug / cel);
  const gj = Math.floor(vg / cel);
  let d1 = 1e9;
  let d2 = 1e9;
  let idc = 0;
  let cu = 0;
  let cv = 0;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const ci = gi + di;
      const cj = gj + dj;
      const pu = (ci + 0.15 + 0.7 * hash2(ci, cj, semilla + 1)) * cel;
      const pv = (cj + 0.15 + 0.7 * hash2(ci, cj, semilla + 2)) * cel;
      const d = Math.hypot(ug - pu, vg - pv);
      if (d < d1) {
        d2 = d1;
        idc = hash2(ci, cj, semilla + 3);
        cu = pu;
        cv = pv;
        d1 = d;
      } else if (d < d2) d2 = d;
    }
  }
  const junta = d2 - d1 < 0.95;
  const dx = ug - cu - (vg - cv);
  const dy = (ug - cu + (vg - cv)) / 2;
  const luz = Math.max(-1, Math.min(1, -(dx * 0.5 + dy * 0.85) / 3.0));
  let base = 2.0 + 1.1 * (idc > 0.55 ? 1 : 0) + 0.7 * (idc > 0.88 ? 1 : 0) - 0.6 * (idc < 0.18 ? 1 : 0);
  base += luz * 0.95 + (nr2 - 0.5) * 0.5;
  let idx = tonoDe('roca', Math.max(0, Math.min(T_ROCA.length - 1, Math.round(base))));
  const calido = idc > 0.9 && !junta;
  if (calido) idx = luz > 0 ? tonoDe('tierra', 3) : tonoDe('tierra', 2);
  if (junta) {
    idx = hash2(i, j, semilla + 11) > 0.8 ? tonoDe('tierra', 1) : nr2 > 0.5 ? tonoDe('roca', 1) : tonoDe('roca', 0);
  }
  // El canto de la calle: cantos a medias y más oscuros donde el SDF está cerca de 0.
  if (s > 0 && s < 0.9 && hash2(i, j, semilla + 12) > 0.55) idx = junta ? tonoDe('roca', 0) : tonoDe('roca', 1);
  return idx;
}
