import * as THREE from 'three';
import { axialAMundo, Rejilla } from '../logic/hex';
import { esAgua, type Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';

/** Dónde está cada hexágono en el mundo 3D y a qué altura queda su cara superior. */
export interface Disposicion {
  readonly rejilla: Rejilla;
  readonly x: Float32Array;
  readonly z: Float32Array;
  /** Cota de la cara superior del prisma: la tierra, o el lecho bajo el agua. */
  readonly cima: Float32Array;
  /** Altura efectiva para elegir con el ratón: la cima más una parte del relieve (picos y colinas). */
  readonly alturaSeleccion: Float32Array;
  /** 0 en el borde del mapa y 1 en el interior: la tierra de la orilla del mapa baja hasta una playa. */
  readonly interior: Float32Array;
  /** Cota de la superficie del agua; NaN donde no hay agua. */
  readonly aguaY: Float32Array;
  /** Saltos hasta la tierra más cercana (solo se usa en el mar, para el degradado de profundidad). */
  readonly distCosta: number[];
  /** Caja que contiene todo el mapa, picos incluidos: la cámara encuadra con ella. */
  readonly caja: THREE.Box3;
}


/** Altura típica (a escala 1) de un árbol: solo sirve para que el encuadre de cámara no deje fuera las copas. */
const ALTURA_BASE_VEGETACION = 0.8;
/** Qué parte de la altura de un pico o colina cuenta como "tocable" con el ratón (el cono es más fino arriba). */
const FRACCION_RELIEVE_SELECCIONABLE = 0.6;

const suavizar = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function crearDisposicion(mapa: Mapa, cfg: ConfigRender): Disposicion {
  const rejilla = new Rejilla(mapa.columnas, mapa.filas);
  const n = rejilla.total;
  const x = new Float32Array(n);
  const z = new Float32Array(n);
  const cima = new Float32Array(n);
  const alturaSeleccion = new Float32Array(n);
  const interior = new Float32Array(n).fill(1);
  const aguaY = new Float32Array(n).fill(NaN);
  const caja = new THREE.Box3();
  const R = cfg.tamanoHex;
  const alto = cfg.alturaNivel;

  for (let i = 0; i < n; i++) {
    const { q, r } = rejilla.axial(i);
    const p = axialAMundo(q, r, R);
    x[i] = p.x;
    z[i] = p.z;
    if (esAgua(mapa.terreno[i])) {
      // El agua queda por debajo de la orilla más baja: así el río y el mar se leen como hundidos.
      aguaY[i] = (mapa.nivel[i] + 1 - cfg.rebajeAgua) * alto;
      cima[i] = Math.max(0.02, aguaY[i] - cfg.profundidadLecho * alto);
    } else {
      cima[i] = (mapa.nivel[i] + 1) * alto;
      // El mapa acaba en una playa que se hunde en el mar, no en una pared recta.
      const dBorde = Math.min(rejilla.col(i), mapa.columnas - 1 - rejilla.col(i), rejilla.fila(i), mapa.filas - 1 - rejilla.fila(i));
      interior[i] = suavizar(dBorde / cfg.borde.hexagonos);
      const playa = (1 - cfg.rebajeAgua) * alto + cfg.borde.alzaPlaya;
      if (cima[i] > playa) cima[i] = playa + (cima[i] - playa) * interior[i];
    }
    const relieve = mapa.terreno[i] === 'montana' ? cfg.relieve.alturaPico : mapa.terreno[i] === 'colina' ? cfg.relieve.alturaColina : 0;
    const arbol = mapa.vegetacion[i] === 'ninguna' ? 0 : ALTURA_BASE_VEGETACION * cfg.vegetacion.escalaMax;
    alturaSeleccion[i] = cima[i] + relieve * FRACCION_RELIEVE_SELECCIONABLE;
    const techo = cima[i] + Math.max(relieve, arbol);
    caja.expandByPoint(new THREE.Vector3(p.x - R, 0, p.z - R));
    caja.expandByPoint(new THREE.Vector3(p.x + R, techo, p.z + R));
  }

  const tierra: number[] = [];
  for (let i = 0; i < n; i++) if (mapa.terreno[i] !== 'mar') tierra.push(i);
  const distCosta = rejilla.distanciasDesde(tierra);

  return { rejilla, x, z, cima, alturaSeleccion, interior, aguaY, distCosta, caja };
}
