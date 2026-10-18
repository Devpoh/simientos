import * as THREE from 'three';
import { mundoAAxial } from '../logic/hex';
import type { ConfigRender } from './config';
import type { Disposicion } from './disposicion';

/** El resaltado queda apenas por encima de la tapa para no parpadear con ella. */
const ALZA_RESALTE = 0.04;
/** Por debajo de este tamaño de salto el rayo no tiene sentido: evita bucles infinitos si la config es 0. */
const PASO_MINIMO = 0.01;

export interface Seleccion {
  /** Índice del hexágono bajo el ratón, o -1 si el ratón no está sobre el mapa. */
  readonly hex: number;
  readonly raiz: THREE.Group;
  /** Coloca el cursor (px relativos al elemento) y calcula el hexágono. Usa `null` si el ratón salió. */
  apuntar(px: number | null, py: number, camara: THREE.Camera, ancho: number, alto: number): void;
  liberar(): void;
}

/** Hexágono bajo el ratón: se avanza por el rayo hasta que baja de la altura del suelo de la celda que pisa. */
export function crearSeleccion(disp: Disposicion, cfg: ConfigRender): Seleccion {
  const R = cfg.tamanoHex;
  const s = cfg.seleccion;
  const color = new THREE.Color(s.color);

  const relleno = new THREE.CircleGeometry(R, 6, Math.PI / 2).rotateX(-Math.PI / 2);
  const borde = new THREE.RingGeometry(R * (1 - s.grosorBorde), R, 6, 1, Math.PI / 2).rotateX(-Math.PI / 2);
  // Se dibuja encima de todo (sin test de profundidad): así se ve también tras picos o árboles.
  const matRelleno = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: s.opacidadRelleno, depthTest: false, depthWrite: false, fog: false });
  const matBorde = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: s.opacidadBorde, depthTest: false, depthWrite: false, fog: false });
  const mallaRelleno = new THREE.Mesh(relleno, matRelleno);
  const mallaBorde = new THREE.Mesh(borde, matBorde);
  mallaRelleno.renderOrder = 10;
  mallaBorde.renderOrder = 11;
  const raiz = new THREE.Group();
  raiz.add(mallaRelleno, mallaBorde);
  raiz.visible = false;

  const rayo = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const techo = disp.caja.max.y;
  const paso = Math.max(PASO_MINIMO, s.pasoRayo);
  const p = new THREE.Vector3();
  let hex = -1;

  const buscar = (): number => {
    const { origin, direction } = rayo.ray;
    if (direction.y >= 0) return -1;
    // Solo hay que recorrer el rayo entre el techo del mapa y el suelo.
    const t0 = Math.max(0, (techo - origin.y) / direction.y);
    const t1 = (0 - origin.y) / direction.y;
    for (let t = t0; t <= t1; t += paso) {
      p.copy(direction).multiplyScalar(t).add(origin);
      const { q, r } = mundoAAxial(p.x, p.z, R);
      const i = disp.rejilla.indiceAxial(q, r);
      if (i === -1) continue;
      if (p.y <= disp.alturaSeleccion[i]) return i;
    }
    return -1;
  };

  return {
    get hex() {
      return hex;
    },
    raiz,
    apuntar(px, py, camara, ancho, alto) {
      if (px === null) {
        hex = -1;
      } else {
        ndc.set((px / ancho) * 2 - 1, -(py / alto) * 2 + 1);
        rayo.setFromCamera(ndc, camara);
        hex = buscar();
      }
      raiz.visible = hex !== -1;
      if (hex !== -1) {
        const y = (Number.isNaN(disp.aguaY[hex]) ? disp.cima[hex] : Math.max(disp.cima[hex], disp.aguaY[hex])) + ALZA_RESALTE;
        raiz.position.set(disp.x[hex], y, disp.z[hex]);
      }
    },
    liberar() {
      relleno.dispose();
      borde.dispose();
      matRelleno.dispose();
      matBorde.dispose();
    },
  };
}
