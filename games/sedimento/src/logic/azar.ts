// Azar determinista: misma semilla → misma secuencia en cualquier máquina.
// Nunca uses Math.random() en la lógica: rompe la reproducibilidad de partidas y tests.

export type Rng = () => number;

/** Generador mulberry32: rápido, 32 bits de estado, suficiente para juego. Devuelve [0, 1). */
export function crearRng(semilla: number): Rng {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash FNV-1a de 32 bits de un texto. */
export function hashTexto(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Semilla independiente para cada sistema: así, añadir un sistema que consume azar
 * no cambia la secuencia de los demás.
 */
export function derivarSemilla(semilla: number, etiqueta: string): number {
  return hashTexto(`${semilla >>> 0}:${etiqueta}`);
}

export function enteroEntre(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
