// Ciudadanos que caminan (P4b, §4 del pivote): máquina de estados pura y determinista sobre la rejilla de
// ocupación. Una unidad nunca pisa una celda bloqueada; si no hay camino queda en `bloqueado` y lo reintenta.
// Entrar y salir por la puerta pasa por `dentro` (oculta), y salir devuelve a la misma puerta por la que entró.
//
// Todo se mide en ticks fijos: el movimiento no depende del reloj de pared, así que el mismo número de ticks
// da siempre la misma posición (y-sort determinista de §4.5).
import tuning from '../data/tuning.json';
import { crearRng, type Rng } from './azar';
import type { Tile } from './ocupacion';
import type { Ocupacion } from './ocupacion';
import { buscarRuta, longitudRuta, transitable, type ConfigNavegacion, CFG_NAVEGACION } from './navegacion';
import { bloqueada } from './ocupacion';

export type EstadoCiudadano = 'idle' | 'andar' | 'entrar' | 'dentro' | 'salir' | 'bloqueado';

/** Lo que necesita saber un ciudadano de su casa: dónde está su puerta y dónde su centro (a donde entra). */
export interface Casa {
  /** Tile de la puerta (celda de acceso, fuera de la huella). */
  puerta: Tile;
  /** Centro de la huella: el ciudadano se mete aquí al entrar y desaparece. */
  centro: Tile;
}

export interface Ciudadano {
  id: string;
  /** Id del sprite del atlas (p. ej. `ciudadano_campesino_m`): decide la animación. */
  sprite: string;
  /** Qué hace cuando está parado (cultivar, martillar, comerciar, rezar, idle). */
  actividad: string;
  /** Posición continua en tiles (el punto de pies). */
  u: number;
  v: number;
  ori: 'se' | 'sw' | 'ne' | 'nw';
  estado: EstadoCiudadano;
  /** Tiles que le quedan por recorrer, desde su posición actual. */
  ruta: Tile[] | null;
  /** Índice del tramo de `ruta` en el que va. */
  tramo: number;
  /** Tiles recorridos dentro del tramo actual. */
  avance: number;
  /** Casa a la que va (o en la que está). */
  casa: Casa | null;
  /** Ticks que le quedan en el estado actual (idle, dentro, bloqueado). */
  espera: number;
  fase: number;
}

export interface ConfigCiudadano {
  /** Tiles por tick. */
  velocidad: number;
  /** Ticks que espera parado entre recados. */
  esperaIdle: number;
  /** Ticks que se queda dentro de la casa. */
  ticksDentro: number;
  /** Ticks que espera antes de reintentar cuando no hay camino. */
  esperaBloqueado: number;
}

/** Valida y tipa la sección "ciudadano" de tuning.json. */
export function configCiudadano(t: {
  velocidad: number; esperaIdle: number; ticksDentro: number; esperaBloqueado: number;
}): ConfigCiudadano {
  if (t.velocidad <= 0) throw new Error('ciudadano.velocidad debe ser > 0');
  return { velocidad: t.velocidad, esperaIdle: t.esperaIdle, ticksDentro: t.ticksDentro, esperaBloqueado: t.esperaBloqueado };
}

export const CFG_CIUDADANO = configCiudadano(tuning.ciudadano);

/** Orientación de un rumbo (du, dv), con la misma regla que la aldea. */
export function orientacionDe(du: number, dv: number): Ciudadano['ori'] {
  if (Math.abs(du) >= Math.abs(dv)) return du >= 0 ? 'se' : 'nw';
  return dv >= 0 ? 'sw' : 'ne';
}

/** Crea un ciudadano parado en un tile libre, con su casa asignada. */
export function crearCiudadano(
  id: string, u: number, v: number, casa: Casa | null, fase: number,
  sprite = 'ciudadano_campesino_m', actividad = 'idle', cfg: ConfigCiudadano = CFG_CIUDADANO,
): Ciudadano {
  return {
    id, sprite, actividad, u, v, ori: 'se', estado: 'idle', ruta: null, tramo: 0, avance: 0,
    casa, espera: Math.round(fase * cfg.esperaIdle), fase,
  };
}

/** Estado del atlas que le toca dibujar según su estado lógico: caminar, actividad parada o idle. */
export function estadoDibujo(ci: Ciudadano): string {
  switch (ci.estado) {
    case 'andar':
    case 'entrar':
    case 'salir':
      return 'caminar';
    default:
      return ci.actividad;
  }
}

/** Elige una casa alcanzable al azar de la lista, sin repetir la actual si se puede. */
function elegirCasa(rng: Rng, casas: readonly Casa[], actual: Casa | null): Casa | null {
  if (casas.length === 0) return null;
  if (casas.length === 1) return casas[0];
  for (let intento = 0; intento < 4; intento++) {
    const c = casas[Math.floor(rng() * casas.length)];
    if (c !== actual) return c;
  }
  return casas[Math.floor(rng() * casas.length)];
}

/**
 * Manda al ciudadano a una casa: calcula la ruta desde su tile actual hasta la puerta. Si no hay camino,
 * lo deja `bloqueado` con una espera. La ruta empieza en el tile del ciudadano (redondeado).
 */
export function irA(ci: Ciudadano, oc: Ocupacion, casa: Casa, cfg: ConfigCiudadano = CFG_CIUDADANO, cfgNav: ConfigNavegacion = CFG_NAVEGACION): boolean {
  ci.casa = casa;
  const origen = { u: Math.round(ci.u), v: Math.round(ci.v) };
  if (!transitable(oc, origen.u, origen.v)) {
    ci.estado = 'bloqueado';
    ci.ruta = null;
    ci.espera = cfg.esperaBloqueado;
    return false;
  }
  const ruta = buscarRuta(oc, origen, casa.puerta, cfgNav);
  if (!ruta) {
    ci.estado = 'bloqueado';
    ci.ruta = null;
    ci.espera = cfg.esperaBloqueado;
    return false;
  }
  ci.ruta = ruta;
  ci.tramo = 0;
  ci.avance = 0;
  ci.estado = 'andar';
  return true;
}

/** Replanifica todas las rutas contra la rejilla actual (al construir o derribar, §4.3). */
export function replanificar(ciudadanos: readonly Ciudadano[], oc: Ocupacion, cfgNav: ConfigNavegacion = CFG_NAVEGACION): number {
  let replanificados = 0;
  for (const ci of ciudadanos) {
    if (ci.estado !== 'andar' && ci.estado !== 'bloqueado') continue;
    if (!ci.casa) continue;
    const antes = ci.ruta;
    irA(ci, oc, ci.casa, CFG_CIUDADANO, cfgNav);
    if (ci.ruta !== antes) replanificados++;
  }
  return replanificados;
}

/**
 * Un tick de un ciudadano. Devuelve el estado nuevo. No asigna si el ciudadano no cambia de tramo.
 * `casas` es el catálogo donde elegir el siguiente recado; `rng` el azar determinista de la partida.
 */
export function avanzarCiudadano(
  ci: Ciudadano, oc: Ocupacion, casas: readonly Casa[], rng: Rng,
  cfg: ConfigCiudadano = CFG_CIUDADANO, cfgNav: ConfigNavegacion = CFG_NAVEGACION,
): EstadoCiudadano {
  switch (ci.estado) {
    case 'idle': {
      if (ci.espera > 0) { ci.espera--; return ci.estado; }
      if (casas.length === 0) { ci.espera = cfg.esperaBloqueado; return ci.estado; }
      // Varias casas al azar hasta dar con una alcanzable: una casa tras el agua no debe dejar al ciudadano
      // pegado para siempre. Si ninguna lo es, se espera y se reintenta.
      for (let intento = 0; intento < 4; intento++) {
        const casa = elegirCasa(rng, casas, ci.casa);
        if (casa && irA(ci, oc, casa, cfg, cfgNav)) return ci.estado;
      }
      ci.espera = cfg.esperaBloqueado;
      return ci.estado;
    }
    case 'bloqueado': {
      if (ci.espera > 0) { ci.espera--; return ci.estado; }
      if (!ci.casa) { ci.estado = 'idle'; return ci.estado; }
      irA(ci, oc, ci.casa, cfg, cfgNav);
      return ci.estado;
    }
    case 'andar': {
      if (!ci.ruta) { ci.estado = 'idle'; ci.espera = cfg.esperaIdle; return ci.estado; }
      let restante = cfg.velocidad;
      while (restante > 0 && ci.estado === 'andar') {
        const a = ci.ruta[ci.tramo];
        const b = ci.ruta[ci.tramo + 1];
        if (!b) { ci.estado = 'entrar'; break; }
        const largo = Math.hypot(b.u - a.u, b.v - a.v);
        const falta = largo - ci.avance;
        if (restante < falta) {
          ci.avance += restante;
          restante = 0;
        } else {
          restante -= falta;
          ci.tramo++;
          ci.avance = 0;
        }
      }
      actualizarPosicion(ci);
      return ci.estado;
    }
    case 'entrar': {
      const centro = ci.casa?.centro;
      if (!centro) { ci.estado = 'idle'; ci.espera = cfg.esperaIdle; return ci.estado; }
      const du = centro.u - ci.u;
      const dv = centro.v - ci.v;
      const dist = Math.hypot(du, dv);
      if (dist <= cfg.velocidad) {
        ci.u = centro.u;
        ci.v = centro.v;
        ci.estado = 'dentro';
        ci.espera = cfg.ticksDentro;
        return ci.estado;
      }
      ci.u += (du / dist) * cfg.velocidad;
      ci.v += (dv / dist) * cfg.velocidad;
      ci.ori = orientacionDe(du, dv);
      return ci.estado;
    }
    case 'dentro': {
      if (ci.espera > 0) { ci.espera--; return ci.estado; }
      ci.estado = 'salir';
      return ci.estado;
    }
    case 'salir': {
      const puerta = ci.casa?.puerta;
      if (!puerta) { ci.estado = 'idle'; ci.espera = cfg.esperaIdle; return ci.estado; }
      const du = puerta.u - ci.u;
      const dv = puerta.v - ci.v;
      const dist = Math.hypot(du, dv);
      if (dist <= cfg.velocidad) {
        ci.u = puerta.u;
        ci.v = puerta.v;
        ci.estado = 'idle';
        ci.espera = cfg.esperaIdle;
        ci.ruta = null;
        ci.ori = orientacionDe(-du, -dv);
        return ci.estado;
      }
      ci.u += (du / dist) * cfg.velocidad;
      ci.v += (dv / dist) * cfg.velocidad;
      ci.ori = orientacionDe(du, dv);
      return ci.estado;
    }
  }
}

/** Pone la posición continua del ciudadano en su tramo actual. */
function actualizarPosicion(ci: Ciudadano): void {
  const ruta = ci.ruta;
  if (!ruta) return;
  const a = ruta[ci.tramo];
  const b = ruta[ci.tramo + 1];
  if (!a) return;
  if (!b) { ci.u = a.u; ci.v = a.v; return; }
  const largo = Math.hypot(b.u - a.u, b.v - a.v);
  const f = largo === 0 ? 0 : ci.avance / largo;
  ci.u = a.u + (b.u - a.u) * f;
  ci.v = a.v + (b.v - a.v) * f;
  ci.ori = orientacionDe(b.u - a.u, b.v - a.v);
}

/** ¿Se dibuja el ciudadano? Los que están dentro de una casa se ocultan. */
export function visible(ci: Ciudadano): boolean {
  return ci.estado !== 'dentro';
}

/** Cuenta por estado, para las medidas de `shot`. */
export function contarEstados(ciudadanos: readonly Ciudadano[]): Record<EstadoCiudadano, number> {
  const res: Record<EstadoCiudadano, number> = { idle: 0, andar: 0, entrar: 0, dentro: 0, salir: 0, bloqueado: 0 };
  for (const ci of ciudadanos) res[ci.estado]++;
  return res;
}

/** Avanza `ticks` ticks a todos los ciudadanos. Devuelve cuántos quedaron bloqueados al final. */
export function avanzarCiudadanos(
  ciudadanos: readonly Ciudadano[], oc: Ocupacion, casas: readonly Casa[], semilla: number, ticks: number,
  cfg: ConfigCiudadano = CFG_CIUDADANO, cfgNav: ConfigNavegacion = CFG_NAVEGACION,
): number {
  const rng = crearRng(semilla);
  for (let t = 0; t < ticks; t++) {
    for (const ci of ciudadanos) avanzarCiudadano(ci, oc, casas, rng, cfg, cfgNav);
  }
  let bloqueados = 0;
  for (const ci of ciudadanos) if (ci.estado === 'bloqueado') bloqueados++;
  return bloqueados;
}

/**
 * Celdas bloqueadas que pisa algún ciudadano ahora mismo: debe ser 0 (§4.6a). `entrar` y `salir` cruzan a
 * propósito la huella de su propia casa (es el tránsito de la puerta al centro, §4.2), así que no cuentan.
 */
export function violacionesCiudadanos(ciudadanos: readonly Ciudadano[], oc: Ocupacion): number {
  let violaciones = 0;
  for (const ci of ciudadanos) {
    if (ci.estado === 'dentro' || ci.estado === 'entrar' || ci.estado === 'salir') continue;
    const u = Math.round(ci.u);
    const v = Math.round(ci.v);
    if (u < 0 || v < 0 || u >= oc.tilesU || v >= oc.tilesV) { violaciones++; continue; }
    if (!transitable(oc, u, v)) violaciones++;
  }
  return violaciones;
}

/** Longitud total de las rutas vivas: sirve para comprobar que de verdad caminan. */
export function longitudRutas(ciudadanos: readonly Ciudadano[]): number {
  let total = 0;
  for (const ci of ciudadanos) if (ci.ruta) total += longitudRuta(ci.ruta) - ci.tramo;
  return Math.round(total * 10) / 10;
}

/** Un ciudadano de la aldea de referencia: id del sprite y actividad parada, ya sorteados por `generarAldea`. */
export interface SemillaCiudadano {
  sprite: string;
  actividad: string;
  u: number;
  v: number;
  fase: number;
}

/**
 * Reparte las casas entre los ciudadanos y los deja listos para caminar. Cada uno arranca en el tile libre
 * más cercano a su sitio de la aldea (nadie nace dentro de un muro) y con una casa alcanzable asignada; si
 * ninguna casa es alcanzable desde su bolsa de tierra, se queda `idle` (nunca en estado imposible).
 */
export function poblarCiudadanos(
  semillas: readonly SemillaCiudadano[], oc: Ocupacion, casas: readonly Casa[],
  cfg: ConfigCiudadano = CFG_CIUDADANO, cfgNav: ConfigNavegacion = CFG_NAVEGACION,
): Ciudadano[] {
  const rng = crearRng(0x5ed1);
  const ciudadanos: Ciudadano[] = [];
  for (const s of semillas) {
    const libre = tileLibreCerca(oc, Math.round(s.u), Math.round(s.v));
    const ci = crearCiudadano(`${s.sprite}_${ciudadanos.length}`, libre.u, libre.v, null, s.fase, s.sprite, s.actividad, cfg);
    ciudadanos.push(ci);
    if (casas.length === 0) continue;
    let ok = false;
    const casa = elegirCasa(rng, casas, null);
    if (casa) ok = irA(ci, oc, casa, cfg, cfgNav);
    // Sin camino a esa casa: prueba todas antes de rendirse.
    if (!ok) for (const c of casas) { if (irA(ci, oc, c, cfg, cfgNav)) { ok = true; break; } }
    if (!ok) { ci.estado = 'idle'; ci.espera = cfg.esperaIdle; ci.casa = null; }
  }
  return ciudadanos;
}

/** Edificio de la aldea del que se necesita saber dónde está y cuánto mide (para armar su casa). */
export interface EdificioCasa {
  id: string;
  u: number;
  v: number;
  w: number;
  d: number;
}

/**
 * Catálogo de casas a partir de las estructuras ya colocadas en la rejilla: la puerta es la primera celda de
 * acceso pisable (o la primera a secas) y el centro es el centro de la huella, a donde el ciudadano entra.
 */
export function casasDeAldea(oc: Ocupacion, edificios: readonly EdificioCasa[]): Casa[] {
  const casas: Casa[] = [];
  for (const e of edificios) {
    const est = oc.estructuras.get(e.v * oc.tilesU + e.u);
    if (!est || est.puertas.length === 0) continue;
    const puerta = est.puertas.find((p) => !bloqueada(oc, p.u, p.v)) ?? est.puertas[0];
    casas.push({
      puerta: { u: puerta.u, v: puerta.v },
      centro: { u: e.u + Math.floor(e.w / 2), v: e.v + Math.floor(e.d / 2) },
    });
  }
  return casas;
}

/** Tile pisable más cercano a (u, v), en anillos crecientes. El llamante garantiza que existe alguno. */
function tileLibreCerca(oc: Ocupacion, u: number, v: number): Tile {
  if (transitable(oc, u, v)) return { u, v };
  const maxRadio = Math.max(oc.tilesU, oc.tilesV);
  for (let r = 1; r < maxRadio; r++) {
    for (let dv = -r; dv <= r; dv++) {
      for (let du = -r; du <= r; du++) {
        if (Math.max(Math.abs(du), Math.abs(dv)) !== r) continue;
        const nu = u + du;
        const nv = v + dv;
        if (nu < 0 || nv < 0 || nu >= oc.tilesU || nv >= oc.tilesV) continue;
        if (transitable(oc, nu, nv)) return { u: nu, v: nv };
      }
    }
  }
  return { u, v };
}
