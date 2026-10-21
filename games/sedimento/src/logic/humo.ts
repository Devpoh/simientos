// Humo de chimeneas y hogueras (R87, D037): lógica pura y determinista, sin Phaser.
// Decide QUÉ bocanadas hay, DÓNDE y en QUÉ fotograma; el dibujo lo hace render/humoVista.ts con un pool.
// Cero asignaciones en el bucle: `avanzar` reutiliza el mismo array de partículas y las recicla.
import tuning from '../data/tuning.json';
import { crearRng, derivarSemilla, type Rng } from './azar';
import { aPantalla } from './iso';

/** Una bocanada viva. */
export interface Bocanada {
  /** Píxeles de mundo de la boca de la que sale (el punto `humo` o `chimenea` del fotograma). */
  x: number;
  y: number;
  /** Fotograma actual de la animación (0..nFotogramas−1). */
  fotograma: number;
  /** 0..1: cuánto ha subido; llega a 1 y se recicla. */
  vida: number;
  /** Deriva lateral y velocidad propia, para que no suban todas igual. */
  deriva: number;
  subida: number;
  /** Semilla del foco: fija el desfase y el ritmo de cada chimenea. */
  semilla: number;
  /** Hoguera (bocanada ancha y baja) o chimenea. */
  fuego: boolean;
}

/** Un foco de humo: la boca de una chimenea o de una hoguera. */
export interface FocoHumo {
  x: number;
  y: number;
  fuego?: boolean;
}

export type ConfigHumo = typeof tuning.humo;

/**
 * Crea el array de bocanadas (una por foco, repartidas en el tiempo) sin asignar nada más.
 * El array tiene siempre `focos.length` entradas: cada foco recicla la suya al llegar arriba.
 */
export function crearHumo(focos: readonly FocoHumo[], cfg: ConfigHumo = tuning.humo): Bocanada[] {
  const rng: Rng = crearRng(derivarSemilla(cfg.semilla, 'humo'));
  const out: Bocanada[] = [];
  for (let i = 0; i < focos.length; i++) {
    const f = focos[i];
    const semilla = Math.floor(rng() * 1e9);
    out.push({
      x: f.x, y: f.y, fotograma: 0,
      // Desfase inicial: unas ya están subiendo y otras acaban de salir.
      vida: rng(),
      deriva: (rng() - 0.5) * 2 * cfg.derivaPx,
      subida: cfg.subidaPx * (0.75 + rng() * 0.5),
      semilla, fuego: f.fuego === true,
    });
  }
  return out;
}

/**
 * Avanza el humo `dt` segundos. Reutiliza las bocanadas: al llegar arriba, la misma vuelve a nacer abajo.
 * Devuelve cuántas siguen visibles (todas, salvo que no haya focos).
 */
export function avanzarHumo(bocanadas: Bocanada[], dt: number, cfg: ConfigHumo = tuning.humo): number {
  const n = cfg.fotogramas;
  const seg = Math.max(0, Math.min(0.25, dt));    // delta acotado: un parón no teletransporta el humo
  for (let i = 0; i < bocanadas.length; i++) {
    const b = bocanadas[i];
    const alto = cfg.alturaPx * (b.fuego ? cfg.altoFuego : 1);
    const vel = (b.subida / alto) * (1 / cfg.segundosVida);
    b.vida += vel * seg;
    while (b.vida >= 1) {
      b.vida -= 1;
      // Al renacer, deriva y ritmo nuevos (pero deterministas por semilla + contador implícito).
      b.semilla = (Math.imul(b.semilla, 1103515245) + 12345) >>> 0;
      const r = (b.semilla % 1000) / 1000;
      b.deriva = (r - 0.5) * 2 * cfg.derivaPx;
      b.subida = cfg.subidaPx * (0.75 + r * 0.5);
    }
    b.fotograma = Math.min(n - 1, Math.floor(b.vida * n));
  }
  return bocanadas.length;
}

/** Posición y fotograma de una bocanada ahora mismo (lo que necesita la vista para colocar su sprite). */
export interface PosturaBocanada {
  x: number;
  y: number;
  fotograma: number;
}

/** Rellena `destino` con la postura de cada bocanada; `destino` debe tener el mismo largo (cero asignaciones). */
export function posturas(bocanadas: readonly Bocanada[], destino: PosturaBocanada[], cfg: ConfigHumo = tuning.humo): number {
  for (let i = 0; i < bocanadas.length; i++) {
    const b = bocanadas[i];
    const alto = cfg.alturaPx * (b.fuego ? cfg.altoFuego : 1);
    destino[i].x = b.x + b.deriva * b.vida;
    destino[i].y = b.y - alto * b.vida;
    destino[i].fotograma = b.fotograma;
  }
  return bocanadas.length;
}

/** Bocanada reciclable para el pool de la vista. */
export function crearPostura(): PosturaBocanada {
  return { x: 0, y: 0, fotograma: 0 };
}

/** Lo mínimo que hace falta del atlas para saber de dónde sale el humo. */
export interface AtlasHumo {
  frames: Record<string, { ancla: { x: number; y: number }; puntos?: Record<string, { x: number; y: number }> }>;
  sprites: Record<string, { estados: Record<string, unknown> }>;
}

/** Elemento de la aldea del que puede salir humo. */
export interface ElementoHumo {
  id: string;
  u: number;
  v: number;
  w: number;
  d: number;
  estado?: string;
  ori: string;
}

/**
 * Focos de humo de una aldea, en píxeles de mundo: la boca de la chimenea de cada casa terminada (solo la etapa
 * final tiene punto `chimenea`) y la llama de cada brasero. Determinista y en el mismo orden que la aldea.
 * `elevacion` es la altura del terreno en píxeles, la misma que usa la vista de la aldea.
 */
export function focosDeAldea(
  elementos: readonly ElementoHumo[],
  atlas: AtlasHumo,
  elevacion: (u: number, v: number) => number,
  cfg: ConfigHumo = tuning.humo,
): FocoHumo[] {
  const out: FocoHumo[] = [];
  for (const e of elementos) {
    if (out.length >= cfg.maxFocos) break;
    const f = fotogramaDe(e, atlas);
    if (!f) continue;
    const fuego = f.puntos?.humo;
    const chimenea = f.puntos?.chimenea;
    const p = fuego ?? chimenea;
    if (!p) continue;
    const cu = e.u + e.w / 2;
    const cv = e.v + e.d / 2;
    const p2 = aPantalla(cu, cv);
    out.push({
      x: Math.round(p2.x - f.ancla.x + p.x),
      y: Math.round(p2.y - elevacion(cu, cv) - f.ancla.y + p.y),
      fuego: fuego !== undefined,
    });
  }
  return out;
}

/**
 * Fotograma del atlas que se dibuja para un elemento: mismo criterio que `render/aldeaVista.ts` (estado por
 * defecto = el primero del sprite; orientación con la misma sustitución). `null` si el elemento no se dibuja.
 */
function fotogramaDe(
  e: ElementoHumo, atlas: AtlasHumo,
): { ancla: { x: number; y: number }; puntos?: Record<string, { x: number; y: number }> } | null {
  const sp = atlas.sprites[e.id];
  if (!sp) return null;
  const estado = sp.estados[(e.estado ?? '') || Object.keys(sp.estados)[0]];
  if (!estado) return null;
  const oris = (estado as { orientaciones: Record<string, string[]> }).orientaciones;
  const lista = oris[e.ori] ?? oris.unica ?? oris[Object.keys(oris)[0]] ?? [];
  const c = lista[0];
  return c ? atlas.frames[c] ?? null : null;
}
