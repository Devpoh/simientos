// Aldea de referencia: una población grande y viva sobre el terreno procedural, para ver el juego «lleno» y medir los 60 fps (R56).
// Lógica pura y determinista (semilla → mismos elementos). No usa Phaser. Todo va en huecos libres de la rejilla:
// fuera del agua, sin pendiente fuerte y con calles de ≥ 1 tile entre edificios (§10.9).
import tuning from '../data/tuning.json';
import { crearRng, derivarSemilla, type Rng } from './azar';
import type { Superficie } from './horneado';
import type { Huella } from './iso';

export type ConfigAldea = typeof tuning.aldea;

/** Lo mínimo que la aldea necesita saber de un sprite del atlas (`AtlasPixel['sprites']` lo cumple). */
export interface SpriteCatalogo {
  categoria: string;
  huella: Huella;
  etapas?: string[];
  estados: Record<string, unknown>;
}
export type Catalogo = Record<string, SpriteCatalogo>;

export type TipoElemento = 'edificio' | 'arbol' | 'prop';
export type OrientacionAldea = 'se' | 'sw' | 'ne' | 'nw' | 'u' | 'v' | 'unica';

/** Algo que ocupa tiles: `u`,`v` es la esquina trasera de la huella (enteros). */
export interface Elemento {
  id: string;
  tipo: TipoElemento;
  u: number;
  v: number;
  w: number;
  d: number;
  /** Estado del atlas; `undefined` = el primero. En edificios con etapas, la etapa de obra. */
  estado?: string;
  ori: OrientacionAldea;
}

/** Ciudadano o animal: un punto (u, v) en tiles; si tiene `ruta`, va y vuelve en línea recta hasta (u1, v1). */
export interface Unidad {
  id: string;
  clase: 'ciudadano' | 'animal';
  u: number;
  v: number;
  /** Estado en el sitio (cultivar, pastar, idle…). */
  estado: string;
  ori: OrientacionAldea;
  ruta?: { u1: number; v1: number };
  /** Desfase de animación (0..1): evita que todos muevan el mismo fotograma a la vez. */
  fase: number;
}

export interface Aldea {
  semilla: number;
  centro: { u: number; v: number };
  edificios: Elemento[];
  arboles: Elemento[];
  props: Elemento[];
  unidades: Unidad[];
}

/** Cuadrícula de tiles aptos: seco por completo y sin pendiente fuerte. 1 = apto. */
export function calcularAptos(
  sup: Superficie, tilesU: number, tilesV: number, pendienteMax: number = tuning.aldea.pendienteMax,
): Uint8Array {
  const aptos = new Uint8Array(tilesU * tilesV);
  const seco = (u: number, v: number): boolean => {
    const a = sup.agua(u, v);
    return Number.isNaN(a) || a <= sup.suelo(u, v);
  };
  for (let v = 0; v < tilesV; v++) {
    for (let u = 0; u < tilesU; u++) {
      const h = sup.suelo(u + 0.5, v + 0.5);
      let ok = seco(u + 0.5, v + 0.5);
      for (let k = 0; k < 4 && ok; k++) {
        const cu = u + (k & 1);
        const cv = v + (k >> 1);
        ok = seco(cu, cv) && Math.abs(sup.suelo(cu, cv) - h) <= pendienteMax;
      }
      aptos[v * tilesU + u] = ok ? 1 : 0;
    }
  }
  return aptos;
}

const LIBRE = 0;
const HUELLA = 1;
const ARBOL = 2;
const CALLE = 3;

/** Reparto con peso: devuelve un índice. */
function elegirPeso(rng: Rng, pesos: readonly number[]): number {
  const total = pesos.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < pesos.length; i++) {
    x -= pesos[i];
    if (x < 0) return i;
  }
  return pesos.length - 1;
}

function elegir<T>(rng: Rng, lista: readonly T[]): T {
  return lista[Math.floor(rng() * lista.length)];
}

interface Contexto {
  sup: Superficie;
  tilesU: number;
  tilesV: number;
  aptos: Uint8Array;
  /** Tiles donde puede crecer un árbol: secos y con pendiente tolerable (incluye laderas). */
  arbolables: Uint8Array;
  /** LIBRE / HUELLA / ARBOL / CALLE por tile. */
  mapa: Uint8Array;
  cfg: ConfigAldea;
  cat: Catalogo;
  rng: Rng;
}

const dentro = (c: Contexto, u: number, v: number): boolean => u >= 0 && v >= 0 && u < c.tilesU && v < c.tilesV;

/** ¿Cabe una huella de w×d con esquina (u,v)? Todo apto, libre y con poco desnivel. */
function cabe(c: Contexto, u: number, v: number, w: number, d: number, base: Uint8Array = c.aptos): boolean {
  if (!dentro(c, u, v) || !dentro(c, u + w - 1, v + d - 1)) return false;
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < w; i++) {
      const k = (v + j) * c.tilesU + u + i;
      if (!base[k] || c.mapa[k] !== LIBRE) return false;
    }
  }
  if (w * d > 1) {
    let min = Infinity;
    let max = -Infinity;
    for (const [a, b] of [[0, 0], [w, 0], [0, d], [w, d], [w / 2, d / 2]]) {
      const h = c.sup.suelo(u + a, v + b);
      if (h < min) min = h;
      if (h > max) max = h;
    }
    if (max - min > c.cfg.desnivelHuellaMax) return false;
  }
  return true;
}

/** Marca la huella y, si `calle`, el anillo de `calleTiles` alrededor (solo donde sigue libre). */
function ocupar(c: Contexto, u: number, v: number, w: number, d: number, marca: number, calle: boolean): void {
  const m = calle ? c.cfg.calleTiles : 0;
  for (let j = -m; j < d + m; j++) {
    for (let i = -m; i < w + m; i++) {
      if (!dentro(c, u + i, v + j)) continue;
      const k = (v + j) * c.tilesU + u + i;
      const interior = i >= 0 && j >= 0 && i < w && j < d;
      if (interior) c.mapa[k] = marca;
      else if (c.mapa[k] === LIBRE) c.mapa[k] = CALLE;
    }
  }
}

const libreParaPie = (c: Contexto, u: number, v: number): boolean => {
  if (!dentro(c, u, v)) return false;
  const k = v * c.tilesU + u;
  return c.aptos[k] === 1 && (c.mapa[k] === LIBRE || c.mapa[k] === CALLE);
};

/** Tiles de `base` (1 = válido) a `dMin` o más de `centro`, ordenados por distancia con ruido de ±`ruido` tiles. */
function candidatos(c: Contexto, base: Uint8Array, centro: { u: number; v: number }, dMin: number, ruido: number): { u: number; v: number; d: number }[] {
  const out: { u: number; v: number; d: number; clave: number }[] = [];
  for (let v = 0; v < c.tilesV; v++) {
    for (let u = 0; u < c.tilesU; u++) {
      if (!base[v * c.tilesU + u]) continue;
      const d = Math.hypot(u - centro.u, v - centro.v);
      if (d >= dMin) out.push({ u, v, d, clave: d + (c.rng() * 2 - 1) * ruido });
    }
  }
  return out.sort((a, b) => a.clave - b.clave);
}

/**
 * Coloca `n` elementos de `ids` en huecos libres, recorriendo los tiles aptos de dentro hacia fuera
 * (con ruido, para que no salgan anillos perfectos). Devuelve los colocados y la distancia máxima alcanzada.
 */
function colocarPorDistancia(
  c: Contexto, centro: { u: number; v: number }, n: number, ids: readonly string[], dMin: number,
  tipo: TipoElemento, crear: (id: string) => Omit<Elemento, 'tipo' | 'id' | 'u' | 'v' | 'w' | 'd'>,
  calle: boolean, marca: number, base: Uint8Array = c.aptos, ruido: number = c.cfg.ruidoColocacion,
): { colocados: Elemento[]; radio: number } {
  const out: Elemento[] = [];
  let radio = dMin;
  for (const p of candidatos(c, base, centro, dMin, ruido)) {
    if (out.length >= n) break;
    const id = elegir(c.rng, ids);
    const { w, d } = c.cat[id].huella;
    if (!cabe(c, p.u, p.v, w, d, base)) continue;
    ocupar(c, p.u, p.v, w, d, marca, calle);
    out.push({ id, tipo, u: p.u, v: p.v, w, d, ...crear(id) });
    if (p.d > radio) radio = p.d;
  }
  return { colocados: out, radio };
}

/** Centro de la zona con más tiles aptos en un círculo, buscado a saltos de 4 tiles (imagen integral para ir rápido). */
export function buscarCentro(aptos: Uint8Array, tilesU: number, tilesV: number, radio: number): { u: number; v: number } {
  const nu = tilesU + 1;
  const suma = new Int32Array(nu * (tilesV + 1));
  for (let v = 0; v < tilesV; v++) {
    let fila = 0;
    for (let u = 0; u < tilesU; u++) {
      fila += aptos[v * tilesU + u];
      suma[(v + 1) * nu + u + 1] = suma[v * nu + u + 1] + fila;
    }
  }
  const cuenta = (u0: number, v0: number, u1: number, v1: number): number =>
    suma[v1 * nu + u1] - suma[v0 * nu + u1] - suma[v1 * nu + u0] + suma[v0 * nu + u0];
  let mejor = { u: tilesU / 2, v: tilesV / 2 };
  let mejorPuntos = -1;
  for (let v = Math.floor(radio); v <= tilesV - radio; v += 4) {
    for (let u = Math.floor(radio); u <= tilesU - radio; u += 4) {
      const puntos = cuenta(Math.floor(u - radio), Math.floor(v - radio), Math.ceil(u + radio), Math.ceil(v + radio));
      if (puntos > mejorPuntos) {
        mejorPuntos = puntos;
        mejor = { u, v };
      }
    }
  }
  return mejor;
}

const ORI_CUATRO: readonly OrientacionAldea[] = ['se', 'sw', 'ne', 'nw'];
const ORI_DOS: readonly OrientacionAldea[] = ['se', 'sw'];

/** Orientación de pantalla al ir de (u,v) a (u1,v1): +u = se, +v = sw, −u = nw, −v = ne. */
export function orientacionHacia(du: number, dv: number): OrientacionAldea {
  if (Math.abs(du) >= Math.abs(dv)) return du >= 0 ? 'se' : 'nw';
  return dv >= 0 ? 'sw' : 'ne';
}

const OFICIOS = ['campesino', 'artesano', 'comerciante', 'sacerdote', 'soldado'] as const;
type Oficio = (typeof OFICIOS)[number];
const ACCION: Record<Oficio, string> = { campesino: 'cultivar', artesano: 'martillar', comerciante: 'comerciar', sacerdote: 'rezar', soldado: 'idle' };

/** Genera la aldea. `semilla` + superficie + catálogo → siempre el mismo resultado. */
export function generarAldea(
  sup: Superficie, tilesU: number, tilesV: number, cat: Catalogo, semilla: number, cfg: ConfigAldea = tuning.aldea,
): Aldea {
  const rng = crearRng(derivarSemilla(semilla, cfg.etiquetaSemilla));
  const aptos = calcularAptos(sup, tilesU, tilesV, cfg.pendienteMax);
  const arbolables = calcularAptos(sup, tilesU, tilesV, cfg.pendienteMaxArbol);
  const c: Contexto = { sup, tilesU, tilesV, aptos, arbolables, mapa: new Uint8Array(tilesU * tilesV), cfg, cat, rng };
  const ids = (f: (id: string, s: SpriteCatalogo) => boolean): string[] => Object.keys(cat).filter((id) => f(id, cat[id])).sort();

  const idsCasas = ids((id) => id.startsWith('casa_'));
  const idsCampos = ids((id) => id.startsWith('campo_'));
  const idsPuestos = ids((id) => id.startsWith('puesto_'));
  const idsTorres = ids((id) => id === 'torre');
  const idsTemplos = ids((id) => id.startsWith('templo_'));
  const idsArboles = ids((_i, s) => s.categoria === 'arbol');
  const idsRocas = ids((_i, s) => s.categoria === 'roca');
  const idsProps = ids((id, s) => s.categoria === 'prop' && !id.startsWith('prop_saco'));

  const radioAldea = Math.sqrt((cfg.casasTerminadas + cfg.casasEnObra) * 30 + cfg.campos * 40) * 0.75;
  const centro = buscarCentro(aptos, tilesU, tilesV, radioAldea);
  const edificios: Elemento[] = [];
  const props: Elemento[] = [];

  const unico = (): { ori: OrientacionAldea } => ({ ori: 'unica' });
  const conOri = (): { ori: OrientacionAldea } => ({ ori: c.rng() < 0.5 ? 'u' : 'v' });

  // 1. Templo en el centro y plaza con puestos: el corazón de la aldea.
  const templos = colocarPorDistancia(c, centro, cfg.templos, idsTemplos, 0, 'edificio', unico, true, HUELLA);
  for (const e of templos.colocados) e.estado = cat[e.id].etapas?.slice(-1)[0];
  edificios.push(...templos.colocados);
  const plaza = colocarPorDistancia(c, centro, cfg.puestos, idsPuestos, 4, 'edificio', unico, true, HUELLA);
  edificios.push(...plaza.colocados);

  // 2. Casas: terminadas y en obra (etapas 1 a 5), de dentro hacia fuera.
  const total = cfg.casasTerminadas + cfg.casasEnObra;
  const casas = colocarPorDistancia(c, centro, total, idsCasas, 3, 'edificio', conOri, true, HUELLA);
  const enObra = new Set<number>();
  while (enObra.size < Math.min(cfg.casasEnObra, casas.colocados.length)) enObra.add(Math.floor(rng() * casas.colocados.length));
  casas.colocados.forEach((e, i) => {
    const etapas = cat[e.id].etapas ?? [];
    e.estado = enObra.has(i) ? etapas[Math.floor(rng() * Math.max(1, etapas.length - 1))] : etapas[etapas.length - 1];
  });
  edificios.push(...casas.colocados);

  // 3. Torres en el borde y campos de cebada en la corona exterior (cada uno en su etapa).
  const rCasas = casas.radio;
  edificios.push(...colocarPorDistancia(c, centro, cfg.torres, idsTorres, rCasas * 0.85, 'edificio', unico, true, HUELLA).colocados);
  const campos = colocarPorDistancia(c, centro, cfg.campos, idsCampos, rCasas * cfg.radioCampos, 'edificio', unico, true, HUELLA);
  for (const e of campos.colocados) {
    const etapas = cat[e.id].etapas ?? [];
    e.estado = etapas[Math.floor(rng() * etapas.length)];
  }
  edificios.push(...campos.colocados);
  const rAldea = Math.max(rCasas, campos.radio);

  // 4. Props repartidos por toda la aldea y rocas en cualquier terreno seco.
  props.push(...colocarPorDistancia(c, centro, cfg.props, idsProps, 2, 'prop', conOri, true, HUELLA, aptos, rAldea).colocados);
  props.push(...colocarPorDistancia(c, centro, cfg.rocas, idsRocas, rAldea * 0.5, 'prop', unico, false, ARBOL, arbolables, rAldea).colocados);

  // 5. Árboles: algunos sueltos y el resto en bosquecillos alrededor de centros de la corona exterior (laderas incluidas).
  const arboles: Elemento[] = [];
  const posibles = candidatos(c, arbolables, centro, 0, 0);
  const plantar = (u: number, v: number): void => {
    if (arboles.length >= cfg.arboles || !cabe(c, u, v, 1, 1, arbolables)) return;
    const id = elegir(rng, idsArboles);
    ocupar(c, u, v, 1, 1, ARBOL, false);
    arboles.push({ id, tipo: 'arbol', u, v, w: 1, d: 1, ori: 'unica' });
  };
  const nSueltos = Math.floor(cfg.arboles * cfg.arbolesSueltos);
  for (let k = 0; k < posibles.length * 3 && arboles.length < nSueltos; k++) {
    const p = posibles[Math.floor(rng() * posibles.length)];
    plantar(p.u, p.v);
  }
  const lejanos = posibles.filter((p) => p.d >= rAldea * 0.7);
  const origenes = Array.from({ length: cfg.bosquesGrupos }, () => elegir(rng, lejanos.length ? lejanos : posibles));
  const porBosque = posibles
    .map((p) => ({ p, clave: Math.min(...origenes.map((o) => Math.hypot(p.u - o.u, p.v - o.v))) + (rng() * 2 - 1) * cfg.bosqueRuido }))
    .sort((a, b) => a.clave - b.clave);
  for (const { p } of porBosque) plantar(p.u, p.v);

  // 6. Gente y animales en sitios libres, cerca de lo que hacen.
  const unidades: Unidad[] = [];
  const ocupables = (e: Elemento, extra: number): { u: number; v: number } | null => {
    for (let k = 0; k < 24; k++) {
      const u = e.u - extra + Math.floor(rng() * (e.w + extra * 2));
      const v = e.v - extra + Math.floor(rng() * (e.d + extra * 2));
      if (libreParaPie(c, u, v)) return { u, v };
    }
    return null;
  };
  const ruta = (u: number, v: number): { u1: number; v1: number } | undefined => {
    const largo = cfg.recorrido[0] + Math.floor(rng() * (cfg.recorrido[1] - cfg.recorrido[0] + 1));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let k = 0; k < 4; k++) {
      const [du, dv] = elegir(rng, dirs);
      let ok = true;
      for (let s = 1; s <= largo && ok; s++) ok = libreParaPie(c, u + du * s, v + dv * s);
      if (ok) return { u1: u + du * largo, v1: v + dv * largo };
    }
    return undefined;
  };
  const punto = (p: { u: number; v: number }): { u: number; v: number } => ({ u: p.u + 0.25 + rng() * 0.5, v: p.v + 0.25 + rng() * 0.5 });
  const idsCiudadano = (o: Oficio): string[] => ids((id) => id.startsWith(`ciudadano_${o}_`));
  const obras = casas.colocados.filter((e) => enObra.has(casas.colocados.indexOf(e)));
  const anclaDe: Record<Oficio, Elemento[]> = {
    campesino: campos.colocados.length ? campos.colocados : casas.colocados,
    artesano: obras.length ? obras : casas.colocados,
    comerciante: plaza.colocados.length ? plaza.colocados : casas.colocados,
    sacerdote: templos.colocados.length ? templos.colocados : casas.colocados,
    soldado: casas.colocados,
  };
  const pesosOficio = [0.4, 0.2, 0.15, 0.08, 0.17];
  for (let k = 0, hechos = 0; hechos < cfg.ciudadanos && k < cfg.ciudadanos * 6; k++) {
    const oficio = OFICIOS[elegirPeso(rng, pesosOficio)];
    const lista = anclaDe[oficio];
    if (lista.length === 0) continue;
    const sitio = ocupables(elegir(rng, lista), 2);
    if (!sitio) continue;
    const id = elegir(rng, idsCiudadano(oficio));
    const camina = rng() < cfg.probCaminante;
    const rt = camina ? ruta(sitio.u, sitio.v) : undefined;
    const p = punto(sitio);
    const oris = oficio === 'sacerdote' && !rt ? ORI_DOS : ORI_CUATRO;
    unidades.push({
      id, clase: 'ciudadano', u: p.u, v: p.v, fase: rng(),
      estado: rt ? 'caminar' : ACCION[oficio],
      ori: rt ? orientacionHacia(rt.u1 - sitio.u, rt.v1 - sitio.v) : elegir(rng, oris),
      ...(rt ? { ruta: { u1: rt.u1 + (p.u - sitio.u), v1: rt.v1 + (p.v - sitio.v) } } : {}),
    });
    hechos++;
  }
  const rebanos = ids((id) => id.startsWith('animal_') && !id.startsWith('animal_gallina'));
  const gallinas = ids((id) => id.startsWith('animal_gallina'));
  const refugio = campos.colocados.length ? campos.colocados : casas.colocados;
  for (let k = 0, hechos = 0; hechos < cfg.animales && k < cfg.animales * 6; k++) {
    const gallina = rng() < 0.3;
    const sitio = ocupables(elegir(rng, gallina ? casas.colocados : refugio), gallina ? 2 : 3);
    if (!sitio) continue;
    const id = elegir(rng, gallina ? gallinas : rebanos);
    const camina = !gallina && rng() < cfg.probCaminante;
    const rt = camina ? ruta(sitio.u, sitio.v) : undefined;
    const p = punto(sitio);
    unidades.push({
      id, clase: 'animal', u: p.u, v: p.v, fase: rng(),
      estado: rt ? 'caminar' : gallina ? 'picotear' : 'pastar',
      ori: rt ? (orientacionHacia(rt.u1 - sitio.u, rt.v1 - sitio.v) === 'se' || orientacionHacia(rt.u1 - sitio.u, rt.v1 - sitio.v) === 'ne' ? 'se' : 'sw') : elegir(rng, ORI_DOS),
      ...(rt ? { ruta: { u1: rt.u1 + (p.u - sitio.u), v1: rt.v1 + (p.v - sitio.v) } } : {}),
    });
    hechos++;
  }

  return { semilla, centro, edificios, arboles, props, unidades };
}

/** Todo lo que bloquea tiles (edificios, árboles, props), para comprobar huecos. */
export function elementosDeAldea(a: Aldea): Elemento[] {
  return [...a.edificios, ...a.arboles, ...a.props];
}

/** Número de tiles ocupados por más de un elemento: debe ser 0. */
export function contarSolapes(a: Aldea): number {
  const vistos = new Map<number, number>();
  let solapes = 0;
  for (const e of elementosDeAldea(a)) {
    for (let j = 0; j < e.d; j++) {
      for (let i = 0; i < e.w; i++) {
        const clave = (e.v + j) * 100000 + e.u + i;
        const n = (vistos.get(clave) ?? 0) + 1;
        vistos.set(clave, n);
        if (n === 2) solapes++;
      }
    }
  }
  return solapes;
}

/** Hueco mínimo en tiles entre las huellas de dos edificios (Chebyshev); ≥ 1 significa que cabe una calle. */
export function huecoEntre(a: Elemento, b: Elemento): number {
  const du = Math.max(a.u - (b.u + b.w), b.u - (a.u + a.w));
  const dv = Math.max(a.v - (b.v + b.d), b.v - (a.v + a.d));
  return Math.max(du, dv);
}

/** Posición de una unidad en el instante `t` (s): en el sitio, o yendo y viniendo por su ruta (onda triangular). */
export function posicionUnidad(
  uni: Unidad, t: number, velocidad: number, fuera: { u: number; v: number; ori: OrientacionAldea },
): void {
  if (!uni.ruta) {
    fuera.u = uni.u;
    fuera.v = uni.v;
    fuera.ori = uni.ori;
    return;
  }
  const du = uni.ruta.u1 - uni.u;
  const dv = uni.ruta.v1 - uni.v;
  const largo = Math.hypot(du, dv);
  const ciclo = (2 * largo) / velocidad;
  const f = (((t / ciclo + uni.fase) % 1) + 1) % 1;
  const ida = f < 0.5;
  const s = ida ? f * 2 : 2 - f * 2;
  fuera.u = uni.u + du * s;
  fuera.v = uni.v + dv * s;
  fuera.ori = ida ? orientacionHacia(du, dv) : orientacionHacia(-du, -dv);
}
