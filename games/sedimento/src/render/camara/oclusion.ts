import * as THREE from 'three';
import { avanzarOpacidad, edificiosQueTapan, type CuerpoEdificio } from '../../logic/camara';
import type { ConfigRender } from '../config';

/** Lo que la oclusión necesita de los edificios: sus cuerpos y poder cambiar su visibilidad. */
export interface FuenteOclusion {
  readonly cuerpos: readonly CuerpoEdificio[];
  fijarVisibilidad(i: number, valor: number): void;
  aplicarVisibilidad(): void;
}

export interface Oclusion {
  fijarFuente(fuente: FuenteOclusion | null): void;
  /** Atenúa los edificios que tapan el objetivo y restaura los demás, con transición. */
  actualizar(dt: number, camara: THREE.Vector3, objetivo: THREE.Vector3): void;
  /** Edificios que ahora mismo están atenuados (visibilidad por debajo de 1). */
  readonly atenuados: number;
}

const EPSILON_VISIBILIDAD = 0.002;

export function crearOclusion(cfg: ConfigRender): Oclusion {
  const c = cfg.camara.oclusion;
  let fuente: FuenteOclusion | null = null;
  let visibilidad = new Float32Array(0);
  let tapan = new Uint8Array(0);
  let atenuados = 0;

  return {
    get atenuados() {
      return atenuados;
    },
    fijarFuente(f) {
      fuente = f;
    },
    actualizar(dt, camara, objetivo) {
      if (!fuente) return;
      const n = fuente.cuerpos.length;
      // Los edificios se redibujan al construir: sus visibilidades vuelven a 1 y las nuestras también.
      if (visibilidad.length !== n) {
        visibilidad = new Float32Array(n).fill(1);
        tapan = new Uint8Array(n);
      }
      if (c.activa) edificiosQueTapan(camara, objetivo, fuente.cuerpos, c.margen, tapan);
      else tapan.fill(0);
      atenuados = 0;
      let cambio = false;
      for (let i = 0; i < n; i++) {
        const deseada = tapan[i] ? c.opacidadMin : 1;
        const nueva = avanzarOpacidad(visibilidad[i], deseada, c.suavizado, dt);
        // Cerca del destino se clava en él: la trama no debe quedarse «casi opaca» para siempre.
        const final = Math.abs(nueva - deseada) < EPSILON_VISIBILIDAD ? deseada : nueva;
        if (final !== visibilidad[i]) {
          visibilidad[i] = final;
          fuente.fijarVisibilidad(i, final);
          cambio = true;
        }
        if (final < 1) atenuados++;
      }
      if (cambio) fuente.aplicarVisibilidad();
    },
  };
}
