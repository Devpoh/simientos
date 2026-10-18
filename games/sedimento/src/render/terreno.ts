import * as THREE from 'three';
import { crearRng, derivarSemilla } from '../logic/azar';
import type { Mapa } from '../logic/mapa';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';
import { pieza } from './geometria';
import type { Paleta } from './paleta';

/**
 * Prisma hexagonal de altura 1 con la base en y=0. Los colores de vértice son un multiplicador
 * del color de instancia: la tapa conserva el color del bioma (con un borde algo más oscuro que
 * dibuja la rejilla) y el lateral se oscurece hacia abajo en tono tierra.
 */
function crearPrisma(cfg: ConfigRender, paleta: Paleta): THREE.BufferGeometry {
  const R = cfg.tamanoHex;
  const base = new THREE.CylinderGeometry(R, R, 1, 6).translate(0, 0.5, 0);
  const g = pieza(base, '#ffffff');
  const pos = g.attributes.position;
  const normal = g.attributes.normal;
  const col = g.attributes.color;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = normal.getY(i);
    if (ny > 0.5) {
      const radio = Math.hypot(pos.getX(i), pos.getZ(i)) / R;
      c.setScalar(radio < 0.01 ? 1 : cfg.vineteTapa);
    } else if (ny < -0.5) {
      c.copy(paleta.ladoInferior);
    } else {
      c.lerpColors(paleta.ladoInferior, paleta.ladoSuperior, pos.getY(i));
    }
    col.setXYZ(i, c.r, c.g, c.b);
  }
  return g;
}

export interface Terreno {
  readonly malla: THREE.InstancedMesh;
  readonly colores: THREE.Color[];
  liberar(): void;
}

/** Un prisma por hexágono (tierra y lecho de agua) en un solo InstancedMesh: una llamada de dibujo. */
export function crearTerreno(mapa: Mapa, disp: Disposicion, cfg: ConfigRender, paleta: Paleta): Terreno {
  const n = disp.rejilla.total;
  const geometria = crearPrisma(cfg, paleta);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });
  const malla = new THREE.InstancedMesh(geometria, material, n);
  malla.castShadow = true;
  malla.receiveShadow = true;

  const rng = crearRng(derivarSemilla(mapa.semilla, 'render-color'));
  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  const sinGiro = new THREE.Quaternion();
  const color = new THREE.Color();
  const colores: THREE.Color[] = [];

  for (let i = 0; i < n; i++) {
    posicion.set(disp.x[i], 0, disp.z[i]);
    escala.set(1, disp.cima[i], 1);
    malla.setMatrixAt(i, matriz.compose(posicion, sinGiro, escala));
    paleta.colorTapa(mapa, i, (rng() - 0.5) * 2 * cfg.variacionColor, color);
    // Tono y saturación también varían por hexágono: así el desierto no es una mancha plana.
    color.offsetHSL((rng() - 0.5) * 2 * cfg.variacionTono, (rng() - 0.5) * 2 * cfg.variacionTono * 2, 0);
    malla.setColorAt(i, color);
    colores.push(color.clone());
  }
  malla.instanceMatrix.needsUpdate = true;
  if (malla.instanceColor) malla.instanceColor.needsUpdate = true;

  return {
    malla,
    colores,
    liberar() {
      geometria.dispose();
      material.dispose();
      malla.dispose();
    },
  };
}
