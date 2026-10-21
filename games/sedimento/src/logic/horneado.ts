// Horneado del terreno (R59): convierte una superficie (altura del suelo y del agua en (u,v), en tiles) en una imagen
// isométrica de índices de paleta. Se hace UNA vez al cargar; el juego solo dibuja los trozos visibles.
// Método: «voxel space» por columnas. Cada columna de pantalla recorre el terreno de lo más cercano a lo más lejano
// y pinta solo lo que asoma por encima de lo ya pintado, así que laderas, acantilados y costa salen del relieve.
// Luz única desde la izquierda: la normal del relieve (y la sombra que proyectan las cumbres) se cuantiza en los tonos
// de cada rampa; roca y nieve en bandas duras (sin tramado) y, al final, una limpieza morfológica quita las manchas
// de pocos píxeles. Lógica pura y determinista: sin Phaser ni DOM.
import { fbm } from './ruido';
import { RAMPAS, tonoDe } from '../data/paleta';

/** Lo que hace falta saber del mundo para hornearlo. Las coordenadas están en tiles de la rejilla. */
export interface Superficie {
  /** Altura del suelo (unidades de mundo; 1 unidad = 1 tile de ancho). Puede ser negativa bajo el mar. */
  suelo(u: number, v: number): number;
  /** Cota de la lámina de agua, o NaN donde no hay agua. */
  agua(u: number, v: number): number;
  /** Fertilidad 0..1 (suave, sin hexágonos): tiñe el llano de más seco a más lozano. Opcional. */
  fertilidad?(u: number, v: number): number;
}

export interface ConfigHorneado {
  tilesU: number;
  tilesV: number;
  tileAncho: number;
  tileAlto: number;
  /** Altura máxima del suelo (unidades de mundo), para reservar filas por encima del rombo. */
  alturaMax: number;
  /** Píxeles de pantalla por unidad de altura. */
  pxPorAltura: number;
  nivelMar: number;
  semilla: number;
  /** Pendiente (|∇h|) desde la que el suelo se ve como roca. */
  pendienteRoca: number;
  /** Altura sobre el nivel del mar desde la que la roca clara (nieve/caliza) cubre las cumbres. */
  alturaCumbre: number;
  /** Altura sobre el nivel del mar hasta la que hay arena de playa junto al agua. */
  alturaPlaya: number;
  /** Cuántas muestras por píxel de pantalla en el recorrido de cada columna (≥ 1 evita huecos). */
  muestrasPorPixel: number;
  /** Ruido (0..1) por encima del cual la orilla de un río o lago es de arena; por debajo, de hierba. En el mar siempre hay playa. */
  umbralArenaDulce: number;
  /** Sombras proyectadas por el relieve: muestras por tile de su rejilla y longitud máxima (tiles). 0 = sin sombras. */
  resolucionSombra: number;
  alcanceSombra: number;
  /** Las regiones de un mismo material con menos píxeles que esto se funden con las vecinas (≤ 1 = sin limpieza). */
  minRegion: number;
}

export interface ImagenIndices {
  ancho: number;
  alto: number;
  /** Esquina superior izquierda de la imagen en píxeles de mundo (zoom 1). */
  origenX: number;
  origenY: number;
  /** Índice de paleta por píxel; `VACIO` = transparente (fuera del mapa). */
  datos: Uint8Array;
  /** Por píxel: 0 sin agua, 1 mar, 2 agua dulce (río o lago). Lo usa la animación del agua (R87). */
  agua?: Uint8Array;
}

export const VACIO = 255;
/** Valores de `ImagenIndices.agua`. */
export const SIN_AGUA = 0;
export const AGUA_MAR = 1;
export const AGUA_DULCE = 2;

/** Materiales (una clase por rampa): la limpieza morfológica opera sobre ellos. */
const CLASE = { agua: 0, hierba: 1, tierra: 2, roca: 3, piedra: 4 } as const;
type Clase = keyof typeof CLASE;
/** Tonos permitidos por material: el más oscuro de roca y piedra es casi tinta y dibuja «rayas negras». */
const TONO_MIN: Record<Clase, number> = { agua: 0, hierba: 1, tierra: 1, roca: 1, piedra: 3 };
const TONO_MAX: Record<Clase, number> = { agua: 6, hierba: 5, tierra: 6, roca: 3, piedra: 6 };

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Tono entero con tramado ordenado: transiciones suaves sin salirse de la rampa. */
function cuantizar(tono: number, x: number, y: number): number {
  return Math.floor(tono + BAYER[(y & 3) * 4 + (x & 3)]);
}

/** Dirección hacia la luz en (u, v, z): viene de la izquierda de la pantalla (u menor, v mayor) y de arriba. */
const LUZ = (() => {
  const l = [-0.55, 0.55, 0.62];
  const n = Math.hypot(l[0], l[1], l[2]);
  return [l[0] / n, l[1] / n, l[2] / n] as const;
})();
const LUZ_PLANO = LUZ[2];
/** Pendiente del rayo de sol (altura por tile en horizontal) y su dirección horizontal unitaria hacia la luz. */
const SOL_HOR = Math.hypot(LUZ[0], LUZ[1]);
const SOL_TAN = LUZ[2] / SOL_HOR;
const SOL_U = LUZ[0] / SOL_HOR;
const SOL_V = LUZ[1] / SOL_HOR;

/** Sombra continua → nivel entero (−2..2): las caras del relieve se pintan en bandas, como pixel art dibujado a mano. */
function banda(sombra: number): number {
  return Math.max(-2, Math.min(2, Math.round(sombra * 7)));
}

const limitar = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

interface Muestra {
  /** Altura de la superficie visible (suelo o agua). */
  altura: number;
  clase: Clase;
  tono: number;
  /** Sombreado en bandas duras, sin tramado: roca y nieve (con tramado se lee como difuminado). */
  duro?: boolean;
  /** Si es agua: mar o dulce (para la animación, R87). */
  agua?: 1 | 2;
}

/** Agua a menos de `r` tiles: el mar (lámina al nivel del mar), el agua dulce (río o lago, por encima), o ninguna. */
function aguaCerca(sup: Superficie, cfg: ConfigHorneado, u: number, v: number, r: number): 'mar' | 'dulce' | null {
  let dulce = false;
  for (const [du, dv] of [[r, 0], [-r, 0], [0, r], [0, -r]] as const) {
    const a = sup.agua(u + du, v + dv);
    if (Number.isNaN(a) || a <= sup.suelo(u + du, v + dv)) continue;
    if (a <= cfg.nivelMar + 0.04) return 'mar';
    dulce = true;
  }
  return dulce ? 'dulce' : null;
}

export type TipoOrilla = 'arena' | 'ribera' | null;

/**
 * Qué hay junto al agua en un punto de tierra baja: arena en toda la costa del mar y solo en algunos tramos de río y
 * lago (lo decide un ruido suave, así no hay arena «de ley» junto a cualquier agua); el resto es ribera de hierba.
 */
export function tipoDeOrilla(sup: Superficie, cfg: ConfigHorneado, u: number, v: number): TipoOrilla {
  if (sup.suelo(u, v) - cfg.nivelMar >= cfg.alturaPlaya) return null;
  const agua = aguaCerca(sup, cfg, u, v, 1.5);
  if (agua === null) return null;
  if (agua === 'mar') return 'arena';
  return fbm(cfg.semilla + 101, u * 0.1, v * 0.1, 2) > cfg.umbralArenaDulce ? 'arena' : 'ribera';
}

/** Rejilla de sombra proyectada: 1 donde una cumbre tapa el sol. Se calcula una vez; después solo se consulta. */
class Sombras {
  private readonly datos: Uint8Array;
  private readonly nu: number;
  private readonly nv: number;
  private readonly r: number;

  constructor(sup: Superficie, cfg: ConfigHorneado) {
    const r = cfg.resolucionSombra;
    this.r = r;
    this.nu = Math.ceil(cfg.tilesU * r) + 1;
    this.nv = Math.ceil(cfg.tilesV * r) + 1;
    this.datos = new Uint8Array(this.nu * this.nv);
    const paso = 0.5;
    const pasos = Math.ceil(cfg.alcanceSombra / paso);
    const techo = cfg.alturaMax + 0.1;
    for (let j = 0; j < this.nv; j++) {
      for (let i = 0; i < this.nu; i++) {
        const u = i / r;
        const v = j / r;
        const h = sup.suelo(u, v);
        const agua = sup.agua(u, v);
        if (!Number.isNaN(agua) && agua > h) continue;          // el agua no se sombrea
        for (let k = 1; k <= pasos; k++) {
          const d = k * paso;
          const alturaRayo = h + d * SOL_TAN;
          if (alturaRayo > techo) break;
          const pu = u + SOL_U * d;
          const pv = v + SOL_V * d;
          if (pu < 0 || pv < 0 || pu > cfg.tilesU || pv > cfg.tilesV) break;
          if (sup.suelo(pu, pv) > alturaRayo) { this.datos[j * this.nu + i] = 1; break; }
        }
      }
    }
  }

  /** `true` si el punto está a la sombra de una cumbre (vecino más cercano de la rejilla). */
  enSombra(u: number, v: number): boolean {
    const i = Math.min(this.nu - 1, Math.max(0, Math.round(u * this.r)));
    const j = Math.min(this.nv - 1, Math.max(0, Math.round(v * this.r)));
    return this.datos[j * this.nu + i] === 1;
  }
}

function muestrear(sup: Superficie, cfg: ConfigHorneado, sombras: Sombras | null, u: number, v: number): Muestra {
  const h = sup.suelo(u, v);
  const agua = sup.agua(u, v);
  if (!Number.isNaN(agua) && agua > h) {
    // Agua: más clara cerca de la orilla, más oscura con la profundidad; espuma en la orilla.
    const prof = agua - h;
    const tono = prof < 0.07 ? 6 : 5.2 - Math.min(5.2, prof * 3.4);
    return { altura: agua, clase: 'agua', tono, agua: agua <= cfg.nivelMar + 0.04 ? 1 : 2 };
  }
  const e = 0.35;
  const gu = (sup.suelo(u + e, v) - sup.suelo(u - e, v)) / (2 * e);
  const gv = (sup.suelo(u, v + e) - sup.suelo(u, v - e)) / (2 * e);
  const norma = Math.hypot(gu, gv, 1);
  const sombra = (-gu * LUZ[0] - gv * LUZ[1] + LUZ[2]) / norma - LUZ_PLANO;   // 0 en el llano, + hacia la luz
  const pendiente = Math.hypot(gu, gv);
  const sobreMar = h - cfg.nivelMar;
  const ruido = fbm(cfg.semilla, u * 0.35, v * 0.35, 3) - 0.5;
  const taparSol = sobreMar > 0.3 && sombras !== null && sombras.enSombra(u, v);

  if (sobreMar > 0.6) {
    // Curvatura: las crestas (convexas) se aclaran y los barrancos (cóncavos) se oscurecen, con borde nítido.
    const e2 = 0.7;
    const lap = (sup.suelo(u + e2, v) + sup.suelo(u - e2, v) + sup.suelo(u, v + e2) + sup.suelo(u, v - e2) - 4 * h) / (e2 * e2);
    const cresta = limitar(-lap * 0.3, -1, 1);
    // Montaña: nieve en las cumbres suaves (cota perturbada por ruido, borde nítido), roca en las laderas y caras
    // de acantilado donde la pendiente es alta. Bandas duras de 1 a 3 tonos para que se lea como pixel art.
    const cota = sobreMar + ruido * 0.9;
    if (cota > cfg.alturaCumbre && pendiente < cfg.pendienteRoca * 1.4) {
      return { altura: h, clase: 'piedra', tono: 4.6 + banda(sombra) * 0.9 + cresta * 0.7 - (taparSol ? 1.6 : 0), duro: true };
    }
    if (pendiente > cfg.pendienteRoca || cota > cfg.alturaCumbre * 0.8) {
      return { altura: h, clase: 'roca', tono: 2.2 + banda(sombra) * 0.55 + cresta * 0.6 - (taparSol ? 0.9 : 0), duro: true };
    }
  } else if (pendiente > cfg.pendienteRoca) {
    return { altura: h, clase: 'roca', tono: 2.2 + banda(sombra) * 0.55 - (taparSol ? 0.9 : 0), duro: true };
  }

  const orilla = tipoDeOrilla(sup, cfg, u, v);
  if (orilla === 'arena') return { altura: h, clase: 'tierra', tono: 4.1 + sombra * 4 + ruido * 0.5 };
  if (orilla === 'ribera') return { altura: h, clase: 'hierba', tono: 1.8 + sombra * 4 };   // hierba húmeda, más oscura
  // Llano y monte bajo: el tono sale de la fertilidad (seco → claro y amarillento, lozano → oscuro) y de una
  // variación suave a gran escala, con pocos niveles; el tramado solo suaviza la frontera entre ellos.
  const fert = sup.fertilidad ? sup.fertilidad(u, v) : 0.5;
  const suave = fbm(cfg.semilla + 3, u * 0.05, v * 0.05, 2) - 0.5;
  const altitud = Math.min(1, sobreMar / (cfg.alturaCumbre * 0.8)) * 1.4;   // monte bajo: hierba más oscura
  const tono = 3.2 - (fert - 0.5) * 2.6 + suave * 1.2 - altitud + sombra * 3.5 - (taparSol ? 1.3 : 0);
  return { altura: h, clase: 'hierba', tono };
}

/** Tamaño de la imagen horneada y de dónde cuelga en el mundo. */
export function dimensionesImagen(cfg: ConfigHorneado): Omit<ImagenIndices, 'datos'> {
  const filasAltura = Math.ceil(cfg.alturaMax * cfg.pxPorAltura) + 2;
  return {
    ancho: (cfg.tilesU + cfg.tilesV) * (cfg.tileAncho / 2),
    alto: (cfg.tilesU + cfg.tilesV) * (cfg.tileAlto / 2) + filasAltura + 2,
    origenX: -cfg.tilesV * (cfg.tileAncho / 2),
    origenY: -filasAltura,
  };
}

/** Hornea el terreno entero en una imagen de índices de paleta. */
export function hornear(sup: Superficie, cfg: ConfigHorneado): ImagenIndices {
  const dim = dimensionesImagen(cfg);
  const datos = new Uint8Array(dim.ancho * dim.alto).fill(VACIO);
  const clases = new Uint8Array(dim.ancho * dim.alto).fill(VACIO);
  const agua = new Uint8Array(dim.ancho * dim.alto);
  const sombras = cfg.resolucionSombra > 0 ? new Sombras(sup, cfg) : null;
  const medioAncho = cfg.tileAncho / 2;
  const medioAlto = cfg.tileAlto / 2;
  const ds = 1 / (medioAlto * cfg.muestrasPorPixel);   // paso en s=u+v: ~1/muestrasPorPixel píxel en pantalla
  for (let i = 0; i < dim.ancho; i++) {
    const d = (dim.origenX + i + 0.5) / medioAncho;     // u − v constante en toda la columna
    const sMin = Math.abs(d);
    const sMax = Math.min(2 * cfg.tilesU - d, 2 * cfg.tilesV + d);
    if (sMin >= sMax) continue;
    let ymin = -1;
    for (let s = sMax; s >= sMin; s -= ds) {
      const u = (s + d) / 2;
      const v = (s - d) / 2;
      const m = muestrear(sup, cfg, sombras, u, v);
      const y = Math.floor(s * medioAlto - m.altura * cfg.pxPorAltura - dim.origenY);
      if (ymin < 0) ymin = Math.min(dim.alto, y + 1);
      if (y >= ymin) continue;
      const duro = m.duro === true;
      const lo = TONO_MIN[m.clase];
      const hi = TONO_MAX[m.clase];
      const clase = CLASE[m.clase];
      const marca = m.agua ?? 0;
      for (let j = Math.max(0, y); j < ymin; j++) {
        const t = duro ? Math.round(m.tono) : cuantizar(m.tono, i, j);
        const p = j * dim.ancho + i;
        datos[p] = tonoDe(m.clase, limitar(t, lo, hi));
        clases[p] = clase;
        agua[p] = marca;
      }
      ymin = Math.max(0, y);
      if (ymin === 0) break;
    }
  }
  if (cfg.minRegion > 1) limpiarRegiones(datos, clases, dim.ancho, dim.alto, cfg.minRegion);
  return { ...dim, datos, agua };
}

/**
 * Limpieza morfológica: toda región conexa (4 vecinos) de un mismo material con menos de `minimo` píxeles se funde
 * con el material que más la rodea, copiando el índice de paleta del vecino que más la toca. Quita islotes y motas
 * sueltas; el agua no se toca.
 */
export function limpiarRegiones(datos: Uint8Array, clases: Uint8Array, ancho: number, alto: number, minimo: number): void {
  const n = ancho * alto;
  const visto = new Uint8Array(n);
  const cola = new Int32Array(n);
  const porClase = new Map<number, { n: number; idx: number }>();
  for (let inicio = 0; inicio < n; inicio++) {
    const clase = clases[inicio];
    if (visto[inicio] || clase === VACIO) continue;
    let cabeza = 0;
    let fin = 0;
    cola[fin++] = inicio;
    visto[inicio] = 1;
    while (cabeza < fin) {
      const p = cola[cabeza++];
      const x = p % ancho;
      const y = (p - x) / ancho;
      if (x > 0 && !visto[p - 1] && clases[p - 1] === clase) { visto[p - 1] = 1; cola[fin++] = p - 1; }
      if (x < ancho - 1 && !visto[p + 1] && clases[p + 1] === clase) { visto[p + 1] = 1; cola[fin++] = p + 1; }
      if (y > 0 && !visto[p - ancho] && clases[p - ancho] === clase) { visto[p - ancho] = 1; cola[fin++] = p - ancho; }
      if (y < alto - 1 && !visto[p + ancho] && clases[p + ancho] === clase) { visto[p + ancho] = 1; cola[fin++] = p + ancho; }
    }
    if (fin >= minimo || clase === CLASE.agua) continue;
    // Votos de los píxeles que rodean la región, agrupados por material (el índice se toma del último vecino visto).
    porClase.clear();
    for (let k = 0; k < fin; k++) {
      const p = cola[k];
      const x = p % ancho;
      const y = (p - x) / ancho;
      const vecinos = [x > 0 ? p - 1 : -1, x < ancho - 1 ? p + 1 : -1, y > 0 ? p - ancho : -1, y < alto - 1 ? p + ancho : -1];
      for (const q of vecinos) {
        if (q < 0 || clases[q] === clase || clases[q] === VACIO) continue;
        const previo = porClase.get(clases[q]);
        if (previo) { previo.n++; previo.idx = datos[q]; } else porClase.set(clases[q], { n: 1, idx: datos[q] });
      }
    }
    let mejor: { n: number; idx: number } | null = null;
    let claseMejor: number = clase;
    for (const [c, v] of porClase) if (!mejor || v.n > mejor.n) { mejor = v; claseMejor = c; }
    if (!mejor) continue;
    for (let k = 0; k < fin; k++) {
      datos[cola[k]] = mejor.idx;
      clases[cola[k]] = claseMejor;
    }
  }
}

export interface Trozo { x: number; y: number; ancho: number; alto: number }

/** Parte la imagen en trozos de `lado` px (los del borde, más pequeños). */
export function trocear(ancho: number, alto: number, lado: number): Trozo[] {
  const trozos: Trozo[] = [];
  for (let y = 0; y < alto; y += lado) {
    for (let x = 0; x < ancho; x += lado) {
      trozos.push({ x, y, ancho: Math.min(lado, ancho - x), alto: Math.min(lado, alto - y) });
    }
  }
  return trozos;
}

/** Rampa (por nombre) a la que pertenece un índice de paleta, o undefined. Útil para tests y depuración. */
export function rampaDe(indice: number): string | undefined {
  return Object.keys(RAMPAS).find((n) => RAMPAS[n].includes(indice));
}
