import * as THREE from 'three';
import type { ConfigRender } from '../config';
import { crearEntrada } from './entrada';
import { crearOclusion, type FuenteOclusion } from './oclusion';
import { cargarPreferencias, guardarPreferencias, type PreferenciasCamara } from './preferencias';
import { RigCamara, type AlturaEn, type EstadoCamara } from './rig';

export type { AlturaEn, EstadoCamara } from './rig';
export type { AccionTecla, PreferenciasCamara } from './preferencias';
export type { FuenteOclusion } from './oclusion';

export interface OpcionesCamara {
  /** Devuelve true mientras hay una herramienta activa (p. ej. colocar un edificio): el botón izquierdo deja de mover la cámara. */
  hayHerramienta?: () => boolean;
  /** Altura del terreno continuo; sin ella la cámara trabaja sobre un suelo plano a y = 0. */
  alturaEn?: AlturaEn;
}

export interface ControlCamara {
  readonly camara: THREE.PerspectiveCamera;
  actualizar(dt: number): void;
  redimensionar(ancho: number, alto: number): void;
  estado(): EstadoCamara;
  /** Mueve el punto de mira (con suavizado) al punto (x, z) del mundo. */
  irA(x: number, z: number): void;
  /** Distancia del punto de mira a la cámara, para colocar la niebla. */
  readonly distancia: number;
  /** Preferencias del jugador (se guardan en el navegador): cámbialas y llama a `guardarPreferencias`. */
  readonly preferencias: PreferenciasCamara;
  guardarPreferencias(): void;
  fijarAlturaEn(fn: AlturaEn | null): void;
  /** Los edificios que se atenúan cuando tapan el objetivo (null para quitarlos). */
  fijarOclusores(fuente: FuenteOclusion | null): void;
  /** Cambia la consulta «¿hay una herramienta activa?» (la herramienta de construcción se crea después de la cámara). */
  fijarHerramienta(fn: () => boolean): void;
  liberar(): void;
}

/**
 * Cámara de estrategia libre, dividida en módulos:
 *  · `rig`: estado (objetivo, distancia, giro, inclinación), suavizado, límites y colocación.
 *  · `entrada`: ratón, teclado y bordes de pantalla → órdenes al rig.
 *  · `preferencias`: sensibilidades, inversiones y teclas del jugador, guardadas en localStorage.
 * La lógica pura (movimiento relativo, velocidad por zoom…) está en `logic/camara.ts` y tiene tests.
 */
export function crearControlCamara(dom: HTMLElement, cfg: ConfigRender, caja: THREE.Box3, opciones: OpcionesCamara = {}): ControlCamara {
  const preferencias = cargarPreferencias(cfg.camara);
  const rig = new RigCamara(cfg, caja, preferencias);
  if (opciones.alturaEn) rig.fijarAlturaEn(opciones.alturaEn);
  const oclusion = crearOclusion(cfg);
  const objetivo = new THREE.Vector3();
  let hayHerramienta = opciones.hayHerramienta ?? (() => false);
  const entrada = crearEntrada(dom, rig, cfg, preferencias, { hayHerramienta: () => hayHerramienta() });

  return {
    camara: rig.camara,
    get distancia() {
      return rig.distanciaVista;
    },
    preferencias,
    guardarPreferencias: () => guardarPreferencias(preferencias),
    fijarAlturaEn: (fn) => rig.fijarAlturaEn(fn),
    fijarOclusores: (fuente) => oclusion.fijarFuente(fuente),
    fijarHerramienta: (fn) => {
      hayHerramienta = fn;
    },
    actualizar: (dt) => {
      entrada.actualizar(dt);
      objetivo.set(rig.act.x, rig.act.y, rig.act.z);
      oclusion.actualizar(dt, rig.camara.position, objetivo);
    },
    redimensionar: (ancho, alto) => rig.redimensionar(ancho, alto),
    irA: (x, z) => rig.irA(x, z),
    estado: () => rig.estado(entrada.modo, entrada.bordesActivos, oclusion.atenuados),
    liberar: () => entrada.liberar(),
  };
}
