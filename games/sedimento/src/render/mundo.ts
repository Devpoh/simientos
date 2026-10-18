import * as THREE from 'three';
import type { Mapa } from '../logic/mapa';
import { crearAgua } from './agua';
import type { ConfigRender } from './config';
import { crearDisposicion } from './disposicion';
import { Paleta } from './paleta';
import { crearRelieve } from './relieve';
import { crearTerreno } from './terreno';
import { crearVegetacion } from './vegetacion';

export interface Mundo {
  readonly raiz: THREE.Group;
  /** Caja que contiene todo el mapa: la cámara encuadra con ella. */
  readonly caja: THREE.Box3;
  readonly ejemplaresVegetacion: number;
  actualizar(dt: number): void;
  liberar(): void;
}

/** Compone el mapa 3D: terreno, agua, relieve y vegetación. No toca la lógica del juego, solo la lee. */
export function crearMundo(mapa: Mapa, cfg: ConfigRender): Mundo {
  const disp = crearDisposicion(mapa, cfg);
  const paleta = new Paleta(cfg);
  const terreno = crearTerreno(mapa, disp, cfg, paleta);
  const agua = crearAgua(mapa, disp, cfg, paleta);
  const relieve = crearRelieve(mapa, disp, cfg, paleta, terreno);
  const vegetacion = crearVegetacion(mapa, disp, cfg, paleta);

  const raiz = new THREE.Group();
  raiz.add(terreno.malla, agua.raiz, relieve.raiz, vegetacion.raiz);

  return {
    raiz,
    caja: disp.caja,
    ejemplaresVegetacion: vegetacion.total,
    actualizar: (dt) => agua.actualizar(dt),
    liberar() {
      terreno.liberar();
      agua.liberar();
      relieve.liberar();
      vegetacion.liberar();
    },
  };
}
