import * as THREE from 'three';
import type { CampoAlturas } from '../logic/alturas';
import { axialAMundo, Rejilla } from '../logic/hex';
import { esAgua, type Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';

/** Dónde está cada celda de datos (invisible) en el mundo 3D y a qué altura queda el suelo en su centro. */
export interface Disposicion {
  readonly rejilla: Rejilla;
  readonly x: Float32Array;
  readonly z: Float32Array;
  /** Cota del suelo continuo en el centro de la celda (el lecho, si hay agua). */
  readonly cima: Float32Array;
  /** Altura para elegir con el ratón: el suelo, o la lámina si hay agua encima. */
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

const suavizar = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function crearDisposicion(mapa: Mapa, cfg: ConfigRender, campo: CampoAlturas): Disposicion {
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

  for (let i = 0; i < n; i++) {
    const { q, r } = rejilla.axial(i);
    const p = axialAMundo(q, r, R);
    x[i] = p.x;
    z[i] = p.z;
    cima[i] = campo.alturaEn(p.x, p.z);
    const agua = campo.aguaEn(p.x, p.z);
    if (!Number.isNaN(agua)) aguaY[i] = agua;
    if (!esAgua(mapa.terreno[i])) {
      const dBorde = Math.min(rejilla.col(i), mapa.columnas - 1 - rejilla.col(i), rejilla.fila(i), mapa.filas - 1 - rejilla.fila(i));
      interior[i] = suavizar(dBorde / cfg.borde.hexagonos);
    }
    const arbol = mapa.vegetacion[i] === 'ninguna' ? 0 : ALTURA_BASE_VEGETACION * cfg.vegetacion.escalaMax;
    alturaSeleccion[i] = Number.isNaN(agua) ? cima[i] : Math.max(cima[i], agua);
    const techo = cima[i] + arbol;
    caja.expandByPoint(new THREE.Vector3(p.x - R, 0, p.z - R));
    caja.expandByPoint(new THREE.Vector3(p.x + R, techo, p.z + R));
  }

  const tierra: number[] = [];
  for (let i = 0; i < n; i++) if (mapa.terreno[i] !== 'mar') tierra.push(i);
  const distCosta = rejilla.distanciasDesde(tierra);

  return { rejilla, x, z, cima, alturaSeleccion, interior, aguaY, distCosta, caja };
}
