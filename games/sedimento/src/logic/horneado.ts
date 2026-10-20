// Horneado del terreno (R59): convierte una superficie (altura del suelo y del agua en (u,v), en tiles) en una imagen
// isométrica de índices de paleta. Se hace UNA vez al cargar; el juego solo dibuja los trozos visibles.
// Método: «voxel space» por columnas. Cada columna de pantalla recorre el terreno de lo más cercano a lo más lejano
// y pinta solo lo que asoma por encima de lo ya pintado, así que laderas, acantilados y costa salen del relieve.
// Lógica pura y determinista: sin Phaser ni DOM.
import { fbm } from './ruido';
import { tonoDe } from '../data/paleta';

/** Lo que hace falta saber del mundo para hornearlo. Las coordenadas están en tiles de la rejilla. */
export interface Superficie {
  /** Altura del suelo (unidades de mundo; 1 unidad = 1 tile de ancho). Puede ser negativa bajo el mar. */
  suelo(u: number, v: number): number;
  /** Cota de la lámina de agua, o NaN donde no hay agua. */
  agua(u: number, v: number): number;
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
}

export interface ImagenIndices {
  ancho: number;
  alto: number;
  /** Esquina superior izquierda de la imagen en píxeles de mundo (zoom 1). */
  origenX: number;
  origenY: number;
  /** Índice de paleta por píxel; `VACIO` = transparente (fuera del mapa). */
  datos: Uint8Array;
}

export const VACIO = 255;

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

interface Muestra {
  /** Altura de la superficie visible (suelo o agua). */
  altura: number;
  rampa: string;
  tono: number;
  /** Sombreado en bandas duras, sin tramado: roca y nieve (con tramado se lee como difuminado). */
  duro?: boolean;
}

/** Sombra continua → nivel entero (−2..2): las caras del relieve se pintan en bandas, como pixel art dibujado a mano. */
function banda(sombra: number): number {
  return Math.max(-2, Math.min(2, Math.round(sombra * 7)));
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

function colorEn(sup: Superficie, cfg: ConfigHorneado, u: number, v: number): Muestra {
  const h = sup.suelo(u, v);
  const agua = sup.agua(u, v);
  if (!Number.isNaN(agua) && agua > h) {
    // Agua: más clara cerca de la orilla, más oscura con la profundidad; espuma en la orilla.
    const prof = agua - h;
    const tono = prof < 0.07 ? 6 : 5.2 - Math.min(5.2, prof * 3.4);
    return { altura: agua, rampa: 'agua', tono };
  }
  const e = 0.35;
  const gu = (sup.suelo(u + e, v) - sup.suelo(u - e, v)) / (2 * e);
  const gv = (sup.suelo(u, v + e) - sup.suelo(u, v - e)) / (2 * e);
  const norma = Math.hypot(gu, gv, 1);
  const sombra = (-gu * LUZ[0] - gv * LUZ[1] + LUZ[2]) / norma - LUZ_PLANO;   // 0 en el llano, + hacia la luz
  const pendiente = Math.hypot(gu, gv);
  const sobreMar = h - cfg.nivelMar;
  const ruido = fbm(cfg.semilla, u * 0.35, v * 0.35, 3) - 0.5;
  // Montaña: nieve en las cumbres suaves (borde nítido, con la cota perturbada por el ruido) y roca estratificada
  // en las laderas. Todo en bandas duras de 1 a 3 tonos para que se lea como pixel art y no como un degradado.
  const cota = sobreMar + ruido * 0.9;
  if (cota > cfg.alturaCumbre && pendiente < cfg.pendienteRoca * 1.6) {
    return { altura: h, rampa: 'piedra', tono: 4.2 + banda(sombra) * 0.8, duro: true };
  }
  if (pendiente > cfg.pendienteRoca || cota > cfg.alturaCumbre * 0.8) {
    // Roca en los tres tonos medios de la rampa: el más oscuro es casi tinta y dibuja «rayas negras».
    return { altura: h, rampa: 'roca', tono: 2.1 + banda(sombra) * 0.5, duro: true };
  }
  const orilla = tipoDeOrilla(sup, cfg, u, v);
  if (orilla === 'arena') return { altura: h, rampa: 'tierra', tono: 4.1 + sombra * 4 + ruido * 0.9 };
  if (orilla === 'ribera') return { altura: h, rampa: 'hierba', tono: 2 + sombra * 4.5 + ruido * 1.2 };   // hierba húmeda, más oscura
  if (sobreMar > cfg.alturaCumbre * 0.5) {
    return { altura: h, rampa: 'hierba', tono: 1.9 + sombra * 4.5 + ruido * 1.2 };   // monte bajo: hierba oscura
  }
  return { altura: h, rampa: 'hierba', tono: 2.7 + sombra * 4.5 + ruido * 1.5 };
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
      const m = colorEn(sup, cfg, u, v);
      const y = Math.floor(s * medioAlto - m.altura * cfg.pxPorAltura - dim.origenY);
      if (ymin < 0) ymin = Math.min(dim.alto, y + 1);
      if (y >= ymin) continue;
      const duro = m.duro === true;
      for (let j = Math.max(0, y); j < ymin; j++) datos[j * dim.ancho + i] = tonoDe(m.rampa, duro ? Math.round(m.tono) : cuantizar(m.tono, i, j));
      ymin = Math.max(0, y);
      if (ymin === 0) break;
    }
  }
  return { ...dim, datos };
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
