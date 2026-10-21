// Órdenes a un grupo (P5, R51, §5 del pivote). Coge la selección de unidades, reparte los destinos de la
// formación con `formaciones.ts` y manda a cada ciudadano por A* (`ciudadano.irATile`). Lógica pura: aquí no
// se dibuja nada, solo se decide a dónde va cada uno.
//
// La velocidad del grupo manda la del más lento: si no, el grupo se estira y pierde su forma al marchar.
import tuning from '../data/tuning.json';
import { irATile, type Ciudadano } from './ciudadano';
import { destinosFormacion, type Formacion, CFG_FORMACION, type ConfigFormacion } from './formaciones';
import type { Ocupacion, Tile } from './ocupacion';

/** Centro (redondeado) de un conjunto de unidades: el punto del grupo desde el que se calcula la marcha. */
export function centroDeUnidades(ciudadanos: readonly Ciudadano[]): Tile {
  if (ciudadanos.length === 0) return { u: 0, v: 0 };
  let su = 0;
  let sv = 0;
  for (const ci of ciudadanos) { su += ci.u; sv += ci.v; }
  return { u: Math.round(su / ciudadanos.length), v: Math.round(sv / ciudadanos.length) };
}

export interface ResultadoOrden {
  /** A cuántas unidades se les dio ruta. */
  movidas: number;
  /** A cuántas no hubo forma de darles destino alcanzable. */
  sinRuta: number;
  /** Destinos repartidos, en el orden de las unidades que los recibieron (para dibujar el aviso). */
  destinos: Tile[];
}

/**
 * Orden de movimiento a un grupo de unidades con una formación. Las unidades se ordenan por cercanía al
 * destino antes de repartir los huecos, así el que ya está cerca se queda el hueco central y el grupo no se
 * cruza al arrancar. Con `encadenar`, la orden se añade a la ruta actual en vez de reemplazarla.
 */
export function ordenDeGrupo(
  ciudadanos: readonly Ciudadano[], oc: Ocupacion, formacion: Formacion, destino: Tile,
  cfg: ConfigFormacion = CFG_FORMACION,
): ResultadoOrden {
  if (ciudadanos.length === 0) return { movidas: 0, sinRuta: 0, destinos: [] };
  const centro = centroDeUnidades(ciudadanos);
  // Los huecos salen del centro hacia fuera: los reparte quien más cerca está del destino.
  const orden = [...ciudadanos].sort((a, b) => dist2(a, destino) - dist2(b, destino) || (a.id < b.id ? -1 : 1));
  const destinos = destinosFormacion(oc, formacion, centro, destino, ciudadanos.length, cfg);

  let movidas = 0;
  let sinRuta = 0;
  const repartidos: Tile[] = [];
  for (let i = 0; i < orden.length; i++) {
    const d = destinos[i];
    if (!d) { sinRuta++; continue; }
    if (irATile(orden[i], oc, d)) { movidas++; repartidos.push(d); }
    else sinRuta++;
  }
  return { movidas, sinRuta, destinos: repartidos };
}

/** Distancia al cuadrado (no hace falta la raíz para ordenar). */
function dist2(ci: Ciudadano, t: Tile): number {
  const du = ci.u - t.u;
  const dv = ci.v - t.v;
  return du * du + dv * dv;
}

/**
 * Velocidad que debe usar el grupo: la del más lento. Devuelve los ticks de espera extra que hay que añadir
 * a los rápidos para que nadie se adelante. (P4b mueve a todos a la misma velocidad; esto deja el dato listo
 * para cuando los oficios tengan velocidades distintas y el test del «grupo compacto» lo compruebe.)
 */
export function velocidadDeGrupo(velocidades: readonly number[]): number {
  if (velocidades.length === 0) return tuning.ciudadano.velocidad;
  return Math.min(...velocidades);
}
