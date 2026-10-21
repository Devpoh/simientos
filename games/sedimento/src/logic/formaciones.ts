// Formaciones de grupo (P5, R51, §5 del pivote). Lógica pura sobre la rejilla de ocupación: reparte los
// destinos de una orden de movimiento en línea, columna, cuña o cuadro, sin que dos unidades acaben en el
// mismo tile y sin meter ninguna en una celda bloqueada.
//
// El patrón se calcula en el espacio del grupo (adelante = dirección de marcha, lateral = perpendicular) y
// luego cada hueco se ajusta al tile transitable más cercano con `ajustarHueco`. Ese paso es el que garantiza
// el invariante: pase lo que pase, el destino devuelto es pisable.
import tuning from '../data/tuning.json';
import { bloqueada, type Ocupacion } from './ocupacion';
import { transitable, type Tile } from './navegacion';

export type Formacion = 'linea' | 'columna' | 'cuna' | 'cuadro';

export const FORMACIONES: readonly Formacion[] = ['linea', 'columna', 'cuna', 'cuadro'];

export interface ConfigFormacion {
  /** Separación entre huecos, en tiles. */
  separacion: number;
  /** Radio máximo, en tiles, al que se busca un tile libre para un hueco ocupado. */
  radioAjuste: number;
}

export const CFG_FORMACION: ConfigFormacion = {
  separacion: tuning.seleccion.formacion.separacion,
  radioAjuste: tuning.seleccion.formacion.radioAjuste,
};

/** Centro del grupo y dirección de marcha (normalizada) hacia el destino de la orden. */
export interface Marco {
  /** Centro de la formación, en tiles continuos. */
  u: number;
  v: number;
  /** Vector unitario de marcha (hacia donde mira el grupo). */
  du: number;
  dv: number;
}

/** Construye el marco de una formación: centro en el destino y dirección = destino − centro del grupo. */
export function marcoDe(centroGrupo: Tile, destino: Tile): Marco {
  const du = destino.u - centroGrupo.u;
  const dv = destino.v - centroGrupo.v;
  const largo = Math.hypot(du, dv);
  if (largo < 1e-6) return { u: destino.u, v: destino.v, du: 1 / Math.SQRT2, dv: 1 / Math.SQRT2 };
  return { u: destino.u, v: destino.v, du: du / largo, dv: dv / largo };
}

/**
 * Hueco `i` (0..n−1) de una formación de `n` unidades, en tiles continuos. Los huecos salen ordenados del
 * centro hacia fuera, para que al recortar por falta de sitio se caigan los extremos y no el centro.
 */
export function hueco(formacion: Formacion, i: number, n: number, marco: Marco, cfg: ConfigFormacion = CFG_FORMACION): { u: number; v: number } {
  const sep = cfg.separacion;
  // Lateral unitario: perpendicular a la marcha.
  const lu = -marco.dv;
  const lv = marco.du;
  switch (formacion) {
    case 'columna': {
      // Uno detrás de otro, a lo largo de la marcha.
      return { u: marco.u - marco.du * sep * i, v: marco.v - marco.dv * sep * i };
    }
    case 'linea': {
      // Fila perpendicular a la marcha, centrada.
      const f = i - (n - 1) / 2;
      return { u: marco.u + lu * sep * f, v: marco.v + lv * sep * f };
    }
    case 'cuna': {
      // V invertida: cada fila hacia atrás se ensancha un hueco por lado. El frente es el vértice.
      const fila = Math.ceil(i / 2);
      const lado = i === 0 ? 0 : (i % 2 === 1 ? -1 : 1) * fila;
      return {
        u: marco.u - marco.du * sep * fila + lu * sep * lado,
        v: marco.v - marco.dv * sep * fila + lv * sep * lado,
      };
    }
    case 'cuadro': {
      // Rejilla lo más cuadrada posible, ordenada del centro hacia fuera en anillos.
      const lado = Math.max(1, Math.ceil(Math.sqrt(n)));
      const mitad = (lado - 1) / 2;
      const orden = anilloCuadro(i, lado);
      const col = orden.c - mitad;
      const fil = orden.f - mitad;
      return {
        u: marco.u + lu * sep * col - marco.du * sep * fil,
        v: marco.v + lv * sep * col - marco.dv * sep * fil,
      };
    }
  }
}

/** Posición (columna, fila) del índice `i` en un cuadro `lado`×`lado`, recorriendo del centro hacia fuera. */
function anilloCuadro(i: number, lado: number): { c: number; f: number } {
  const c0 = (lado - 1) / 2;
  const f0 = (lado - 1) / 2;
  const celdas: { c: number; f: number; d: number }[] = [];
  for (let f = 0; f < lado; f++) {
    for (let c = 0; c < lado; c++) celdas.push({ c, f, d: Math.hypot(c - c0, f - f0) });
  }
  celdas.sort((a, b) => a.d - b.d || a.f - b.f || a.c - b.c);
  const celda = celdas[Math.min(i, celdas.length - 1)];
  return { c: celda.c, f: celda.f };
}

/** Tile entero más cercano a un punto continuo, sin salir del mapa. */
function aTile(oc: Ocupacion, u: number, v: number): Tile {
  return {
    u: Math.min(oc.tilesU - 1, Math.max(0, Math.round(u))),
    v: Math.min(oc.tilesV - 1, Math.max(0, Math.round(v))),
  };
}

/** Tile pisable más cercano (anillos crecientes) y no usado ya por otro hueco. `null` si no hay ninguno. */
export function ajustarHueco(
  oc: Ocupacion, u: number, v: number, usados: ReadonlySet<number>, radio: number = CFG_FORMACION.radioAjuste,
): Tile | null {
  const c = aTile(oc, u, v);
  if (elegible(oc, c, usados)) return c;
  for (let r = 1; r <= radio; r++) {
    for (let dv = -r; dv <= r; dv++) {
      for (let du = -r; du <= r; du++) {
        if (Math.max(Math.abs(du), Math.abs(dv)) !== r) continue;
        const t = { u: c.u + du, v: c.v + dv };
        if (t.u < 0 || t.v < 0 || t.u >= oc.tilesU || t.v >= oc.tilesV) continue;
        if (elegible(oc, t, usados)) return t;
      }
    }
  }
  return null;
}

function elegible(oc: Ocupacion, t: Tile, usados: ReadonlySet<number>): boolean {
  if (bloqueada(oc, t.u, t.v)) return false;
  return !usados.has(t.v * oc.tilesU + t.u);
}

/**
 * Destinos de una orden de movimiento en formación para `n` unidades. Devuelve un tile por unidad elegible,
 * en el mismo orden que los huecos (centro primero) y sin repetir ninguno. Las que no caben se quedan fuera
 * de la lista; el llamante las deja donde están o las manda al hueco libre más cercano que quede.
 */
export function destinosFormacion(
  oc: Ocupacion, formacion: Formacion, centroGrupo: Tile, destino: Tile, n: number, cfg: ConfigFormacion = CFG_FORMACION,
): Tile[] {
  const marco = marcoDe(centroGrupo, destino);
  const usados = new Set<number>();
  const salida: Tile[] = [];
  for (let i = 0; i < n; i++) {
    const h = hueco(formacion, i, n, marco, cfg);
    const t = ajustarHueco(oc, h.u, h.v, usados, cfg.radioAjuste);
    if (!t) continue;
    usados.add(t.v * oc.tilesU + t.u);
    salida.push(t);
  }
  return salida;
}

/** ¿Está la formación libre de solapes? Invariante de P5: dos unidades nunca comparten tile. */
export function sinSolapes(destinos: readonly Tile[]): boolean {
  const vistos = new Set<number>();
  for (const t of destinos) {
    const k = t.v * 65536 + t.u;
    if (vistos.has(k)) return false;
    vistos.add(k);
  }
  return true;
}

/** ¿Están todos los destinos en celdas pisables? Invariante de P5. */
export function todosPisables(oc: Ocupacion, destinos: readonly Tile[]): boolean {
  return destinos.every((t) => transitable(oc, t.u, t.v));
}
