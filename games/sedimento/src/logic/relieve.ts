// Relieve fino de cordillera: crestas y barrancos que el campo de alturas (suave, nacido de hexágonos) no tiene.
// Se precalcula UNA vez en una rejilla fina y se suma al suelo solo en altura; así la montaña deja de ser una masa lisa.
// Lógica pura. Los sprites (árboles, edificios) leen la misma superficie, así que quedan apoyados en lo que se ve.
import { fbm } from './ruido';
import type { Superficie } from './horneado';

export interface ConfigRelieve {
  /** Altura sobre el nivel del mar desde la que empieza a haber cordillera, y cuánto tarda en llegar al máximo. */
  desde: number;
  rango: number;
  /** Altura máxima (unidades de mundo) de las crestas. */
  amplitud: number;
  /** Frecuencia del ruido (1/tiles): más alta = más crestas. */
  escala: number;
  octavas: number;
  /** Muestras por tile de la rejilla precalculada. */
  resolucion: number;
  /** Afilado de las crestas (>1 las estrecha). */
  filo: number;
}

const suave = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Envuelve una superficie añadiéndole crestas y barrancos en las zonas altas. */
export function conRelieve(
  base: Superficie, tilesU: number, tilesV: number, nivelMar: number, semilla: number, cfg: ConfigRelieve,
): Superficie {
  const r = cfg.resolucion;
  const nu = Math.ceil(tilesU * r) + 2;
  const nv = Math.ceil(tilesV * r) + 2;
  const detalle = new Float32Array(nu * nv);
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const u = i / r;
      const v = j / r;
      const mascara = suave(cfg.desde, cfg.desde + cfg.rango, base.suelo(u, v) - nivelMar);
      if (mascara === 0) continue;
      // Crestas: 1 − |2n − 1| vale 1 sobre las curvas donde el ruido cruza 0,5 y baja a ambos lados.
      const n = fbm(semilla + 7, u * cfg.escala, v * cfg.escala, cfg.octavas);
      const cresta = Math.pow(1 - Math.abs(2 * n - 1), cfg.filo);
      detalle[j * nu + i] = mascara * cfg.amplitud * (cresta - 0.45);
    }
  }
  const lee = (u: number, v: number): number => {
    const x = Math.min(nu - 2, Math.max(0, u * r));
    const y = Math.min(nv - 2, Math.max(0, v * r));
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const a = detalle[j * nu + i];
    const b = detalle[j * nu + i + 1];
    const c = detalle[(j + 1) * nu + i];
    const d = detalle[(j + 1) * nu + i + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return {
    suelo: (u, v) => base.suelo(u, v) + lee(u, v),
    agua: base.agua,
  };
}
