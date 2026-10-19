import * as THREE from 'three';
import { crearCampoAlturas, type CampoAlturas, type ConfigAlturas } from '../logic/alturas';
import type { Mapa } from '../logic/mapa';
import { crearAgua } from './agua';
import { crearDecorado } from './decorado';
import type { ConfigRender } from './config';
import { crearDisposicion, type Disposicion } from './disposicion';
import { Paleta } from './paleta';
import { crearTerrenoContinuo } from './terrenoContinuo';
import { crearVegetacion, type SueloEn } from './vegetacion';

export interface Mundo {
  readonly raiz: THREE.Group;
  /** Caja que contiene todo el mapa: la cámara encuadra con ella. */
  readonly caja: THREE.Box3;
  readonly ejemplaresVegetacion: number;
  readonly verticesTerreno: number;
  /** Relieve continuo (R20): altura del suelo y del agua en cualquier punto. */
  readonly campo: CampoAlturas;
  /** Altura del suelo en un punto: para apoyar edificios y personas. */
  readonly sueloEn: SueloEn;
  /** Posición de cada celda de datos en el mundo (invisible): la usan la selección y, por ahora, edificios. */
  readonly disposicion: Disposicion;
  actualizar(dt: number): void;
  liberar(): void;
}

/** Compone el mapa 3D: terreno continuo, agua, vegetación y decorado. No toca la lógica del juego, solo la lee. */
export function crearMundo(mapa: Mapa, cfg: ConfigRender, cfgAlturas: Omit<ConfigAlturas, 'tamanoHex'>): Mundo {
  const campo = crearCampoAlturas(mapa, { ...cfgAlturas, tamanoHex: cfg.tamanoHex });
  const disp = crearDisposicion(mapa, cfg, campo);
  const paleta = new Paleta(cfg);
  const terreno = crearTerrenoContinuo(mapa, campo, cfg.terreno, cfg.tamanoHex, paleta);
  const agua = crearAgua(mapa, disp, cfg, paleta, campo);
  const sueloEn: SueloEn = (_hex, x, z) => campo.alturaEn(x, z);
  const vegetacion = crearVegetacion(mapa, disp, cfg, paleta, sueloEn, campo.aguaEn);
  // Modelos CC0 que cargan en segundo plano: aparecen cuando llegan, sin retrasar el primer frame.
  const decorado = crearDecorado(mapa, disp, cfg, sueloEn, agua.charcas, campo.aguaEn);

  const raiz = new THREE.Group();
  raiz.add(terreno.malla, agua.raiz, vegetacion.raiz, decorado.raiz);

  return {
    raiz,
    caja: disp.caja,
    ejemplaresVegetacion: vegetacion.total,
    verticesTerreno: terreno.vertices,
    campo,
    sueloEn,
    disposicion: disp,
    actualizar: (dt) => {
      agua.actualizar(dt);
      decorado.actualizar(dt);
    },
    liberar() {
      terreno.liberar();
      agua.liberar();
      vegetacion.liberar();
      decorado.liberar();
    },
  };
}
