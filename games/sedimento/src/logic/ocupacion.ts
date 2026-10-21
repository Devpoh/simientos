// Rejilla de ocupación única (P3, R50): 1 tile = `SUBCELDAS`×`SUBCELDAS` subceldas.
// Es la única fuente de verdad de qué se puede pisar y qué se puede construir: colocación (puedeColocar),
// navegación (bloqueada) y depuración (F3) leen de aquí. Lógica pura, sin Phaser ni DOM.
//
// Capas, de abajo arriba:
//   terreno    — agua profunda, acantilado y pendiente excesiva. No lo cambia nadie en partida.
//   estructuras— huella de cada edificio y sus puertas (celdas de acceso).
//   objetos    — props, troncos, rocas. Bloquean, pero se pueden apartar.
//   dinamica   — unidades. Reserva blanda: sirve para no solapar dos cosas en la misma subcelda.
//
// Cada subcelda vale `libre | bloqueada | puerta | camino`. «puerta» es una celda de estructuras que sí se
// puede pisar (por ahí entra el ciudadano); «camino» es reserva de suelo para el trazado (P3b).
import tuning from '../data/tuning.json';
import type { Huella } from './iso';
import type { Superficie } from './horneado';

/** Subceldas por lado de tile. Un tile se parte en 4×4 = 16 subceldas. */
export const SUBCELDAS = tuning.ocupacion.subceldas;

export const LIBRE = 0;
export const BLOQUEADA = 1;
export const PUERTA = 2;
export const CAMINO = 3;

export type NombreCapa = 'terreno' | 'estructuras' | 'objetos' | 'dinamica';
export const CAPAS: readonly NombreCapa[] = ['terreno', 'estructuras', 'objetos', 'dinamica'];

/** Giro en cuartos de vuelta (0..3), sobre el eje vertical. 0 y 2 dejan la huella w×d; 1 y 3, d×w (R61). */
export type Giro = 0 | 1 | 2 | 3;

/** Por qué no se puede colocar. Se muestra tal cual en la interfaz. */
export type MotivoNoColocable = 'fuera' | 'agua' | 'pendiente' | 'estructura' | 'objeto' | 'dinamica' | 'camino';

export const MOTIVOS: Record<MotivoNoColocable, string> = {
  fuera: 'fuera del mapa',
  agua: 'en el agua',
  pendiente: 'pendiente excesiva',
  estructura: 'hay una estructura',
  objeto: 'hay un objeto',
  dinamica: 'hay alguien ahí',
  camino: 'pisa un camino',
};

export type ResultadoColocacion = { ok: true } | { ok: false; motivo: MotivoNoColocable };

/** Un tile de la rejilla en coordenadas absolutas. */
export interface Tile {
  u: number;
  v: number;
}

/** Celda de acceso, en tiles relativos a la esquina trasera de la huella. Mismo dato que el atlas. */
export interface PuertaLocal {
  i: number;
  j: number;
}

/** Una estructura ya colocada, para poder liberarla al derribar. */
export interface EstructuraColocada {
  id: string;
  huella: Huella;
  u: number;
  v: number;
  giro: Giro;
  /** Tiles de acceso en coordenadas absolutas. Quedan fuera de la huella, así que hay que guardarlos. */
  puertas: Tile[];
}

export interface Ocupacion {
  tilesU: number;
  tilesV: number;
  /** Subceldas por lado (tiles × SUBCELDAS). */
  subU: number;
  subV: number;
  capas: Record<NombreCapa, Uint8Array>;
  /** Motivo por tile del bloqueo de terreno: 0 libre, 1 agua, 2 pendiente. Sirve para explicarlo en la interfaz. */
  terrenoMotivo: Uint8Array;
  /** Estructuras vivas, indexadas por su tile de esquina trasera. */
  estructuras: Map<number, EstructuraColocada>;
  /** Cuántas veces se ha intentado algo imposible: siempre debe ser 0 (lo publica `exponer()`). */
  violaciones: number;
}

/** Huella real tras aplicar el giro: 0 y 2 no cambian nada; 1 y 3 intercambian ancho y fondo. */
export function huellaGirada(h: Huella, giro: Giro): Huella {
  return giro % 2 === 0 ? { w: h.w, d: h.d } : { w: h.d, d: h.w };
}

/**
 * Celda de acceso tras el giro, en tiles relativos a la esquina trasera ya girada. La rotación es la del
 * grupo cíclico de 90°: g1=(d-1-j, i), g2=(w-1-i, d-1-j), g3=(j, w-1-i), con la huella original w×d.
 */
export function puertaGirada(p: PuertaLocal, h: Huella, giro: Giro): PuertaLocal {
  const { w, d } = h;
  switch (giro) {
    case 0: return { i: p.i, j: p.j };
    case 1: return { i: d - 1 - p.j, j: p.i };
    case 2: return { i: w - 1 - p.i, j: d - 1 - p.j };
    case 3: return { i: p.j, j: w - 1 - p.i };
  }
}

export function crearOcupacionVacia(tilesU: number, tilesV: number): Ocupacion {
  const capas = {} as Record<NombreCapa, Uint8Array>;
  for (const c of CAPAS) capas[c] = new Uint8Array(tilesU * tilesV * SUBCELDAS * SUBCELDAS);
  return {
    tilesU, tilesV, subU: tilesU * SUBCELDAS, subV: tilesV * SUBCELDAS, capas,
    terrenoMotivo: new Uint8Array(tilesU * tilesV), estructuras: new Map(), violaciones: 0,
  };
}

const indiceSub = (oc: Ocupacion, su: number, sv: number): number => sv * oc.subU + su;

/** Motivos del bloqueo de terreno. 0 = pisable; el resto, no. */
export const TERRENO_LIBRE = 0;
export const TERRENO_AGUA = 1;
export const TERRENO_PENDIENTE = 2;

/**
 * Capa de terreno por tile: 0 = pisable, `TERRENO_AGUA` (lámina de agua por encima del suelo) o
 * `TERRENO_PENDIENTE` (desnivel con una vecina por encima de `pendienteMax`, o sea acantilado).
 */
export function calcularTerreno(
  sup: Superficie, tilesU: number, tilesV: number, pendienteMax: number = tuning.ocupacion.pendienteMax,
): Uint8Array {
  const t = new Uint8Array(tilesU * tilesV);
  const altura = (u: number, v: number): number => sup.suelo(u + 0.5, v + 0.5);
  const inundado = (u: number, v: number): boolean => {
    const a = sup.agua(u + 0.5, v + 0.5);
    return !Number.isNaN(a) && a > sup.suelo(u + 0.5, v + 0.5);
  };
  for (let v = 0; v < tilesV; v++) {
    for (let u = 0; u < tilesU; u++) {
      const k = v * tilesU + u;
      if (inundado(u, v)) { t[k] = TERRENO_AGUA; continue; }
      const h = altura(u, v);
      let abrupto = false;
      for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nu = u + du;
        const nv = v + dv;
        if (nu < 0 || nv < 0 || nu >= tilesU || nv >= tilesV) continue;
        if (Math.abs(altura(nu, nv) - h) > pendienteMax) { abrupto = true; break; }
      }
      t[k] = abrupto ? TERRENO_PENDIENTE : TERRENO_LIBRE;
    }
  }
  return t;
}

/** Vuelca la capa de terreno (por tile) a la rejilla de subceldas y guarda el motivo por tile. */
export function fijarTerreno(oc: Ocupacion, terreno: Uint8Array): void {
  oc.terrenoMotivo.set(terreno);
  const capa = oc.capas.terreno;
  for (let v = 0; v < oc.tilesV; v++) {
    for (let u = 0; u < oc.tilesU; u++) {
      if (!terreno[v * oc.tilesU + u]) continue;
      for (let sv = 0; sv < SUBCELDAS; sv++) {
        for (let su = 0; su < SUBCELDAS; su++) {
          capa[indiceSub(oc, u * SUBCELDAS + su, v * SUBCELDAS + sv)] = BLOQUEADA;
        }
      }
    }
  }
}

export function crearOcupacion(sup: Superficie, tilesU: number, tilesV: number, pendienteMax?: number): Ocupacion {
  const oc = crearOcupacionVacia(tilesU, tilesV);
  fijarTerreno(oc, calcularTerreno(sup, tilesU, tilesV, pendienteMax));
  return oc;
}

/** Subceldas que cubre una huella girada con esquina trasera (u, v). Llama a `visita` por cada una. */
function porSubcelda(oc: Ocupacion, h: Huella, u: number, v: number, giro: Giro, visita: (su: number, sv: number, k: number) => void): void {
  const g = huellaGirada(h, giro);
  const su0 = u * SUBCELDAS;
  const sv0 = v * SUBCELDAS;
  for (let sv = 0; sv < g.d * SUBCELDAS; sv++) {
    for (let su = 0; su < g.w * SUBCELDAS; su++) {
      visita(su0 + su, sv0 + sv, indiceSub(oc, su0 + su, sv0 + sv));
    }
  }
}

function dentroSub(oc: Ocupacion, su: number, sv: number): boolean {
  return su >= 0 && sv >= 0 && su < oc.subU && sv < oc.subV;
}

/**
 * ¿Se puede colocar una huella `h` con esquina trasera (u, v) y giro `giro`? Rechaza, en este orden:
 * fuera del mapa, agua/acantilado/pendiente (terreno), estructura, objeto, unidad (dinámica) y camino.
 * Las puertas de las estructuras no bloquean: se puede edificar pegado a la entrada.
 */
export function puedeColocar(oc: Ocupacion, h: Huella, u: number, v: number, giro: Giro = 0): ResultadoColocacion {
  const g = huellaGirada(h, giro);
  if (u < 0 || v < 0 || u + g.w > oc.tilesU || v + g.d > oc.tilesV) return { ok: false, motivo: 'fuera' };
  const capas = oc.capas;
  let motivo: MotivoNoColocable | null = null;
  porSubcelda(oc, h, u, v, giro, (su, sv, k) => {
    if (motivo !== null) return;
    if (capas.terreno[k] !== LIBRE) {
      // El motivo del terreno se guarda por tile: así la interfaz dice «en el agua» o «pendiente excesiva».
      const t = oc.terrenoMotivo[Math.floor(sv / SUBCELDAS) * oc.tilesU + Math.floor(su / SUBCELDAS)];
      motivo = t === TERRENO_AGUA ? 'agua' : 'pendiente';
      return;
    }
    if (capas.estructuras[k] === BLOQUEADA) { motivo = 'estructura'; return; }
    if (capas.estructuras[k] === CAMINO) { motivo = 'camino'; return; }
    if (capas.objetos[k] !== LIBRE) { motivo = 'objeto'; return; }
    if (capas.dinamica[k] !== LIBRE) { motivo = 'dinamica'; return; }
  });
  return motivo !== null ? { ok: false, motivo } : { ok: true };
}

/**
 * Coloca una estructura: marca su huella como bloqueada y sus puertas como `puerta` (pisables).
 * Devuelve `false` si el sitio no valía; un intento rechazado es normal (el jugador prueba y la interfaz
 * le dice el motivo), así que no cuenta como violación.
 */
export function colocarEstructura(
  oc: Ocupacion, id: string, h: Huella, u: number, v: number, giro: Giro = 0, puertas: readonly PuertaLocal[] = [],
): boolean {
  const r = puedeColocar(oc, h, u, v, giro);
  if (!r.ok) return false;
  porSubcelda(oc, h, u, v, giro, (_su, _sv, k) => { oc.capas.estructuras[k] = BLOQUEADA; });
  for (const p of puertas) {
    const pg = puertaGirada(p, h, giro);
    const du = u + pg.i;
    const dv = v + pg.j;
    if (du < 0 || dv < 0 || du >= oc.tilesU || dv >= oc.tilesV) continue;
    for (let sv = 0; sv < SUBCELDAS; sv++) {
      for (let su = 0; su < SUBCELDAS; su++) {
        const k = indiceSub(oc, du * SUBCELDAS + su, dv * SUBCELDAS + sv);
        // La puerta solo abre paso: nunca tapa un obstáculo ya presente.
        if (oc.capas.estructuras[k] === BLOQUEADA || oc.capas.terreno[k] !== LIBRE) continue;
        oc.capas.estructuras[k] = PUERTA;
      }
    }
  }
  const puertasAbs: Tile[] = [];
  for (const p of puertas) {
    const pg = puertaGirada(p, h, giro);
    const du = u + pg.i;
    const dv = v + pg.j;
    if (du < 0 || dv < 0 || du >= oc.tilesU || dv >= oc.tilesV) continue;
    puertasAbs.push({ u: du, v: dv });
  }
  oc.estructuras.set(v * oc.tilesU + u, { id, huella: h, u, v, giro, puertas: puertasAbs });
  return true;
}

/** Derriba la estructura cuya huella contiene el tile (u, v) y libera su ocupación. Devuelve lo derribado. */
export function derribarEn(oc: Ocupacion, u: number, v: number): EstructuraColocada | null {
  for (const e of oc.estructuras.values()) {
    const g = huellaGirada(e.huella, e.giro);
    if (u >= e.u && u < e.u + g.w && v >= e.v && v < e.v + g.d) {
      porSubcelda(oc, e.huella, e.u, e.v, e.giro, (_su, _sv, k) => { oc.capas.estructuras[k] = LIBRE; });
      // Las puertas quedan fuera de la huella: si no se limpian, dejarían un acceso fantasma.
      for (const p of e.puertas) {
        for (let sv = 0; sv < SUBCELDAS; sv++) {
          for (let su = 0; su < SUBCELDAS; su++) {
            const k = indiceSub(oc, p.u * SUBCELDAS + su, p.v * SUBCELDAS + sv);
            if (oc.capas.estructuras[k] === PUERTA) oc.capas.estructuras[k] = LIBRE;
          }
        }
      }
      oc.estructuras.delete(e.v * oc.tilesU + e.u);
      return e;
    }
  }
  return null;
}

/** Marca un objeto (prop, tronco, roca) en una huella. Bloquea el paso pero se puede apartar. */
export function colocarObjeto(oc: Ocupacion, h: Huella, u: number, v: number, giro: Giro = 0): void {
  porSubcelda(oc, h, u, v, giro, (_su, _sv, k) => { oc.capas.objetos[k] = BLOQUEADA; });
}

/** Reserva una subcelda como camino (P3b). `valor` permite borrar (`LIBRE`) o repintar. */
export function marcarCamino(oc: Ocupacion, su: number, sv: number, valor: number = CAMINO): void {
  if (!dentroSub(oc, su, sv)) return;
  oc.capas.estructuras[indiceSub(oc, su, sv)] = valor;
}

/** Reserva blanda de una unidad en una subcelda (dinámica). */
export function reservarDinamica(oc: Ocupacion, su: number, sv: number, ocupada: boolean): void {
  if (!dentroSub(oc, su, sv)) return;
  oc.capas.dinamica[indiceSub(oc, su, sv)] = ocupada ? BLOQUEADA : LIBRE;
}

/**
 * ¿Está el tile (u, v) bloqueado para caminar? Un tile lo está si todas sus subceldas de terreno,
 * estructuras y objetos están bloqueadas; una puerta o una subcelda libre lo dejan franco.
 */
export function bloqueada(oc: Ocupacion, u: number, v: number): boolean {
  if (u < 0 || v < 0 || u >= oc.tilesU || v >= oc.tilesV) return true;
  for (let sv = 0; sv < SUBCELDAS; sv++) {
    for (let su = 0; su < SUBCELDAS; su++) {
      const k = indiceSub(oc, u * SUBCELDAS + su, v * SUBCELDAS + sv);
      if (oc.capas.terreno[k] !== BLOQUEADA && oc.capas.estructuras[k] !== BLOQUEADA && oc.capas.objetos[k] === LIBRE) return false;
    }
  }
  return true;
}

/** Estado dominante del tile para la vista F3: `puerta` si tiene alguna, si no `camino`, si no `bloqueada`, si no `libre`. */
export function estadoTile(oc: Ocupacion, u: number, v: number): number {
  if (u < 0 || v < 0 || u >= oc.tilesU || v >= oc.tilesV) return BLOQUEADA;
  let hayPuerta = false;
  let hayCamino = false;
  let hayLibre = false;
  for (let sv = 0; sv < SUBCELDAS; sv++) {
    for (let su = 0; su < SUBCELDAS; su++) {
      const k = indiceSub(oc, u * SUBCELDAS + su, v * SUBCELDAS + sv);
      const e = oc.capas.estructuras[k];
      if (e === PUERTA) hayPuerta = true;
      else if (e === CAMINO) hayCamino = true;
      // Un camino no es «libre»: es transitable pero cuesta menos, y la interfaz lo pinta distinto.
      if (oc.capas.terreno[k] !== BLOQUEADA && e !== BLOQUEADA && e !== CAMINO && oc.capas.objetos[k] === LIBRE) hayLibre = true;
    }
  }
  if (hayPuerta) return PUERTA;
  if (hayLibre) return LIBRE;
  return hayCamino ? CAMINO : BLOQUEADA;
}

/** Cuántas estructuras vivas hay. */
export function nEstructuras(oc: Ocupacion): number {
  return oc.estructuras.size;
}

/**
 * Auditoría de invariantes (la que alimenta `colisionesViolaciones`, y que `npm run shot` exige a 0):
 *  - ninguna unidad (dinámica) metida en una subcelda bloqueada;
 *  - ninguna estructura solapada con otra estructura u objeto.
 * Un intento de colocación rechazado NO es una violación: es el jugador probando y la interfaz diciendo por qué.
 */
export function auditar(oc: Ocupacion): number {
  let fallos = oc.violaciones;
  const { terreno, estructuras, objetos, dinamica } = oc.capas;
  for (let k = 0; k < dinamica.length; k++) {
    if (dinamica[k] !== LIBRE && (terreno[k] === BLOQUEADA || estructuras[k] === BLOQUEADA || objetos[k] !== LIBRE)) fallos++;
  }
  const lista = [...oc.estructuras.values()];
  for (let a = 0; a < lista.length; a++) {
    const g = huellaGirada(lista[a].huella, lista[a].giro);
    for (let b = a + 1; b < lista.length; b++) {
      const h = huellaGirada(lista[b].huella, lista[b].giro);
      const solapa = lista[a].u < lista[b].u + h.w && lista[b].u < lista[a].u + g.w
        && lista[a].v < lista[b].v + h.d && lista[b].v < lista[a].v + g.d;
      if (solapa) fallos++;
    }
    porSubcelda(oc, lista[a].huella, lista[a].u, lista[a].v, lista[a].giro, (_su, _sv, k) => {
      if (objetos[k] !== LIBRE) fallos++;
    });
  }
  return fallos;
}

/** Número de violaciones reales de la rejilla (unidades dentro de muros, solapes). Debe ser 0 siempre. */
export function colisionesViolaciones(oc: Ocupacion): number {
  return auditar(oc);
}
