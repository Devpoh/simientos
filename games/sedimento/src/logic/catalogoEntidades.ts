// Catálogo de entidades seleccionables (P5, R51, §5): junta en una lista lo que el jugador puede pinchar
// —ciudadanos (unidad), animales (animal) y edificios— con la forma que espera `logic/seleccion.ts`.
// Lógica pura: se reconstruye cuando cambia la aldea o quien camina, no cada fotograma.
import type { Ciudadano } from './ciudadano';
import type { Entidad } from './seleccion';

/** Edificio mínimo para entrar en el catálogo (la aldea y la ocupación lo cumplen). */
export interface EdificioCatalogo {
  id: string;
  u: number;
  v: number;
  w: number;
  d: number;
}

/** Unidad no ciudadana (los animales de la aldea) que se puede pinchar. */
export interface UnidadCatalogo {
  id: string;
  u: number;
  v: number;
  /** Estado en el sitio (pastar…): es su «tipo» a efectos de doble clic. */
  estado: string;
}

/**
 * Construye el catálogo. El tipo de un ciudadano es su sprite (oficio + género), el de un animal su estado,
 * y el de un edificio su id de sprite (`edificio`). El doble clic coge todos los del mismo tipo.
 */
export function catalogoEntidades(
  ciudadanos: readonly Ciudadano[], animales: readonly UnidadCatalogo[], edificios: readonly EdificioCatalogo[],
): Entidad[] {
  const salida: Entidad[] = [];
  for (const ci of ciudadanos) {
    salida.push({ id: ci.id, clase: 'unidad', u: ci.u, v: ci.v, w: 0, d: 0, tipo: ci.sprite });
  }
  for (const a of animales) {
    salida.push({ id: a.id, clase: 'animal', u: a.u, v: a.v, w: 0, d: 0, tipo: a.estado });
  }
  for (const e of edificios) {
    salida.push({ id: e.id, clase: 'edificio', u: e.u, v: e.v, w: e.w, d: e.d, tipo: e.id.split('_')[0] });
  }
  return salida;
}

/** Ids vivos del catálogo, para podar la selección y los grupos sin recorrer el catálogo muchas veces. */
export function idsVivos(entidades: readonly Entidad[]): Set<string> {
  const s = new Set<string>();
  for (const e of entidades) s.add(e.id);
  return s;
}
