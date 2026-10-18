// Lógica pura: sin imports del motor. Se testea con Vitest y se porta tal cual
// a otro motor (Godot, Unity) si el juego escala.

export interface Puntuacion {
  puntos: number;
  racha: number;
}

export interface ReglasPuntuacion {
  valorBase: number;
  bonusPorRacha: number;
  rachaMaxima: number;
}

export const puntuacionInicial = (): Puntuacion => ({ puntos: 0, racha: 0 });

/** Suma una recogida: cada recogida seguida aumenta el bonus hasta `rachaMaxima`. */
export function recoger(p: Puntuacion, reglas: ReglasPuntuacion): Puntuacion {
  const racha = Math.min(p.racha + 1, reglas.rachaMaxima);
  return { puntos: p.puntos + reglas.valorBase + (racha - 1) * reglas.bonusPorRacha, racha };
}

export const romperRacha = (p: Puntuacion): Puntuacion => ({ ...p, racha: 0 });
