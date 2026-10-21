// Agua animada (R65, R87, D037): el mar como `pixel-cimientos` (espuma que respira, olas que llegan y destellos
// que saltan) y el río como la muestra (hebras a lo largo de la corriente). 4 fotogramas en bucle.
// Lógica pura y determinista: parte de la máscara de agua que deja el horneado y reescribe SOLO los píxeles de agua.
// El motor no calcula nada por píxel en el bucle: los 4 fotogramas se hornean una vez (R56, §13).
import { fbm, ruidoValor } from './ruido';
import { AGUA_DULCE, AGUA_MAR, VACIO, type ImagenIndices } from './horneado';
import { tonoDe } from '../data/paleta';

/** Fotogramas del bucle del agua. */
export const N_FASES_AGUA = 4;

/** Tramado ordenado 4×4: los bordes duros se deshilachan sin salirse de la paleta. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const tramado = (x: number, y: number): number => BAYER[(y & 3) * 4 + (x & 3)];
const frac = (x: number): number => x - Math.floor(x);

/**
 * Distancia en píxeles de cada píxel de agua a la tierra (0 en la tierra), por BFS de 4 vecinos.
 * Es lo que mueve la espuma y las olas: el agua se anima según lo cerca que esté de la orilla.
 */
export function campoOrilla(agua: Uint8Array, ancho: number, alto: number): Uint8Array {
  const d = new Uint8Array(ancho * alto);
  const cola = new Int32Array(ancho * alto);
  let cabeza = 0;
  let fin = 0;
  for (let p = 0; p < d.length; p++) {
    if (agua[p] !== 0) { d[p] = 255; continue; }
    d[p] = 0;
    cola[fin++] = p;
  }
  while (cabeza < fin) {
    const p = cola[cabeza++];
    const x = p % ancho;
    const y = (p - x) / ancho;
    const siguiente = d[p] + 1;
    if (siguiente > 255) continue;
    if (x > 0 && d[p - 1] > siguiente) { d[p - 1] = siguiente; cola[fin++] = p - 1; }
    if (x < ancho - 1 && d[p + 1] > siguiente) { d[p + 1] = siguiente; cola[fin++] = p + 1; }
    if (y > 0 && d[p - ancho] > siguiente) { d[p - ancho] = siguiente; cola[fin++] = p - ancho; }
    if (y < alto - 1 && d[p + ancho] > siguiente) { d[p + ancho] = siguiente; cola[fin++] = p + ancho; }
  }
  return d;
}

/** Datos que la animación necesita de la imagen horneada. */
export interface MapaAgua {
  ancho: number;
  alto: number;
  /** 0 tierra, 1 mar, 2 dulce (río o lago). */
  agua: Uint8Array;
  /** Distancia a la orilla en píxeles (de `campoOrilla`); 255 = agua sin tierra alrededor (alta mar). */
  orilla: Uint8Array;
  /** Posición de cada píxel de agua, en orden de barrido: la animación solo recorre esto, no la imagen entera. */
  indices: Int32Array;
}

export function mapaAguaDe(img: ImagenIndices): MapaAgua | null {
  if (!img.agua) return null;
  const agua = img.agua;
  let n = 0;
  for (let p = 0; p < agua.length; p++) if (agua[p] !== 0) n++;
  const indices = new Int32Array(n);
  let k = 0;
  for (let p = 0; p < agua.length; p++) if (agua[p] !== 0) indices[k++] = p;
  return { ancho: img.ancho, alto: img.alto, agua, orilla: campoOrilla(agua, img.ancho, img.alto), indices };
}

/** Fase normalizada de un fotograma (0..1). */
export function faseDe(frame: number, n: number = N_FASES_AGUA): number {
  return (((frame % n) + n) % n) / n;
}

/**
 * Tono de agua del píxel `p` en el fotograma `frame`, o −1 si ese píxel no es agua.
 * `base` es la imagen horneada: su tono en el agua ya trae la profundidad (claro en la orilla, oscuro al fondo),
 * así que aquí solo se añaden las cosas que se mueven: espuma, olas, hebras y destellos.
 */
export function tonoAgua(
  base: Uint8Array, mapa: MapaAgua, semilla: number, frame: number, x: number, y: number,
): number {
  const { ancho, alto, agua, orilla } = mapa;
  if (x < 0 || y < 0 || x >= ancho || y >= alto) return -1;
  const p = y * ancho + x;
  const marca = agua[p];
  if (marca === 0 || base[p] === VACIO) return -1;
  const f = faseDe(frame);
  const d = orilla[p];

  if (marca === AGUA_DULCE) {
    // Río y lago: la corriente se lee como hebras que viajan a lo largo del cauce, y hay espuma en las orillas.
    // La dirección de la corriente es perpendicular al gradiente de la distancia a la orilla.
    const gx = orilla[y * ancho + Math.min(ancho - 1, x + 1)] - orilla[y * ancho + Math.max(0, x - 1)];
    const gy = orilla[Math.min(alto - 1, y + 1) * ancho + x] - orilla[Math.max(0, y - 1) * ancho + x];
    const largo = Math.hypot(gx, gy) || 1;
    const fu = -gy / largo;
    const fv = gx / largo;
    if (d <= 1.3) return tonoDe('agua', 6);                       // espuma en las orillas del cauce
    const s = (x * fu + y * fv) / 7 - f * 2.2 + ruidoValor(semilla + 1, Math.floor((x * fu + y * fv) / 11), 0) * 0.6;
    if (frac(s) < 0.34) return tonoDe('agua', Math.min(6, base[p] + 2));
    return base[p];
  }

  // Mar. Espuma que respira en la orilla: el ancho de la franja blanca sube y baja con el fotograma.
  const borde = 1.4 + 1.5 * (0.5 + 0.5 * Math.sin((x * 0.5 + y) * 0.2 - f * Math.PI * 2));
  if (d <= borde) return tonoDe('agua', 6);
  // Olas que llegan a la costa: bandas que viajan hacia tierra y se deshacen al acercarse.
  if (d < 46) {
    const ola = frac(d * 0.055 - f * 0.25 + fbm(semilla + 2, x / 90, y / 90, 2) * 0.6);
    if (ola < 0.06 && tramado(x, y) < 0.85 - d * 0.015) return tonoDe('agua', d < 6 ? 6 : 5);
  }
  // Destellos de sol: pocos, y cambian a saltos de fotograma en fotograma (como en los clásicos).
  const chispa = ruidoValor(semilla + 3, x >> 1, y + Math.floor(f * 4) * 4096);
  if (chispa < 0.004) return tonoDe('agua', 6);
  if (chispa < 0.009 && d > 8) return tonoDe('agua', Math.min(6, base[p] + 2));
  return base[p];
}

/**
 * Rellena `destino` con el fotograma `frame`: copia la imagen horneada y reescribe solo los píxeles de agua.
 * Recorre únicamente la lista de píxeles de agua (una pasada lineal, sin asignar nada).
 */
export function pintarAgua(
  destino: Uint8Array, base: Uint8Array, mapa: MapaAgua, semilla: number, frame: number,
): Uint8Array {
  destino.set(base);
  const { ancho, indices } = mapa;
  for (let k = 0; k < indices.length; k++) {
    const p = indices[k];
    const x = p % ancho;
    const y = (p - x) / ancho;
    const t = tonoAgua(base, mapa, semilla, frame, x, y);
    if (t >= 0) destino[p] = t;
  }
  return destino;
}

/** Cuántos píxeles de agua cambian entre dos fotogramas (para los tests y para depurar). */
export function diferencias(a: Uint8Array, b: Uint8Array, mapa: MapaAgua): number {
  let n = 0;
  for (let k = 0; k < mapa.indices.length; k++) {
    const p = mapa.indices[k];
    if (a[p] !== b[p]) n++;
  }
  return n;
}

export { AGUA_DULCE, AGUA_MAR };
