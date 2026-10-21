// Selección múltiple (P5, R51, §5 del pivote). Lógica pura: la presentación traduce el ratón a tiles y aquí
// se decide qué queda seleccionado. Sin Phaser ni DOM, así que todo esto se prueba sin navegador.
//
// Prioridad de clic: unidad > animal > edificio > suelo. Manda «la más cercana al cursor» y la prioridad
// desempata a igualdad de distancia, que es el caso real: un ciudadano parado en la puerta de una casa deja
// a los dos a distancia 0 y el clic debe quedarse con el ciudadano.
import tuning from '../data/tuning.json';

export type ClaseEntidad = 'unidad' | 'animal' | 'edificio';

/** Menor número = gana antes en el clic. */
export const PRIORIDAD: Record<ClaseEntidad, number> = { unidad: 0, animal: 1, edificio: 2 };

/** Lo mínimo que la selección necesita saber de algo seleccionable. */
export interface Entidad {
  id: string;
  clase: ClaseEntidad;
  /** Punto de pies (unidades y animales) o esquina trasera de la huella (edificios), en tiles. */
  u: number;
  v: number;
  /** Huella en tiles; 0 en unidades y animales, que son un punto. */
  w: number;
  d: number;
  /** Tipo/oficio/sprite: lo que comparten dos entidades «del mismo tipo» (doble clic). */
  tipo: string;
}

export interface Seleccion {
  /** Ids seleccionados, en orden de selección: el primero es el líder al pedir órdenes. */
  ids: string[];
}

export const SIN_SELECCION: Seleccion = { ids: [] };

/** Cuántos grupos guardables hay (Ctrl+1…9). */
export const SLOTS_GRUPO = tuning.seleccion.slotsGrupo;

/** Radio de clic por defecto, en tiles. Los edificios se tocan con el radio propio, más corto. */
export const RADIO_CLIC = tuning.seleccion.radioClicTiles;
export const RADIO_EDIFICIO = tuning.seleccion.radioEdificioTiles;

export function seleccion(ids: readonly string[] = []): Seleccion {
  return { ids: [...ids] };
}

export function estaSeleccionada(sel: Seleccion, id: string): boolean {
  return sel.ids.includes(id);
}

/** Distancia en tiles del punto (u, v) a la entidad. 0 si el punto cae dentro de su huella. */
export function distanciaA(e: Entidad, u: number, v: number): number {
  if (e.w <= 0 || e.d <= 0) return Math.hypot(u - e.u, v - e.v);
  const du = Math.max(e.u - u, 0, u - (e.u + e.w));
  const dv = Math.max(e.v - v, 0, v - (e.v + e.d));
  return Math.hypot(du, dv);
}

/** Radio de alcance del clic para una entidad: los edificios se tocan con el radio corto. */
export function radioDe(e: Entidad): number {
  return e.clase === 'edificio' ? RADIO_EDIFICIO : RADIO_CLIC;
}

/**
 * Candidatas a las que el clic alcanza, de más a menos preferible: por distancia, luego por prioridad de
 * clase y por último por id (para que el resultado sea determinista aunque el orden de entrada cambie).
 */
export function candidatas(entidades: readonly Entidad[], u: number, v: number): Entidad[] {
  const salida: { e: Entidad; d: number }[] = [];
  for (const e of entidades) {
    const d = distanciaA(e, u, v);
    if (d <= radioDe(e)) salida.push({ e, d });
  }
  salida.sort((a, b) => a.d - b.d || PRIORIDAD[a.e.clase] - PRIORIDAD[b.e.clase] || (a.e.id < b.e.id ? -1 : a.e.id > b.e.id ? 1 : 0));
  return salida.map((x) => x.e);
}

/** Entidad bajo el cursor, o `null` si el clic cae en suelo vacío (entonces toca caja de selección). */
export function entidadEn(entidades: readonly Entidad[], u: number, v: number): Entidad | null {
  const c = candidatas(entidades, u, v);
  return c.length > 0 ? c[0] : null;
}

/** Modificadores del clic: Mayús o Ctrl suman o quitan en vez de reemplazar. */
export interface Modificadores {
  sumar: boolean;
}

/**
 * Clic sobre una entidad: con Mayús/Ctrl suma (y quita si ya estaba); sin él, selecciona solo esa, y si ya
 * era la única seleccionada la deselecciona (así un segundo clic sobre lo mismo limpia).
 */
export function alClic(sel: Seleccion, entidad: Entidad, mod: Modificadores = { sumar: false }): Seleccion {
  if (mod.sumar) return alternar(sel, entidad.id);
  if (sel.ids.length === 1 && sel.ids[0] === entidad.id) return SIN_SELECCION;
  return seleccion([entidad.id]);
}

/** Clic en suelo vacío: sin modificadores deselecciona todo. */
export function alClicVacio(sel: Seleccion, mod: Modificadores = { sumar: false }): Seleccion {
  return mod.sumar ? sel : SIN_SELECCION;
}

/** ¿Cae la entidad dentro de la caja (u0,v0)-(u1,v1)? Los edificios cuentan si su huella la toca. */
export function dentroDeCaja(e: Entidad, u0: number, v0: number, u1: number, v1: number): boolean {
  const minU = Math.min(u0, u1);
  const maxU = Math.max(u0, u1);
  const minV = Math.min(v0, v1);
  const maxV = Math.max(v0, v1);
  if (e.w <= 0 || e.d <= 0) return e.u >= minU && e.u <= maxU && e.v >= minV && e.v <= maxV;
  return e.u < maxU && e.u + e.w > minU && e.v < maxV && e.v + e.d > minV;
}

/** Entidades que caen dentro de la caja, en orden de prioridad y luego por id. */
export function enCaja(entidades: readonly Entidad[], u0: number, v0: number, u1: number, v1: number): Entidad[] {
  const dentro = entidades.filter((e) => dentroDeCaja(e, u0, v0, u1, v1));
  dentro.sort((a, b) => PRIORIDAD[a.clase] - PRIORIDAD[b.clase] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return dentro;
}

/** Suelta la caja: sin modificadores reemplaza la selección; con Mayús/Ctrl, la suma. */
export function alCaja(sel: Seleccion, entidades: readonly Entidad[], u0: number, v0: number, u1: number, v1: number, mod: Modificadores = { sumar: false }): Seleccion {
  const ids = enCaja(entidades, u0, v0, u1, v1).map((e) => e.id);
  if (ids.length === 0) return alClicVacio(sel, mod);
  if (!mod.sumar) return seleccion(ids);
  return seleccion([...sel.ids, ...ids.filter((id) => !sel.ids.includes(id))]);
}

/** Añade si no estaba, quita si estaba. */
export function alternar(sel: Seleccion, id: string): Seleccion {
  return sel.ids.includes(id) ? { ids: sel.ids.filter((x) => x !== id) } : { ids: [...sel.ids, id] };
}

/** Doble clic: todos los del mismo tipo que la entidad clicada, de entre las que se le pasen (las visibles). */
export function alDobleClic(entidades: readonly Entidad[], id: string): Seleccion {
  const base = entidades.find((e) => e.id === id);
  if (!base) return SIN_SELECCION;
  return seleccion(entidades.filter((e) => e.tipo === base.tipo && e.clase === base.clase).map((e) => e.id));
}

/** Quita un id concreto (una unidad que muere o desaparece). */
export function quitar(sel: Seleccion, id: string): Seleccion {
  return sel.ids.includes(id) ? { ids: sel.ids.filter((x) => x !== id) } : sel;
}

/** Deja solo los ids que siguen existiendo, conservando el orden. */
export function podar(sel: Seleccion, existentes: ReadonlySet<string>): Seleccion {
  const ids = sel.ids.filter((id) => existentes.has(id));
  return ids.length === sel.ids.length ? sel : { ids };
}

/** Grupos guardables con Ctrl+1…9. */
export type Grupos = Map<number, readonly string[]>;

/** Guarda la selección actual en un slot (1…9). Un slot vacío se olvida. */
export function guardarGrupo(grupos: Grupos, slot: number, sel: Seleccion): void {
  if (slot < 1 || slot > SLOTS_GRUPO) return;
  if (sel.ids.length === 0) grupos.delete(slot);
  else grupos.set(slot, [...sel.ids]);
}

/** Recupera un grupo; descarta los ids que ya no existen y no falla si el slot está vacío. */
export function recuperarGrupo(grupos: Grupos, slot: number, existentes: ReadonlySet<string>): Seleccion {
  const ids = grupos.get(slot);
  if (!ids) return SIN_SELECCION;
  return seleccion(ids.filter((id) => existentes.has(id)));
}

/** ¿Tiene el grupo algún miembro vivo? La presentación lo usa para atenuar el botón del slot. */
export function grupoVivo(grupos: Grupos, slot: number, existentes: ReadonlySet<string>): boolean {
  const ids = grupos.get(slot);
  return !!ids && ids.some((id) => existentes.has(id));
}
