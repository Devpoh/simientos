import * as THREE from 'three';
import { crearCampoAlturas, type CampoAlturas, type ConfigAlturas } from '../logic/alturas';
import type { Mapa } from '../logic/mapa';
import { crearAgua } from './agua';
import { crearDecorado } from './decorado';
import type { ConfigRender } from './config';
import { crearDisposicion, type Disposicion } from './disposicion';
import { Paleta } from './paleta';
import { crearTerrenoContinuo } from './terrenoContinuo';
import { cargarTexturasTerreno, type TexturasTerreno } from './texturasTerreno';
import { crearVegetacion, type SueloEn } from './vegetacion';

export interface Mundo {
  readonly raiz: THREE.Group;
  /** Caja que contiene todo el mapa: la cámara encuadra con ella. */
  readonly caja: THREE.Box3;
  readonly ejemplaresVegetacion: number;
  readonly verticesTerreno: number;
  /** true cuando ya llegaron las texturas PBR del terreno. */
  readonly terrenoConTexturas: boolean;
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
  // Texturas PBR (G1) en segundo plano: el primer frame sale ya con el color por vértice.
  let texturas: TexturasTerreno | null = null;
  let liberado = false;
  const base = import.meta.env.BASE_URL + cfg.texturas.terreno;
  cargarTexturasTerreno(base, cfg.texturas.ladoDifusa, cfg.texturas.ladoNormal)
    .then((t) => {
      if (liberado) return t.liberar();
      texturas = t;
      terreno.aplicarTexturas(t);
    })
    .catch((e: unknown) => console.warn('Texturas del terreno no disponibles; se usa el color por vértice.', e));

  return {
    raiz,
    caja: disp.caja,
    ejemplaresVegetacion: vegetacion.total,
    verticesTerreno: terreno.vertices,
    get terrenoConTexturas() {
      return terreno.conTexturas;
    },
    campo,
    sueloEn,
    disposicion: disp,
    actualizar: (dt) => {
      agua.actualizar(dt);
      decorado.actualizar(dt);
    },
    liberar() {
      liberado = true;
      texturas?.liberar();
      terreno.liberar();
      agua.liberar();
      vegetacion.liberar();
      decorado.liberar();
    },
  };
}
