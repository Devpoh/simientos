import * as THREE from 'three';
import type { Mapa } from '../logic/mapa';
import { crearAgua } from './agua';
import { crearDecorado } from './decorado';
import type { ConfigRender } from './config';
import { crearDisposicion, type Disposicion } from './disposicion';
import { Paleta } from './paleta';
import { crearRelieve } from './relieve';
import { crearTerreno } from './terreno';
import { crearVegetacion, type SueloEn } from './vegetacion';

export interface Mundo {
  readonly raiz: THREE.Group;
  /** Caja que contiene todo el mapa: la cámara encuadra con ella. */
  readonly caja: THREE.Box3;
  readonly ejemplaresVegetacion: number;
  /** Altura del suelo en un punto (tapa del prisma o ladera): para apoyar edificios y personas. */
  readonly sueloEn: SueloEn;
  /** Posición y altura de cada hexágono en el mundo: lo usan la selección y, más adelante, edificios y unidades. */
  readonly disposicion: Disposicion;
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
  const vegetacion = crearVegetacion(mapa, disp, cfg, paleta, relieve.sueloEn);
  // Modelos CC0 que cargan en segundo plano: aparecen cuando llegan, sin retrasar el primer frame.
  const decorado = crearDecorado(mapa, disp, cfg, relieve.sueloEn, agua.charcas);

  const raiz = new THREE.Group();
  raiz.add(terreno.malla, agua.raiz, relieve.raiz, vegetacion.raiz, decorado.raiz);

  return {
    raiz,
    caja: disp.caja,
    ejemplaresVegetacion: vegetacion.total,
    sueloEn: relieve.sueloEn,
    disposicion: disp,
    actualizar: (dt) => {
      agua.actualizar(dt);
      decorado.actualizar(dt);
    },
    liberar() {
      terreno.liberar();
      agua.liberar();
      relieve.liberar();
      vegetacion.liberar();
      decorado.liberar();
    },
  };
}
