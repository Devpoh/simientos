import * as THREE from 'three';
import type { ConfigSim, Obra } from '../logic/sim/tipos';
import type { ConfigRender } from './config';

type AlturaEn = (x: number, z: number) => number;

export interface ObrasRender {
  readonly raiz: THREE.Group;
  /** Reconstruye la vista si cambió la lista de obras (A6b: replanteo con estacas y cuerda; las etapas visibles llegan en A6d). */
  sincronizar(obras: readonly Obra[]): void;
  liberar(): void;
}

/**
 * Obras en el terreno. Por ahora, el «plano» de cada una (R22): cuerda tensada sobre la huella,
 * siguiendo el relieve, y una estaca en cada esquina.
 */
export function crearObras(cfgSim: ConfigSim, cfg: ConfigRender, alturaEn: AlturaEn): ObrasRender {
  const c = cfg.construccion;
  const raiz = new THREE.Group();
  const matCuerda = new THREE.LineBasicMaterial({ color: new THREE.Color(c.colorPlano) });
  const geoEstaca = new THREE.CylinderGeometry(c.radioEstaca, c.radioEstaca, c.altoEstaca, 5).translate(0, c.altoEstaca / 2, 0);
  const matEstaca = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.colorEstaca), roughness: 0.9 });
  let firma = '';
  const geometrias: THREE.BufferGeometry[] = [];

  const limpiar = () => {
    for (const g of geometrias) g.dispose();
    geometrias.length = 0;
    raiz.clear();
  };

  return {
    raiz,
    sincronizar(obras) {
      const nueva = obras.map((o) => `${o.id}:${o.etapa}`).join(',');
      if (nueva === firma) return;
      firma = nueva;
      limpiar();
      for (const o of obras) {
        const h = cfgSim.edificios[o.tipo].huella;
        const cos = Math.cos(o.giro);
        const sin = Math.sin(o.giro);
        const esquinas: [number, number][] = [
          [-h.ancho / 2, -h.fondo / 2],
          [h.ancho / 2, -h.fondo / 2],
          [h.ancho / 2, h.fondo / 2],
          [-h.ancho / 2, h.fondo / 2],
        ];
        const puntos: number[] = [];
        for (let lado = 0; lado < 4; lado++) {
          const [ax, az] = esquinas[lado];
          const [bx, bz] = esquinas[(lado + 1) % 4];
          for (let s = 0; s < c.muestrasLado; s++) {
            const t = s / c.muestrasLado;
            const lx = ax + (bx - ax) * t;
            const lz = az + (bz - az) * t;
            const x = o.x + lx * cos + lz * sin;
            const z = o.z - lx * sin + lz * cos;
            puntos.push(x, alturaEn(x, z) + c.alzaCuerda, z);
          }
          const x = o.x + ax * cos + az * sin;
          const z = o.z - ax * sin + az * cos;
          const estaca = new THREE.Mesh(geoEstaca, matEstaca);
          estaca.position.set(x, alturaEn(x, z), z);
          estaca.castShadow = true;
          raiz.add(estaca);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(puntos, 3));
        geometrias.push(geo);
        raiz.add(new THREE.LineLoop(geo, matCuerda));
      }
    },
    liberar() {
      limpiar();
      matCuerda.dispose();
      geoEstaca.dispose();
      matEstaca.dispose();
    },
  };
}
