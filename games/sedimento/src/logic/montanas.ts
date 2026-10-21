// Colocación determinista de las piezas de montaña (R84, D033): macizos y picos en las cumbres, cordilleras
// encadenadas sobre las líneas de cumbre, colinas en las alturas medias, acantilados en las laderas fuertes
// y pies de ladera en el borde. Lógica pura y determinista: misma semilla → mismas piezas, sin Phaser.
import tuning from '../data/tuning.json';
import { crearRng, derivarSemilla, type Rng } from './azar';
import type { Catalogo } from './aldeaReferencia';
import type { Superficie } from './horneado';
import type { Huella } from './iso';

export type ConfigMontanas = typeof tuning.horneado.montanas;

export type TipoMontana = 'macizo' | 'pico' | 'cresta' | 'colina' | 'acantilado' | 'pie';

/** Una pieza colocada: `u`,`v` es la esquina trasera de la huella (enteros), como en las estructuras. */
export interface PiezaMontana {
  id: string;
  tipo: TipoMontana;
  u: number;
  v: number;
  w: number;
  d: number;
}

export interface Montanas {
  semilla: number;
  piezas: PiezaMontana[];
  /** Cumbres donde se apoyó cada macizo o pico (para depurar y para los yacimientos de montaña). */
  cumbres: { u: number; v: number; altura: number }[];
}

/** Prefijo de cada familia en el atlas. */
const FAMILIA: Record<TipoMontana, string> = {
  macizo: 'montana_macizo_',
  pico: 'montana_pico_',
  cresta: 'montana_cresta_',
  colina: 'montana_colina_4x3_',
  acantilado: 'montana_acantilado_',
  pie: 'montana_pie_ladera_',
};

/**
 * Exigencia de cada tipo: altura mínima en el tile central, media mínima bajo la huella y desnivel máximo
 * (máx − mín) que la pieza puede disimular. Las piezas grandes van sobre sierras, así que su desnivel es amplio:
 * lo que decide dónde cae el macizo es que su centro esté en una cumbre y su media sea alta.
 */
interface Exigencia { centro: number; media: number; desnivel: number }

function exigencias(cfg: ConfigMontanas): Record<TipoMontana, Exigencia> {
  return {
    macizo: { centro: cfg.alturaMacizo, media: cfg.mediaMacizo, desnivel: cfg.desnivelMacizo },
    pico: { centro: cfg.alturaPico, media: cfg.mediaPico, desnivel: cfg.desnivelPico },
    cresta: { centro: cfg.alturaMinCumbre, media: cfg.mediaCresta, desnivel: cfg.desnivelCresta },
    colina: { centro: cfg.mediaColina, media: cfg.mediaColina, desnivel: cfg.desnivelColina },
    acantilado: { centro: 0, media: 0, desnivel: cfg.desnivelAcantilado },
    pie: { centro: 0, media: cfg.mediaPie, desnivel: cfg.desnivelPie },
  };
}

const LIBRE = 0;
const HUELLA = 1;

interface Contexto {
  sup: Superficie;
  tilesU: number;
  tilesV: number;
  cfg: ConfigMontanas;
  exige: Record<TipoMontana, Exigencia>;
  /** HUELLA donde hay pieza; el resto, LIBRE. */
  mapa: Uint8Array;
  /** Ids del atlas por familia, ordenados (elección determinista). */
  ids: Record<TipoMontana, string[]>;
  cat: Catalogo;
  rng: Rng;
  piezas: PiezaMontana[];
}

const dentro = (c: Contexto, u: number, v: number): boolean => u >= 0 && v >= 0 && u < c.tilesU && v < c.tilesV;

/** Tile central de la huella: el que manda para las exigencias de altura (única definición, la usan lógica y tests). */
export function centroPieza(p: PiezaMontana): { u: number; v: number } {
  return { u: p.u + Math.floor(p.w / 2), v: p.v + Math.floor(p.d / 2) };
}

/** Altura del suelo en el centro del tile (u, v). */
const alturaEn = (c: Contexto, u: number, v: number): number => c.sup.suelo(u + 0.5, v + 0.5);

const secoEn = (c: Contexto, u: number, v: number): boolean => {
  const a = c.sup.agua(u + 0.5, v + 0.5);
  return Number.isNaN(a) || a <= c.sup.suelo(u + 0.5, v + 0.5);
};

/** Desnivel (máx − mín) del suelo bajo una huella, o `Infinity` si se sale del mapa. */
function desnivelBajo(c: Contexto, u: number, v: number, w: number, d: number): number {
  if (!dentro(c, u, v) || !dentro(c, u + w - 1, v + d - 1)) return Infinity;
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < w; i++) {
      const h = alturaEn(c, u + i, v + j);
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }
  return max - min;
}

/**
 * ¿Cumple la huella `w`×`d` con esquina (u, v) la exigencia de `tipo`? Seca, libre, con el centro lo bastante
 * alto, la media suficiente y el desnivel tolerable. Devuelve la media, o `null` si no vale.
 */
function cabe(c: Contexto, tipo: TipoMontana, u: number, v: number, w: number, d: number): number | null {
  if (!dentro(c, u, v) || !dentro(c, u + w - 1, v + d - 1)) return null;
  const ex = c.exige[tipo];
  let suma = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < w; i++) {
      const x = u + i;
      const y = v + j;
      if (!secoEn(c, x, y) || c.mapa[y * c.tilesU + x] !== LIBRE) return null;
      const h = alturaEn(c, x, y);
      if (h < min) min = h;
      if (h > max) max = h;
      suma += h;
    }
  }
  if (max - min > ex.desnivel) return null;
  const centro = centroPieza({ id: '', tipo, u, v, w, d });
  if (alturaEn(c, centro.u, centro.v) < ex.centro) return null;
  const media = suma / (w * d);
  return media >= ex.media ? media : null;
}

function ocupar(c: Contexto, u: number, v: number, w: number, d: number): void {
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < w; i++) {
      const x = u + i;
      const y = v + j;
      if (dentro(c, x, y)) c.mapa[y * c.tilesU + x] = HUELLA;
    }
  }
}

/**
 * Coloca una pieza de `tipo` con su ancla lo más cerca posible de (cu, cv), eligiendo entre los encuadres que
 * cumplen el más llano (desempate por distancia y luego por esquina). La silueta se sortea con el azar del
 * sistema, así añadir piezas nuevas a una familia no cambia las demás colocaciones.
 */
function colocar(c: Contexto, tipo: TipoMontana, cu: number, cv: number, radio: number = c.cfg.radioEncuadre): PiezaMontana | null {
  const ids = c.ids[tipo];
  if (ids.length === 0 || c.piezas.length >= c.cfg.maxPiezas) return null;
  const id = ids[Math.floor(c.rng() * ids.length)];
  const { w, d } = c.cat[id].huella;
  const u0 = Math.round(cu - w / 2);
  const v0 = Math.round(cv - d / 2);
  let mejor: { u: number; v: number; puntos: number } | null = null;
  for (let dv = -radio; dv <= radio; dv++) {
    for (let du = -radio; du <= radio; du++) {
      const u = u0 + du;
      const v = v0 + dv;
      if (cabe(c, tipo, u, v, w, d) === null) continue;
      const puntos = desnivelBajo(c, u, v, w, d) + 0.02 * Math.hypot(du, dv) + 1e-4 * (u + v);
      if (mejor === null || puntos < mejor.puntos) mejor = { u, v, puntos };
    }
  }
  if (mejor === null) return null;
  ocupar(c, mejor.u, mejor.v, w, d);
  const p: PiezaMontana = { id, tipo, u: mejor.u, v: mejor.v, w, d };
  c.piezas.push(p);
  return p;
}

/** Coloca una pieza con su esquina trasera exactamente en (u, v), sin buscar encuadre. */
function colocarEn(c: Contexto, tipo: TipoMontana, u: number, v: number): PiezaMontana | null {
  const ids = c.ids[tipo];
  if (ids.length === 0 || c.piezas.length >= c.cfg.maxPiezas) return null;
  const id = ids[Math.floor(c.rng() * ids.length)];
  const { w, d } = c.cat[id].huella;
  if (cabe(c, tipo, u, v, w, d) === null) return null;
  ocupar(c, u, v, w, d);
  const p: PiezaMontana = { id, tipo, u, v, w, d };
  c.piezas.push(p);
  return p;
}

/** Cumbres: máximos locales secos por encima de `alturaMinCumbre`, de mayor a menor (orden fijo). */
function buscarCumbres(c: Contexto): { u: number; v: number; altura: number }[] {
  const r = c.cfg.distanciaMinCumbre;
  const cumbres: { u: number; v: number; altura: number }[] = [];
  for (let v = 0; v < c.tilesV; v++) {
    for (let u = 0; u < c.tilesU; u++) {
      if (!secoEn(c, u, v)) continue;
      const h = alturaEn(c, u, v);
      if (h < c.cfg.alturaMinCumbre) continue;
      let esMax = true;
      for (let j = -r; j <= r && esMax; j++) {
        for (let i = -r; i <= r; i++) {
          if (i === 0 && j === 0) continue;
          if (!dentro(c, u + i, v + j)) continue;
          if (alturaEn(c, u + i, v + j) > h + 1e-9) { esMax = false; break; }
        }
      }
      if (esMax) cumbres.push({ u, v, altura: h });
    }
  }
  // Determinista: la más alta primero; a igualdad, la de (u, v) menor.
  cumbres.sort((a, b) => b.altura - a.altura || a.u - b.u || a.v - b.v);
  return cumbres;
}

/** Direcciones de cadena: la cresta se encadena a lo largo de u (el eje del sprite). */
const DIRECCIONES: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Encadena crestas desde una pieza ya colocada, a lo largo de su eje (u), con solape: la cordillera sigue la
 * línea de cumbre derramando ±1 tile en v según dónde el terreno siga alto. Determinista.
 */
function encadenar(c: Contexto, base: PiezaMontana): void {
  const idCresta = c.ids.cresta[0];
  if (!idCresta) return;
  const { w, d } = c.cat[idCresta].huella;
  const avance = Math.max(1, w - c.cfg.solapeCadena);
  const sentidos = c.rng() < 0.5 ? [1, -1] : [-1, 1];
  for (const sentido of sentidos) {
    // El primer tramo nace justo fuera de la pieza base, y cada tramo siguiente solapa con el anterior.
    let u = sentido > 0 ? base.u + base.w : base.u - w;
    let v = base.v + Math.round((base.d - d) / 2);
    let saltos = 0;
    for (let n = 0; n < c.cfg.maxCadena; n++) {
      // Deriva en v: de los desplazamientos, el que deje el centro más alto (y cumpla la exigencia).
      let elegido: { u: number; v: number } | null = null;
      let mejorAltura = -Infinity;
      for (const dv of [0, -1, 1, -2, 2]) {
        const vSig = v + dv;
        if (cabe(c, 'cresta', u, vSig, w, d) === null) continue;
        const h = alturaEn(c, u + Math.floor(w / 2), vSig + Math.floor(d / 2));
        if (h > mejorAltura) {
          mejorAltura = h;
          elegido = { u, v: vSig };
        }
      }
      if (!elegido) {
        // Un hueco (agua, otra pieza) no corta la cordillera: salta un tramo y sigue, pero no más de dos veces.
        if (saltos >= 2) break;
        saltos++;
        u += sentido * avance;
        continue;
      }
      const p = colocarEn(c, 'cresta', elegido.u, elegido.v);
      if (!p) break;
      u = p.u;
      v = p.v;
      u += sentido * avance;
    }
  }
}

/** Colinas suaves en las alturas medias, repartidas con separación mínima entre ellas. */
function plantarColinas(c: Contexto, cumbres: { u: number; v: number }[]): void {
  const candidatas: { u: number; v: number; h: number }[] = [];
  for (let v = 0; v < c.tilesV; v++) {
    for (let u = 0; u < c.tilesU; u++) {
      if (c.mapa[v * c.tilesU + u] !== LIBRE || !secoEn(c, u, v)) continue;
      const h = alturaEn(c, u, v);
      if (h < c.exige.colina.media || h >= c.exige.macizo.media) continue;
      candidatas.push({ u, v, h });
    }
  }
  // Ordenadas por altura y, a igualdad, por (u, v): reparto determinista de dentro hacia fuera.
  candidatas.sort((a, b) => b.h - a.h || a.u - b.u || a.v - b.v);
  const ocupadas: { u: number; v: number }[] = [...cumbres];
  const sep = c.cfg.distanciaMinCumbre;
  for (const q of candidatas) {
    if (c.piezas.length >= c.cfg.maxPiezas) break;
    if (ocupadas.some((o) => Math.hypot(o.u - q.u, o.v - q.v) < sep)) continue;
    if (colocar(c, 'colina', q.u + 0.5, q.v + 0.5)) ocupadas.push({ u: q.u, v: q.v });
  }
}

/** Acantilados en las laderas fuertes junto a una pieza, y pies de ladera en su borde exterior. */
function vestirLaderas(c: Contexto): void {
  const pendiente = (u: number, v: number): number => {
    const h = alturaEn(c, u, v);
    let g = 0;
    for (const [du, dv] of DIRECCIONES) {
      if (!dentro(c, u + du, v + dv)) continue;
      g = Math.max(g, Math.abs(alturaEn(c, u + du, v + dv) - h));
    }
    return g;
  };
  // Vecinos libres de las huellas ya puestas, en orden fijo: primero los acantilados, luego los pies.
  const borde: { u: number; v: number; pend: number }[] = [];
  for (let v = 0; v < c.tilesV; v++) {
    for (let u = 0; u < c.tilesU; u++) {
      if (c.mapa[v * c.tilesU + u] !== LIBRE || !secoEn(c, u, v)) continue;
      let toca = false;
      for (let j = -1; j <= 1 && !toca; j++) {
        for (let i = -1; i <= 1; i++) {
          if (i === 0 && j === 0) continue;
          const x = u + i;
          const y = v + j;
          if (dentro(c, x, y) && c.mapa[y * c.tilesU + x] === HUELLA) { toca = true; break; }
        }
      }
      if (toca) borde.push({ u, v, pend: pendiente(u, v) });
    }
  }
  borde.sort((a, b) => b.pend - a.pend || a.u - b.u || a.v - b.v);
  // Solo los tramos de ladera fuerte, y como mucho uno de cada `pasoLadera`: no se trata de llenar el borde.
  const paso = c.cfg.pasoLadera;
  let n = 0;
  for (const b of borde) {
    if (c.piezas.length >= c.cfg.maxPiezas || n >= c.cfg.maxAcantilados) break;
    if (b.pend < c.cfg.pendienteAcantilado) continue;
    if (n % paso !== 0) { n++; continue; }
    if (colocar(c, 'acantilado', b.u + 0.5, b.v + 0.5)) n++;
  }
  // Pies de ladera: el anillo exterior de la montaña, también espaciados.
  let m = 0;
  for (const b of borde) {
    if (c.piezas.length >= c.cfg.maxPiezas || m >= c.cfg.maxPies) break;
    if (m % paso !== 0) { m++; continue; }
    if (colocar(c, 'pie', b.u + 0.5, b.v + 0.5)) m++;
  }
}

/** Genera las montañas. `semilla` + superficie + catálogo → siempre el mismo resultado. */
export function generarMontanas(
  sup: Superficie, tilesU: number, tilesV: number, cat: Catalogo, semilla: number, cfg: ConfigMontanas = tuning.horneado.montanas,
): Montanas {
  const rng = crearRng(derivarSemilla(semilla, 'montanas'));
  const ids = {} as Record<TipoMontana, string[]>;
  for (const tipo of Object.keys(FAMILIA) as TipoMontana[]) {
    ids[tipo] = Object.keys(cat).filter((id) => id.startsWith(FAMILIA[tipo])).sort();
  }
  const c: Contexto = {
    sup, tilesU, tilesV, cfg, exige: exigencias(cfg), mapa: new Uint8Array(tilesU * tilesV), ids, cat, rng, piezas: [],
  };

  const cumbres = buscarCumbres(c);
  const puestas: { u: number; v: number; altura: number }[] = [];
  for (const cumbre of cumbres) {
    if (c.piezas.length >= cfg.maxPiezas) break;
    // El macizo, si la cumbre es alta; si no, el pico.
    const p = cumbre.altura >= cfg.alturaMacizo
      ? colocar(c, 'macizo', cumbre.u + 0.5, cumbre.v + 0.5)
      : colocar(c, 'pico', cumbre.u + 0.5, cumbre.v + 0.5);
    if (p) {
      puestas.push(cumbre);
      encadenar(c, p);
    }
  }
  plantarColinas(c, puestas);
  vestirLaderas(c);
  // Orden de dibujo estable: por esquina trasera, como el resto del mundo.
  c.piezas.sort((a, b) => (a.u + a.v) - (b.u + b.v) || a.u - b.u || a.v - b.v);
  return { semilla, piezas: c.piezas, cumbres: puestas };
}

/** ¿Solapan dos piezas? (prueba de propiedad: nunca debe pasar) */
export function solapan(a: PiezaMontana, b: PiezaMontana): boolean {
  return a.u < b.u + b.w && b.u < a.u + a.w && a.v < b.v + b.d && b.v < a.v + a.d;
}

/** Huellas de todas las piezas, para que P3 las marque como bloqueadas. */
export function huellas(m: Montanas): Huella[] {
  return m.piezas.map((p) => ({ w: p.w, d: p.d }));
}

/** ¿El tile (u, v) queda cubierto por la huella de alguna pieza? (bloqueado para P3) */
export function bloqueado(m: Montanas, u: number, v: number): boolean {
  return m.piezas.some((p) => u >= p.u && u < p.u + p.w && v >= p.v && v < p.v + p.d);
}

/**
 * ¿Se puede pisar el tile (u, v) y hay por dónde llegar? Libre de huellas y con al menos un vecino libre:
 * la comprobación mínima de que un yacimiento al pie de la montaña no queda tapiado (P3 hará la rejilla completa).
 */
export function accesible(m: Montanas, u: number, v: number): boolean {
  if (bloqueado(m, u, v)) return false;
  for (const [du, dv] of DIRECCIONES) if (!bloqueado(m, u + du, v + dv)) return true;
  return false;
}
