// Tipos del atlas de pixel art (public/recursos/pixel/atlas.json) y su validador.
// El JSON lo escribe `npm run arte` (tools/arte-pixel/exportar.py); aquí solo se describe y se comprueba.
// Lógica pura: sin Phaser ni DOM, para poder portarla.

export type Orientacion = 'se' | 'sw' | 'ne' | 'nw' | 'u' | 'v' | 'unica';
export type LadoPuerta = 'u+' | 'u-' | 'v+' | 'v-';
export type CategoriaPixel =
  | 'ciudadano' | 'criatura' | 'animal' | 'arbol' | 'arbusto' | 'roca'
  | 'prop' | 'estructura' | 'barco' | 'ambiente';

export interface Punto { x: number; y: number }

export interface FramePixel {
  atlas: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Píxel del fotograma que se coloca sobre el suelo: pies, o centro de la huella en estructuras. */
  ancla: Punto;
  /** Puntos con nombre (p. ej. `chimenea`, de donde sale el humo), en píxeles del fotograma. */
  puntos?: Record<string, Punto>;
}

/** Celda de acceso, en tiles relativos a la esquina trasera de la huella (i a lo largo de u, j de v). */
export interface Puerta { i: number; j: number; lado: LadoPuerta }

export interface EstadoPixel {
  /** 0 = imagen fija (una pose o una etapa de obra). */
  fps: number;
  /** Claves de `frames` por orientación; todas las orientaciones de un estado son válidas. */
  orientaciones: Partial<Record<Orientacion, string[]>>;
}

export interface SpritePixel {
  categoria: CategoriaPixel;
  /** Tiles que ocupa en la rejilla (w a lo largo de u, d a lo largo de v). */
  huella: { w: number; d: number };
  /** Si la huella bloquea el paso (R50). */
  bloquea: boolean;
  /** Píxeles desde el ancla hasta lo más alto del dibujo (sirve para sombra y selección). */
  altura: number;
  ancla: Punto;
  /** Qué marca el ancla: los pies (lo puntual) o el centro de la huella (lo que ocupa tiles). */
  anclaEn: 'pies' | 'huella';
  puertas: Puerta[];
  /** Estados que son etapas de obra, en orden. */
  etapas?: string[];
  estados: Record<string, EstadoPixel>;
}

export interface AtlasPixel {
  version: 1;
  origen: string;
  paleta: number;
  tile: { ancho: number; alto: number };
  atlas: { imagen: string; ancho: number; alto: number }[];
  sprites: Record<string, SpritePixel>;
  frames: Record<string, FramePixel>;
}

const CATEGORIAS: readonly string[] = [
  'ciudadano', 'criatura', 'animal', 'arbol', 'arbusto', 'roca', 'prop', 'estructura', 'barco', 'ambiente',
];
const ORIENTACIONES: readonly string[] = ['se', 'sw', 'ne', 'nw', 'u', 'v', 'unica'];
const LADOS: readonly string[] = ['u+', 'u-', 'v+', 'v-'];
export const MAX_LADO_ATLAS = 2048;
export const MAX_COLORES = 64;

type Registro = Record<string, unknown>;

function esRegistro(v: unknown): v is Registro {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function esEntero(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

function esPunto(v: unknown): v is Punto {
  return esRegistro(v) && esEntero(v.x) && esEntero(v.y);
}

/** Devuelve la lista de problemas del atlas (vacía si es válido). */
export function validarAtlas(datos: unknown): string[] {
  const err: string[] = [];
  if (!esRegistro(datos)) return ['el atlas no es un objeto'];
  if (datos.version !== 1) err.push(`version ${String(datos.version)} no soportada`);
  if (!esEntero(datos.paleta) || datos.paleta < 1 || datos.paleta > MAX_COLORES) err.push('paleta fuera de 1..64 colores');
  if (!esRegistro(datos.tile) || datos.tile.ancho !== 32 || datos.tile.alto !== 16) err.push('el tile debe ser 32x16');

  const atlas = Array.isArray(datos.atlas) ? datos.atlas : [];
  if (atlas.length === 0) err.push('no hay imágenes de atlas');
  const dims: { ancho: number; alto: number }[] = [];
  atlas.forEach((a: unknown, n: number) => {
    if (!esRegistro(a) || typeof a.imagen !== 'string' || !esEntero(a.ancho) || !esEntero(a.alto)) {
      err.push(`atlas[${n}] mal formado`);
      dims.push({ ancho: 0, alto: 0 });
      return;
    }
    if (a.ancho > MAX_LADO_ATLAS || a.alto > MAX_LADO_ATLAS) err.push(`atlas[${n}] supera ${MAX_LADO_ATLAS}px`);
    dims.push({ ancho: a.ancho, alto: a.alto });
  });

  const frames = esRegistro(datos.frames) ? datos.frames : {};
  if (!esRegistro(datos.frames)) err.push('falta frames');
  for (const [clave, f] of Object.entries(frames)) {
    if (!esRegistro(f) || !esEntero(f.atlas) || !esEntero(f.x) || !esEntero(f.y) || !esEntero(f.w) || !esEntero(f.h)) {
      err.push(`frame ${clave} mal formado`);
      continue;
    }
    const d = dims[f.atlas];
    if (!d) { err.push(`frame ${clave}: atlas ${f.atlas} no existe`); continue; }
    if (f.w < 1 || f.h < 1 || f.x < 0 || f.y < 0 || f.x + f.w > d.ancho || f.y + f.h > d.alto) {
      err.push(`frame ${clave} fuera del atlas`);
    }
    if (!esPunto(f.ancla)) { err.push(`frame ${clave}: ancla inválida`); continue; }
    if (f.ancla.x < 0 || f.ancla.x > f.w || f.ancla.y < 0 || f.ancla.y > f.h) err.push(`frame ${clave}: ancla fuera del fotograma`);
    if (f.puntos !== undefined) {
      if (!esRegistro(f.puntos)) err.push(`frame ${clave}: puntos inválidos`);
      else for (const [pn, p] of Object.entries(f.puntos)) if (!esPunto(p)) err.push(`frame ${clave}: punto ${pn} inválido`);
    }
  }

  if (!esRegistro(datos.sprites)) { err.push('falta sprites'); return err; }
  for (const [id, s] of Object.entries(datos.sprites)) {
    if (!esRegistro(s)) { err.push(`sprite ${id} mal formado`); continue; }
    if (typeof s.categoria !== 'string' || !CATEGORIAS.includes(s.categoria)) err.push(`${id}: categoría inválida`);
    const h = s.huella;
    const huellaOk = esRegistro(h) && esEntero(h.w) && esEntero(h.d) && h.w >= 1 && h.d >= 1;
    if (!huellaOk) err.push(`${id}: huella inválida`);
    if (typeof s.bloquea !== 'boolean') err.push(`${id}: bloquea debe ser booleano`);
    if (!esEntero(s.altura) || s.altura < 1) err.push(`${id}: altura inválida`);
    if (!esPunto(s.ancla)) err.push(`${id}: ancla inválida`);
    if (s.anclaEn !== 'pies' && s.anclaEn !== 'huella') err.push(`${id}: anclaEn debe ser pies o huella`);

    if (!Array.isArray(s.puertas)) err.push(`${id}: puertas debe ser una lista`);
    else if (huellaOk) {
      const { w, d } = h as { w: number; d: number };
      s.puertas.forEach((p: unknown, n: number) => {
        if (!esRegistro(p) || !esEntero(p.i) || !esEntero(p.j) || typeof p.lado !== 'string' || !LADOS.includes(p.lado)) {
          err.push(`${id}: puerta ${n} mal formada`);
          return;
        }
        // la celda de acceso está fuera de la huella, pegada al lado indicado
        const dentro = (v: number, max: number) => v >= 0 && v < max;
        const bien =
          (p.lado === 'v+' && p.j === d && dentro(p.i, w)) ||
          (p.lado === 'v-' && p.j === -1 && dentro(p.i, w)) ||
          (p.lado === 'u+' && p.i === w && dentro(p.j, d)) ||
          (p.lado === 'u-' && p.i === -1 && dentro(p.j, d));
        if (!bien) err.push(`${id}: puerta ${n} (${p.i},${p.j},${p.lado}) no es una celda de acceso adyacente a la huella ${w}x${d}`);
      });
    }

    const estados = esRegistro(s.estados) ? s.estados : {};
    if (!esRegistro(s.estados) || Object.keys(estados).length === 0) { err.push(`${id}: sin estados`); continue; }
    for (const [en, e] of Object.entries(estados)) {
      if (!esRegistro(e) || !esEntero(e.fps) || e.fps < 0 || !esRegistro(e.orientaciones)) { err.push(`${id}/${en}: estado mal formado`); continue; }
      const oris = Object.entries(e.orientaciones);
      if (oris.length === 0) err.push(`${id}/${en}: sin orientaciones`);
      for (const [on, lista] of oris) {
        if (!ORIENTACIONES.includes(on)) err.push(`${id}/${en}: orientación ${on} desconocida`);
        if (!Array.isArray(lista) || lista.length === 0) { err.push(`${id}/${en}/${on}: sin fotogramas`); continue; }
        for (const k of lista) if (typeof k !== 'string' || !(k in frames)) err.push(`${id}/${en}/${on}: fotograma ${String(k)} no existe`);
        if (e.fps > 0 && lista.length < 2) err.push(`${id}/${en}/${on}: animado (${e.fps} fps) con un solo fotograma`);
      }
    }
    if (s.etapas !== undefined) {
      if (!Array.isArray(s.etapas) || s.etapas.length === 0) err.push(`${id}: etapas inválidas`);
      else for (const et of s.etapas) if (typeof et !== 'string' || !(et in estados)) err.push(`${id}: la etapa ${String(et)} no es un estado`);
    }
  }
  return err;
}

/** Fotogramas de un estado y orientación, o `undefined` si no existen. */
export function fotogramasDe(atlas: AtlasPixel, id: string, estado: string, ori: Orientacion): FramePixel[] | undefined {
  const claves = atlas.sprites[id]?.estados[estado]?.orientaciones[ori];
  if (!claves) return undefined;
  const out: FramePixel[] = [];
  for (const k of claves) {
    const f = atlas.frames[k];
    if (!f) return undefined;
    out.push(f);
  }
  return out;
}
