import * as THREE from 'three';
import type { ConfigSim, TipoEdificio, Ubicacion } from '../logic/sim/tipos';
import type { ConfigRender } from './config';

type AlturaEn = (x: number, z: number) => number;

export interface Fantasma {
  readonly raiz: THREE.Group;
  /** Muestra el volumen transparente del edificio (verde si cabe, rojo si no) con su huella pegada al terreno. */
  mostrar(tipo: TipoEdificio, u: Ubicacion, valido: boolean): void;
  ocultar(): void;
  liberar(): void;
}

/**
 * Vista previa de la construcción (R21): un volumen translúcido del tamaño de la huella y un contorno
 * que sigue el relieve, para que se vea también dónde la ladera no deja construir.
 */
export function crearFantasma(cfgSim: ConfigSim, cfg: ConfigRender, alturaEn: AlturaEn): Fantasma {
  const c = cfg.construccion;
  const colorValido = new THREE.Color(c.colorValido);
  const colorInvalido = new THREE.Color(c.colorInvalido);
  const caja = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const matCaja = new THREE.MeshBasicMaterial({ color: colorValido, transparent: true, opacity: c.opacidad, depthWrite: false });
  const volumen = new THREE.Mesh(caja, matCaja);
  volumen.renderOrder = 5;

  const n = c.muestrasLado * 4;
  const posiciones = new Float32Array(n * 3);
  const geoBorde = new THREE.BufferGeometry();
  geoBorde.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  const matBorde = new THREE.LineBasicMaterial({ color: colorValido, transparent: true, opacity: 0.95, depthTest: false });
  const borde = new THREE.LineLoop(geoBorde, matBorde);
  borde.renderOrder = 6;
  borde.frustumCulled = false;

  const raiz = new THREE.Group();
  raiz.add(volumen, borde);
  raiz.visible = false;

  return {
    raiz,
    mostrar(tipo, u, valido) {
      const h = cfgSim.edificios[tipo].huella;
      const color = valido ? colorValido : colorInvalido;
      matCaja.color.copy(color);
      matBorde.color.copy(color);
      // Contorno de la huella muestreado sobre el terreno, lado a lado.
      const cos = Math.cos(u.giro);
      const sin = Math.sin(u.giro);
      const esquinas: [number, number][] = [
        [-h.ancho / 2, -h.fondo / 2],
        [h.ancho / 2, -h.fondo / 2],
        [h.ancho / 2, h.fondo / 2],
        [-h.ancho / 2, h.fondo / 2],
      ];
      let k = 0;
      let suelo = Infinity;
      for (let lado = 0; lado < 4; lado++) {
        const [ax, az] = esquinas[lado];
        const [bx, bz] = esquinas[(lado + 1) % 4];
        for (let s = 0; s < c.muestrasLado; s++) {
          const t = s / c.muestrasLado;
          const lx = ax + (bx - ax) * t;
          const lz = az + (bz - az) * t;
          const x = u.x + lx * cos + lz * sin;
          const z = u.z - lx * sin + lz * cos;
          const y = alturaEn(x, z);
          suelo = Math.min(suelo, y);
          posiciones[k++] = x;
          posiciones[k++] = y + c.alzaContorno;
          posiciones[k++] = z;
        }
      }
      geoBorde.attributes.position.needsUpdate = true;
      geoBorde.computeBoundingSphere();
      // El volumen arranca en el punto más bajo de la huella: así se ve cuánto habría que nivelar.
      const alto = c.altoBase + c.altoPorTamano * Math.max(h.ancho, h.fondo);
      volumen.position.set(u.x, suelo, u.z);
      volumen.rotation.y = u.giro;
      volumen.scale.set(h.ancho, alto, h.fondo);
      raiz.visible = true;
    },
    ocultar() {
      raiz.visible = false;
    },
    liberar() {
      caja.dispose();
      matCaja.dispose();
      geoBorde.dispose();
      matBorde.dispose();
    },
  };
}
